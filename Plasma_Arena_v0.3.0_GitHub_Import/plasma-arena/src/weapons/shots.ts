import Phaser from "phaser";
import { hexNum } from "../assets/draw";
import type { Content, ImpactDef, WeaponDef } from "../core/types";
import { aimVector } from "../core/aim";

type LiveShot = {
  sprite: Phaser.Physics.Arcade.Sprite;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  pierce: number;
  hits: Set<Phaser.GameObjects.GameObject>;
  impact: ImpactDef | null;
  alive: boolean;
};

export type SlowZone = { x: number; y: number; r: number; factor: number; until: number; gfx: Phaser.GameObjects.Graphics };

export type ShotSystem = {
  group: Phaser.Physics.Arcade.Group;
  zones: SlowZone[];
  tryFire: (weapon: WeaponDef, x: number, y: number, dirX: number, now: number, energy: number, energyOn: boolean) => {
    fired: boolean;
    energy: number;
    denied: boolean;
  };
  onHit: (shotSprite: Phaser.GameObjects.GameObject, target: Phaser.GameObjects.GameObject, now: number) => void;
  update: (dt: number, now: number) => void;
  blockIfHot: (hotRects: { x: number; y: number; w: number; h: number }[], now: number) => void;
};

export function createShotSystem(
  scene: Phaser.Scene,
  content: Content,
  hooks: { onShot: (weapon: WeaponDef) => void; onDry: () => void; onNet: () => void },
): ShotSystem {
  const group = scene.physics.add.group();
  const pool: LiveShot[] = [];
  const cooldowns = new Map<string, number>();
  const zones: SlowZone[] = [];

  for (let i = 0; i < content.balance.maxShots; i++) {
    const sprite = scene.physics.add.sprite(-200, -200, "lance");
    sprite.setActive(false).setVisible(false).setDepth(5);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setAllowGravity(false);
    group.add(sprite);
    pool.push({
      sprite,
      vx: 0,
      vy: 0,
      life: 0,
      damage: 0,
      pierce: 1,
      hits: new Set(),
      impact: null,
      alive: false,
    });
  }

  const kill = (shot: LiveShot) => {
    shot.alive = false;
    shot.hits.clear();
    shot.sprite.setActive(false).setVisible(false);
    const body = shot.sprite.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);
    shot.sprite.setPosition(-200, -200);
  };

  const detonate = (shot: LiveShot, now: number) => {
    if (shot.impact) {
      if (zones.length >= content.balance.maxZones) {
        const old = zones.shift();
        old?.gfx.destroy();
      }
      const gfx = scene.add.graphics().setDepth(2);
      zones.push({
        x: shot.sprite.x,
        y: shot.sprite.y,
        r: shot.impact.radius,
        factor: shot.impact.factor,
        until: now + shot.impact.durationMs,
        gfx,
      });
      hooks.onNet();
    }
    kill(shot);
  };

  return {
    group,
    zones,
    tryFire: (weapon, x, y, dirX, now, energy, energyOn) => {
      if (weapon.behavior !== "projectile") {
        throw new Error(`[PlasmaArena] התנהגות נשק לא מוכרת: "${weapon.behavior}"`);
      }
      const readyAt = cooldowns.get(weapon.id) ?? 0;
      if (now < readyAt) return { fired: false, energy, denied: false };
      if (energyOn && weapon.energyCost > energy) {
        hooks.onDry();
        return { fired: false, energy, denied: true };
      }
      const shot = pool.find((item) => !item.alive);
      if (!shot) return { fired: false, energy, denied: false };
      const aimMod = aimVector(dirX, content.balance.aim.influence);
      const speed = weapon.projectile.speed;
      shot.alive = true;
      shot.vx = aimMod.x * speed;
      shot.vy = aimMod.y * speed;
      shot.life = weapon.projectile.lifeMs;
      shot.damage = weapon.projectile.damage;
      shot.pierce = weapon.projectile.pierce;
      shot.impact = weapon.projectile.impact;
      shot.hits.clear();
      shot.sprite.setTexture(weapon.projectile.assetId);
      shot.sprite.setPosition(x, y);
      shot.sprite.setActive(true).setVisible(true);
      shot.sprite.setDisplaySize(weapon.projectile.radius * 2, weapon.projectile.radius * 2);
      const body = shot.sprite.body as Phaser.Physics.Arcade.Body;
      body.enable = true;
      body.reset(x, y);
      body.setAllowGravity(false);
      body.setCircle(shot.sprite.width / 2, 0, 0);
      body.setVelocity(shot.vx, shot.vy);
      shot.sprite.setData("shot", shot);
      cooldowns.set(weapon.id, now + weapon.cooldownMs);
      hooks.onShot(weapon);
      return { fired: true, energy: energy - (energyOn ? weapon.energyCost : 0), denied: false };
    },
    onHit: (shotSprite, target, now) => {
      const shot = shotSprite.getData("shot") as LiveShot | undefined;
      if (!shot || !shot.alive) return;
      if (shot.hits.has(target)) return;
      shot.hits.add(target);
      shot.pierce -= 1;
      if (shot.impact || shot.pierce <= 0) detonate(shot, now);
    },
    update: (dt, now) => {
      for (const shot of pool) {
        if (!shot.alive) continue;
        shot.life -= dt * 1000;
        const body = shot.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(shot.vx, shot.vy);
        const bounds = scene.physics.world.bounds;
        if (
          shot.life <= 0 ||
          shot.sprite.x < bounds.x - 20 ||
          shot.sprite.y < bounds.y - 20 ||
          shot.sprite.x > bounds.right + 20 ||
          shot.sprite.y > bounds.bottom + 20
        ) {
          detonate(shot, now);
        }
      }
      for (let i = zones.length - 1; i >= 0; i--) {
        const zone = zones[i];
        zone.gfx.clear();
        if (now > zone.until) {
          zone.gfx.destroy();
          zones.splice(i, 1);
          continue;
        }
        const life = Math.max(0, zone.until - now);
        const alpha = Math.min(1, life / 250) * 0.9;
        zone.gfx.lineStyle(3, hexNum("#FFC857"), alpha);
        zone.gfx.strokeCircle(zone.x, zone.y, zone.r);
        zone.gfx.lineStyle(2, hexNum("#FFF6D8"), alpha * 0.8);
        zone.gfx.strokeCircle(zone.x, zone.y, zone.r * 0.55);
        zone.gfx.lineBetween(zone.x - 8, zone.y, zone.x + 8, zone.y);
        zone.gfx.lineBetween(zone.x, zone.y - 8, zone.x, zone.y + 8);
      }
    },
    blockIfHot: (hotRects, now) => {
      for (const shot of pool) {
        if (!shot.alive) continue;
        for (const rect of hotRects) {
          if (
            shot.sprite.x > rect.x &&
            shot.sprite.x < rect.x + rect.w &&
            shot.sprite.y > rect.y &&
            shot.sprite.y < rect.y + rect.h
          ) {
            detonate(shot, now);
            break;
          }
        }
      }
    },
  };
}
