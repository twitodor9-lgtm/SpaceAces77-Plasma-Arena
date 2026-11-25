import Phaser from "phaser";
import { paintAssets } from "../assets/draw";
import { burst } from "../assets/juice";
import { aimVector } from "../core/aim";
import { readBest, writeBest } from "../core/best";
import { fitSpawn, avoidsPlatforms } from "../core/spawnPlacement";
import { RunTelemetry } from "../core/telemetry";
import { emitMission } from "../core/mission";
import type { ControlsProbe } from "../core/probe";
import { addScore, applyHit, commitCounts, createRun, startWave, type RunState } from "../core/runState";
import type { ArenaDef, Content, WeaponDef } from "../core/types";
import { createHazardSystem, type HazardSystem } from "../hazards/stageHazards";
import { createPlasmaSystem, type Plasma, type PlasmaSystem } from "../hazards/plasmas";
import { createShotSystem, type ShotSystem } from "../weapons/shots";
import { session } from "./session";

export class GameScene extends Phaser.Scene {
  private content!: Content;
  private arena!: ArenaDef;
  private run!: RunState;
  private energyOn = false;
  private energy = 100;
  private weaponIndex = 0;
  private weapons: WeaponDef[] = [];
  private iframeUntil = 0;
  private jumpBufferUntil = 0;
  private groundedUntil = 0;
  private deniedUntil = 0;
  private telemetry!: RunTelemetry;
  private ended = false;
  private best = 0;
  private pointCursor = 0;
  private densityTold = false;
  private banner = "";
  private plasmas!: PlasmaSystem;
  private shots!: ShotSystem;
  private hazards!: HazardSystem;
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private bannerText!: Phaser.GameObjects.Text;
  private aimGuide!: Phaser.GameObjects.Graphics;
  private boxes?: Phaser.GameObjects.Graphics;
  private onVis = () => {};

  constructor() {
    super("game");
  }

  init(data?: { arenaId?: string; energy?: boolean }): void {
    const content = session.content;
    if (!content) throw new Error("[PlasmaArena] התוכן לא נטען לפני הזירה");
    this.content = content;
    const id = data?.arenaId || content.balance.defaultArenaId;
    const arena = content.arenaById.get(id);
    if (!arena) throw new Error(`[PlasmaArena] זירה חסרה: "${id}"`);
    this.arena = arena;
    this.energyOn = !!data?.energy;
    this.energy = content.balance.energy.max;
    this.weaponIndex = 0;
    this.iframeUntil = 0;
    this.jumpBufferUntil = 0;
    this.groundedUntil = 0;
    this.deniedUntil = 0;
    this.ended = false;
    this.best = readBest();
    this.pointCursor = 0;
    this.densityTold = false;
    this.banner = "";
    this.run = createRun(arena.id, arena.waves.length, content.balance.player.hull);
    this.weapons = content.balance.weaponsOrder.map((weaponId) => {
      const weapon = content.weaponById.get(weaponId);
      if (!weapon) throw new Error(`[PlasmaArena] נשק חסר: "${weaponId}"`);
      return weapon;
    });
  }

  create(): void {
    const { width, height } = this.arena;
    this.telemetry = new RunTelemetry(this.arena.id, performance.now());
    paintAssets(this, this.content.assets);
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.drawRoom(width, height);

    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.arena.platforms) {
      const slab = this.physics.add.staticSprite(
        platform.x + platform.w / 2,
        platform.y + platform.h / 2,
        "platform",
      );
      slab.setDisplaySize(platform.w, platform.h);
      slab.refreshBody();
      slab.setDepth(1);
      this.platforms.add(slab);
    }

    const playerCfg = this.content.balance.player;
    const feet = Math.min(this.arena.playerSpawn.y, height - 2);
    this.player = this.physics.add.sprite(
      this.arena.playerSpawn.x,
      feet - playerCfg.height / 2,
      "player_ace",
    );
    this.player.setOrigin(0.5, 0.5).setDepth(4);
    this.player.setDisplaySize(playerCfg.width, playerCfg.height);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(0, 0);
    body.setGravityY(playerCfg.gravity);
    body.setSize(this.player.width * 0.62, this.player.height * 0.88, true);
    body.setMaxVelocity(playerCfg.speed, 980);

    this.plasmas = createPlasmaSystem(this, this.content, {
      now: () => this.time.now,
      canHurt: () => !this.ended && this.time.now >= this.iframeUntil,
      onPlayerHit: (damage) => this.hurtPlayer(damage, "plasma"),
      onPop: (plasma, x, y, children) => this.onPop(plasma, x, y, children),
      onSpawn: (id, x, y, generation) => this.telemetry.record("spawn", this.time.now, { id, x, y, generation }),
      onDensity: () => this.onDensity(),
    });
    this.shots = createShotSystem(this, this.content, {
      onShot: (weapon) => {
        session.sfx?.shoot();
        this.telemetry.record("shot", this.time.now, { id: weapon.id });
      },
      onDry: () => {
        this.deniedUntil = this.time.now + 220;
        session.sfx?.dry();
      },
      onNet: () => {
        session.sfx?.net();
        this.telemetry.record("net", this.time.now);
      },
    });
    this.hazards = createHazardSystem(this, this.content, this.arena, (id, phase) =>
      this.telemetry.record("hazard", this.time.now, { id, phase }),
    );

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.plasmas.group, this.platforms);
    this.physics.add.overlap(this.player, this.plasmas.group, (_player, candidate) => {
      const orb = candidate as Phaser.Physics.Arcade.Sprite;
      this.plasmas.touchPlayer(orb);
    });
    this.physics.add.overlap(this.shots.group, this.plasmas.group, (projectile, target) => {
      const shotObj = projectile as Phaser.Physics.Arcade.Sprite;
      const orb = target as Phaser.Physics.Arcade.Sprite;
      if (this.ended) return;
      const shot = shotObj.getData("shot") as { alive: boolean; damage: number; hits: Set<unknown> } | undefined;
      if (!shot?.alive || shot.hits.has(orb)) return;
      if (shot.damage > 0) this.plasmas.hurt(orb, shot.damage);
      this.shots.onHit(shotObj, orb, this.time.now);
    });

    this.bannerText = this.add
      .text(width / 2, 86, "", {
        fontFamily: "DejaVu Sans, FreeSans, Arial, sans-serif",
        fontSize: "26px",
        color: "#E7F2FF",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setAlpha(0);

    this.aimGuide = this.add.graphics().setDepth(4);
    if (new URLSearchParams(location.search).has("boxes")) {
      this.boxes = this.add.graphics().setDepth(9);
    }
    session.controls?.clear();
    this.installProbe();
    if (session.bridge) session.bridge.cycle = (dir) => this.cycleWeapon(dir);
    this.onVis = () => {
      if (document.hidden) this.scene.pause();
      else this.scene.resume();
    };
    document.addEventListener("visibilitychange", this.onVis);
    this.events.once("shutdown", () => {
      document.removeEventListener("visibilitychange", this.onVis);
      session.controls?.clear();
      if (session.bridge) session.bridge.cycle = null;
      if (window.__controlsTest) delete window.__controlsTest;
    });

    session.bridge?.setPlaying(true);
    this.time.delayedCall(250, () => {
      if (this.run.phase === "boot") this.beginWave();
    });
    this.emitHud();
  }

  update(time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta, 50) / 1000;
    this.plasmas.flush();
    this.syncAlive();
    if (this.ended) return;
    this.stepPlayer(time);
    this.stepWeapons(time);
    this.shots.update(dt, time);
    this.plasmas.update(dt, time);
    this.hazards.update(dt);
    this.plasmas.applyZones(this.shots.zones);
    this.touchHazards();
    if (this.ended) return;
    const rects = [
      ...this.hazards.hotRects(),
      ...this.arena.platforms.map((platform) => ({
        x: platform.x,
        y: platform.y,
        w: platform.w,
        h: platform.h,
      })),
    ];
    this.shots.blockIfHot(rects, time);
    if (this.energyOn && this.run.phase === "fighting") {
      this.energy = Math.min(
        this.content.balance.energy.max,
        this.energy + this.content.balance.energy.regenPerSec * dt,
      );
    }
    this.drawBoxes();
    this.emitHud();
    session.controls?.endFrame();
  }

  private beginWave(): void {
    this.run = startWave(this.run);
    this.densityTold = false;
    const wave = this.arena.waves[this.run.waveIndex];
    if (!wave) return;
    this.telemetry.record("wave", this.time.now, { wave: this.run.waveIndex + 1 });
    this.showBanner(wave.banner);
    session.sfx?.wave();
    const stagger = this.content.balance.spawn.staggerMs;
    let cursor = 280;
    const queue = (id: string, count: number, at: number) => {
      for (let i = 0; i < count; i++) this.queueSpawn(id, wave.speedScale, at + i * stagger);
    };
    for (const spawn of wave.spawns) {
      queue(spawn.id, spawn.count, cursor);
      cursor += spawn.count * stagger + 160;
    }
    for (const event of wave.events) {
      for (const spawn of event.spawns) queue(spawn.id, spawn.count, event.delayMs);
    }
  }

  private queueSpawn(id: string, speedScale: number, delay: number): void {
    this.run = { ...this.run, pending: this.run.pending + 1 };
    const { width, height, platforms, spawnPoints } = this.arena;
    const entity = this.content.entityById.get(id)!;
    const { telegraphMs, safeRadius } = this.content.balance.spawn;
    const radius = entity.radius;
    const safe = ({ x, y }: { x: number; y: number }) =>
      Math.hypot(x - this.player.x, y - this.player.y) >= safeRadius + radius;
    const warnAndSpawn = () => {
      if (this.ended) return;
      const preferred = this.pickPoint();
      const candidates = [preferred, ...spawnPoints,
        ...[0.15, 0.5, 0.85].flatMap((y) => [0.1, 0.5, 0.9].map((x) => ({ x: width * x, y: height * y }))),
      ];
      const point = candidates
        .map((candidate) => fitSpawn(candidate, radius, width, height))
        .find((candidate) => safe(candidate) && avoidsPlatforms(candidate, radius, platforms));
      if (!point) {
        this.time.delayedCall(250, warnAndSpawn);
        return;
      }
      this.telemetry.record("telegraph", this.time.now, { id, ...point });
      const marker = this.add.circle(point.x, point.y, radius, 0xff5a36, 0.2).setDepth(2);
      marker.setStrokeStyle(2, 0xffc857);
      const warn = this.add
        .triangle(point.x, point.y - radius - 12, 0, 12, 9, -6, -9, -6, 0xffc857)
        .setDepth(2);
      this.time.delayedCall(telegraphMs, () => {
        marker.destroy();
        warn.destroy();
        if (this.ended) return;
        if (!safe(point) || !this.plasmas.spawn({
          id,
          ...point,
          speedScale,
          generation: 0,
          graceMs: this.content.balance.split.childGraceMs,
          now: this.time.now,
        })) {
          this.time.delayedCall(250, warnAndSpawn);
          return;
        }
        this.setCounts(this.plasmas.aliveCount(), this.run.pending - 1);
      });
    };
    this.time.delayedCall(delay, warnAndSpawn);
  }

  private syncAlive(): void {
    if (this.run.alive === this.plasmas.aliveCount()) return;
    this.setCounts(this.plasmas.aliveCount(), this.run.pending);
  }

  private setCounts(alive: number, pending: number): void {
    const res = commitCounts(this.run, alive, pending);
    this.run = res.run;
    if (res.event === "wave-clear") {
      this.showBanner(this.content.balance.strings.intermission);
      this.time.delayedCall(this.content.balance.intermissionMs, () => {
        if (this.run.phase !== "intermission") return;
        this.beginWave();
      });
    } else if (res.event === "win") {
      this.showBanner(this.content.balance.strings.winTitle);
      this.finish("win");
    }
  }

  private stepPlayer(now: number): void {
    const controls = session.controls;
    if (!controls) return;
    const cfg = this.content.balance.player;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (
      controls.pressed("KeyW") ||
      controls.pressed("ArrowUp") ||
      controls.pressed("Space")
    ) {
      this.jumpBufferUntil = now + cfg.jumpBufferMs;
    }
    if (body.blocked.down) this.groundedUntil = now + cfg.coyoteMs;
    if (now <= this.jumpBufferUntil && now <= this.groundedUntil) {
      body.setVelocityY(cfg.jumpVelocity);
      this.jumpBufferUntil = 0;
      this.groundedUntil = 0;
    }
    const left = controls.down("KeyA") || controls.down("ArrowLeft");
    const right = controls.down("KeyD") || controls.down("ArrowRight");
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    body.setVelocityX(dir * cfg.speed);
    if (dir < 0) this.player.setFlipX(true);
    else if (dir > 0) this.player.setFlipX(false);
    if (now < this.iframeUntil) {
      this.player.setAlpha(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now / 40)));
    } else this.player.setAlpha(1);

    const digits = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"];
    digits.forEach((code, index) => {
      if (controls.pressed(code) && index < this.weapons.length) this.weaponIndex = index;
    });
    if (controls.pressed("KeyQ")) this.cycleWeapon(-1);
    if (controls.pressed("KeyE")) this.cycleWeapon(1);
  }

  private stepWeapons(now: number): void {
    const controls = session.controls;
    if (!controls || this.ended) return;
    const weapon = this.weapons[this.weaponIndex];
    if (!weapon) return;
    const left = controls.down("KeyA") || controls.down("ArrowLeft");
    const right = controls.down("KeyD") || controls.down("ArrowRight");
    const dirX = (right ? 1 : 0) - (left ? 1 : 0);
    const x = this.player.x + dirX * 10;
    const y = this.player.y - this.player.displayHeight * 0.42;
    const vector = aimVector(dirX, this.content.balance.aim.influence);
    const asset = this.content.assetById.get(weapon.projectile.assetId);
    const color = Number.parseInt((asset?.accent ?? "#FFFFFF").slice(1), 16);
    this.aimGuide.clear().fillStyle(color, 0.75);
    for (const distance of [10, 18, 27]) {
      this.aimGuide.fillCircle(x + vector.x * distance, y + vector.y * distance, distance === 27 ? 2.5 : 1.5);
    }
    if (!controls.down("KeyJ") && !controls.down("KeyK") && !controls.pressed("KeyJ") && !controls.pressed("KeyK")) return;
    const result = this.shots.tryFire(
      weapon,
      x,
      y,
      dirX,
      now,
      this.energy,
      this.energyOn,
    );
    if (result.fired) {
      this.energy = Math.max(0, result.energy);
      this.aimGuide.fillStyle(color, 0.9).fillCircle(x, y, 7);
    }
    if (result.denied) this.deniedUntil = now + 220;
  }

  private cycleWeapon(dir: number): void {
    const count = this.weapons.length;
    if (count < 1) return;
    this.weaponIndex = (this.weaponIndex + dir + count) % count;
    this.float(this.player.x, this.player.y - 56, this.weapons[this.weaponIndex]?.label ?? "");
  }

  private hurtPlayer(damage: number, source: string): void {
    if (this.ended || this.time.now < this.iframeUntil) return;
    const hit = applyHit(this.run, damage);
    this.telemetry.record("hit", this.time.now, { damage, source, hull: hit.run.hull });
    this.run = hit.run;
    this.iframeUntil = this.time.now + this.content.balance.player.iFrameMs;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(Math.min(body.velocity.y, -260));
    this.cameras.main.shake(140, 0.011);
    burst(this, this.player.x, this.player.y - 10, "#FF5A36", 7);
    session.sfx?.hurt();
    if (hit.lost) this.finish("lose");
  }

  private touchHazards(): void {
    if (this.ended) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const hit = this.hazards.overlapPlayer(body.center.x, body.center.y, body.halfWidth, body.halfHeight);
    if (!hit || !hit.armed) return;
    if (this.time.now < this.iframeUntil) return;
    hit.armed = false;
    this.hurtPlayer(hit.def.damage, hit.def.id);
  }

  private onPop(plasma: Plasma, x: number, y: number, children: number): void {
    this.telemetry.record(children ? "split" : "pop", this.time.now, { id: plasma.def.id, children, x, y });
    this.run = addScore(this.run, plasma.score);
    const asset = this.content.assetById.get(plasma.def.assetId);
    const big = plasma.radius >= 28;
    burst(this, x, y, asset?.color ?? "#FF3D8A", big ? 12 : children ? 9 : 7);
    this.float(x, y, children ? `+${plasma.score}  ×${children}` : `+${plasma.score}`);
    session.sfx?.pop(big);
    if (big) {
      this.cameras.main.shake(90, 0.006);
      this.physics.world.timeScale = 1.55;
      this.time.delayedCall(70, () => {
        if (this.scene.isActive()) this.physics.world.timeScale = 1;
      });
    } else if (children) {
      this.cameras.main.shake(40, 0.003);
    }
  }

  private onDensity(): void {
    if (this.densityTold) return;
    this.densityTold = true;
    this.float(this.arena.width / 2, 130, this.content.balance.strings.density);
  }

  private finish(kind: "win" | "lose"): void {
    if (this.ended) return;
    this.ended = true;
    this.physics.world.pause();
    this.aimGuide.clear();
    this.time.removeAllEvents();
    session.controls?.clear();
    this.telemetry.record("result", this.time.now, { kind, score: this.run.score, hull: this.run.hull });
    const best = writeBest(this.run.score);
    this.best = best;
    const strings = this.content.balance.strings;
    if (kind === "win") session.sfx?.win();
    else session.sfx?.lose();
    emitMission(kind === "win" ? "missionComplete" : "missionFailed", {
      arenaId: this.arena.id,
      score: this.run.score,
      waves: this.arena.waves.length,
    });
    session.bridge?.result({
      kind,
      title: kind === "win" ? strings.winTitle : strings.loseTitle,
      body: kind === "win" ? strings.winBody : strings.loseBody,
      score: this.run.score,
      best,
      strings,
    });
    this.emitHud();
  }

  private showBanner(text: string): void {
    this.banner = text;
    this.bannerText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.bannerText);
    this.tweens.add({
      targets: this.bannerText,
      alpha: 0,
      delay: 900,
      duration: 500,
    });
  }

  private float(x: number, y: number, text: string): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: "DejaVu Sans, FreeSans, Arial, sans-serif",
        fontSize: "16px",
        color: "#D6FF4A",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.tweens.add({
      targets: label,
      y: y - 26,
      alpha: 0,
      duration: 520,
      onComplete: () => label.destroy(),
    });
  }

  private pickPoint(): { x: number; y: number } {
    const points = this.arena.spawnPoints;
    const index = this.pointCursor % points.length;
    this.pointCursor += 1;
    return points[index] ?? { x: this.arena.width / 2, y: 90 };
  }

  private emitHud(): void {
    if (!session.bridge) return;
    const weapon = this.weapons[this.weaponIndex];
    session.bridge.hud({
      score: this.run.score,
      best: Math.max(this.best, this.run.score),
      hull: this.run.hull,
      maxHull: this.run.maxHull,
      wave: this.run.waveIndex + 1,
      waveCount: this.run.waveCount,
      weaponLabel: weapon?.label ?? "",
      weaponHint: weapon?.hint ?? "",
      energy: this.energy,
      energyMax: this.content.balance.energy.max,
      energyOn: this.energyOn,
      denied: this.time.now < this.deniedUntil,
      banner: this.banner,
      strings: this.content.balance.strings,
    });
  }

  private drawRoom(width: number, height: number): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x070910, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x121a2c, 1);
    g.fillRect(0, height - 26, width, 26);
    g.fillStyle(0x1c3148, 1);
    for (let x = 20; x < width; x += 28) {
      for (let y = 20; y < height - 36; y += 28) g.fillCircle(x, y, 1);
    }
    g.fillStyle(0xff3d8a, 0.07);
    g.fillCircle(width / 2, 64, 78);
    g.lineStyle(2, 0x3cf0e0, 0.35);
    g.strokeCircle(width / 2, 64, 40);
    g.lineStyle(2, 0xff5a36, 0.45);
    g.lineBetween(18, height - 2, width - 18, height - 2);
  }

  private drawBoxes(): void {
    if (!this.boxes) return;
    this.boxes.clear();
    this.boxes.lineStyle(1, 0x3cf0e0, 0.8);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.boxes.strokeRect(body.left, body.top, body.width, body.height);
    for (const child of this.plasmas.group.getChildren()) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      const orb = sprite.body as Phaser.Physics.Arcade.Body | null;
      if (!sprite.active || !orb) continue;
      this.boxes.strokeCircle(orb.center.x, orb.center.y, orb.halfWidth);
    }
  }

  private installProbe(): void {
    const qa = import.meta.env.DEV || new URLSearchParams(location.search).has("qa");
    if (!qa) return;
    const probe: ControlsProbe = {
      getX: () => this.player.x,
      getY: () => this.player.y,
      getSpeed: () => Math.abs((this.player.body as Phaser.Physics.Arcade.Body).velocity.x),
      getYaw: () => 0,
      setKeys: (codes) => session.controls?.setKeys(codes),
      setSteer: () => {},
      getPhase: () => this.run.phase,
      getHull: () => this.run.hull,
      getWave: () => this.run.waveIndex,
      getAlive: () => this.run.alive,
      getScore: () => this.run.score,
      exportTelemetry: () => this.telemetry.json(),
      getTargets: () => this.plasmas.group.getChildren().map((child) => {
        const plasma = child.getData("plasma") as Plasma;
        const body = plasma.sprite.body as Phaser.Physics.Arcade.Body;
        return { x: plasma.sprite.x, y: plasma.sprite.y, vx: body.velocity.x, vy: body.velocity.y, radius: plasma.radius };
      }),
      damagePlayer: (damage) => this.hurtPlayer(damage, "probe"),
      popTargets: () => {
        for (const child of this.plasmas.group.getChildren()) this.plasmas.hurt(child, 1000);
      },
    };
    window.__controlsTest = probe;
  }
}
