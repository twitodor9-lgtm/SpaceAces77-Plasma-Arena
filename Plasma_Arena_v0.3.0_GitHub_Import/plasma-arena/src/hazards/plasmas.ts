import Phaser from "phaser";
import { hexNum } from "../assets/draw";
import { initMotion, updateMotion, type MotionHost } from "../behaviors/motion";
import { acceptsSlow, damageMultiplier } from "../core/interactions";
import { fitSpawn } from "../core/spawnPlacement";
import { planSplit } from "../core/splitSim";
import type { Content, EntityDef } from "../core/types";

export type Plasma = MotionHost & {
  def: EntityDef;
  generation: number;
  hp: number;
  graceUntil: number;
  alive: boolean;
  score: number;
  radius: number;
};

export type PlasmaSystem = {
  group: Phaser.Physics.Arcade.Group;
  spawn: (opts: SpawnOpts) => boolean;
  hurt: (sprite: Phaser.GameObjects.GameObject, amount: number) => void;
  touchPlayer: (sprite: Phaser.GameObjects.GameObject) => void;
  applyZones: (zones: { x: number; y: number; r: number; factor: number; until: number }[]) => void;
  update: (dt: number, now: number) => void;
  flush: () => void;
  aliveCount: () => number;
  destroy: () => void;
};

type SpawnOpts = {
  id: string;
  x: number;
  y: number;
  speedScale: number;
  generation: number;
  graceMs: number;
  now: number;
  popY?: number;
  dir?: number;
};

export function createPlasmaSystem(
  scene: Phaser.Scene,
  content: Content,
  hooks: {
    now: () => number;
    canHurt: () => boolean;
    onPlayerHit: (damage: number) => void;
    onPop: (plasma: Plasma, x: number, y: number, children: number) => void;
    onSpawn: (id: string, x: number, y: number, generation: number) => void;
    onDensity: () => void;
  },
): PlasmaSystem {
  const group = scene.physics.add.group();
  const all = new Set<Plasma>();
  const queue: Plasma[] = [];

  const fit = (sprite: Phaser.Physics.Arcade.Sprite, radius: number) => {
    sprite.setOrigin(0.5, 0.5);
    sprite.setDisplaySize(radius * 2, radius * 2);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(sprite.width / 2, 0, 0);
  };

  const killNow = (plasma: Plasma) => {
    if (!plasma.alive) return;
    plasma.alive = false;
    const generation = plasma.generation;
    const x = plasma.sprite.x;
    const y = plasma.sprite.y;
    const def = plasma.def;
    const speedScale = plasma.speedScale;
    const dir = plasma.state.dir || 1;
    plasma.sprite.destroy();
    all.delete(plasma);
    const plan = planSplit(content, def, generation, aliveCount());
    hooks.onPop(plasma, x, y, plan.childIds.length);
    if (plan.truncated) hooks.onDensity();
    const sep = content.balance.split.childSeparation;
    plan.childIds.forEach((id, index) => {
      const sign = index % 2 === 0 ? -1 : 1;
      const spread = (index - (plan.childIds.length - 1) / 2) * sep;
      spawn({
        id,
        x: x + spread,
        y: y - 6,
        speedScale,
        generation: generation + 1,
        graceMs: content.balance.split.childGraceMs,
        now: hooks.now(),
        popY: content.balance.split.childPopVelocity,
        dir: sign * Math.abs(dir || 1),
      });
    });
  };

  const spawn = (opts: SpawnOpts): boolean => {
    if (aliveCount() >= content.balance.maxBodies) {
      hooks.onDensity();
      return false;
    }
    const def = content.entityById.get(opts.id);
    if (!def) throw new Error(`[PlasmaArena] ישות חסרה בזמן ריצה: "${opts.id}"`);
    const asset = content.assetById.get(def.assetId);
    if (!asset) throw new Error(`[PlasmaArena] asset חסר בזמן ריצה: "${def.assetId}"`);
    const { width, height } = content.balance.arenaSize;
    const { x, y } = fitSpawn(opts, def.radius, width, height);
    const sprite = scene.physics.add.sprite(x, y, def.assetId);
    fit(sprite, def.radius);
    sprite.setDepth(3);
    group.add(sprite);
    const plasma: Plasma = {
      def,
      sprite,
      generation: opts.generation,
      hp: def.hp,
      graceUntil: opts.now + opts.graceMs,
      alive: true,
      score: def.score,
      radius: def.radius,
      behaviors: def.behaviors,
      state: {},
      baseGravity: 0,
      slowMul: 1,
      slowUntil: 0,
      speedScale: opts.speedScale,
      interaction: def.interaction,
    };
    sprite.setData("plasma", plasma);
    all.add(plasma);
    initMotion(plasma, opts.dir ?? 0, opts.popY ?? null, opts.now);
    hooks.onSpawn(opts.id, x, y, opts.generation);
    return true;
  };

  const aliveCount = () => {
    let n = 0;
    for (const plasma of all) if (plasma.alive) n += 1;
    return n;
  };

  const of = (sprite: Phaser.GameObjects.GameObject) =>
    sprite.getData("plasma") as Plasma | undefined;

  return {
    group,
    spawn,
    hurt: (sprite, amount) => {
      const plasma = of(sprite);
      if (!plasma || !plasma.alive || plasma.hp <= 0) return;
      const dealt = amount * damageMultiplier(plasma.interaction);
      if (dealt <= 0) return;
      plasma.hp -= dealt;
      plasma.sprite.setTintFill(0xffffff);
      scene.time.delayedCall(70, () => {
        if (plasma.alive) plasma.sprite.clearTint();
      });
      if (plasma.hp <= 0) queue.push(plasma);
    },
    touchPlayer: (sprite) => {
      const plasma = of(sprite);
      if (!plasma || !plasma.alive || plasma.hp <= 0) return;
      if (hooks.now() < plasma.graceUntil) return;
      if (plasma.def.contactDamage <= 0) return;
      if (!hooks.canHurt()) return;
      hooks.onPlayerHit(plasma.def.contactDamage);
    },
    applyZones: (zones) => {
      const now = hooks.now();
      for (const plasma of all) {
        if (!plasma.alive || !acceptsSlow(plasma.interaction)) continue;
        let factor = 1;
        let until = 0;
        for (const zone of zones) {
          if (now > zone.until) continue;
          const dx = plasma.sprite.x - zone.x;
          const dy = plasma.sprite.y - zone.y;
          if (dx * dx + dy * dy <= zone.r * zone.r) {
            factor = Math.min(factor, zone.factor);
            until = Math.max(until, zone.until);
          }
        }
        if (factor < 1) {
          const prev = now < plasma.slowUntil ? plasma.slowMul : 1;
          if (Math.abs(prev - factor) >= 0.02) {
            const body = plasma.sprite.body as Phaser.Physics.Arcade.Body;
            body.velocity.y *= factor / prev;
          }
          plasma.slowMul = factor;
          plasma.slowUntil = until;
        }
      }
    },
    update: (dt, now) => {
      for (const plasma of all) {
        if (!plasma.alive) continue;
        updateMotion(plasma, dt, now);
        const telegraph = plasma.state.hasPulse === 1 && plasma.state.phase === 1;
        const grace = now < plasma.graceUntil;
        if (grace) plasma.sprite.setAlpha(0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 60)));
        else if (telegraph) plasma.sprite.setAlpha(0.55 + 0.45 * (0.5 + 0.5 * Math.sin(now / 40)));
        else plasma.sprite.setAlpha(1);
        if (telegraph) plasma.sprite.setTint(hexNum("#FFE7A3"));
        else if (plasma.hp >= plasma.def.hp) plasma.sprite.clearTint();
      }
    },
    flush: () => {
      const batch = queue.splice(0, queue.length);
      for (const plasma of batch) killNow(plasma);
    },
    aliveCount,
    destroy: () => {
      for (const plasma of all) plasma.sprite.destroy();
      all.clear();
      queue.length = 0;
    },
  };
}

