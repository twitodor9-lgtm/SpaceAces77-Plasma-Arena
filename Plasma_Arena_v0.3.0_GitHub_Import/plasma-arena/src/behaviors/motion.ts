import Phaser from "phaser";
import type { BehaviorParams } from "../core/types";

export type MotionHost = {
  sprite: Phaser.Physics.Arcade.Sprite;
  behaviors: BehaviorParams[];
  state: Record<string, number>;
  baseGravity: number;
  slowMul: number;
  slowUntil: number;
  speedScale: number;
  interaction: string;
};

export function initMotion(host: MotionHost, dir: number, popY: number | null, now: number): void {
  const body = host.sprite.body as Phaser.Physics.Arcade.Body;
  body.setAllowGravity(true);
  body.setCollideWorldBounds(true);
  body.setDrag(0, 0);
  body.setBounce(1, 1);
  body.setMaxVelocity(640, 820);

  let gravity = 800;
  let speed = 140;
  let restitution = 1;
  host.state.hasZig = 0;
  host.state.hasPulse = 0;
  host.state.hasHoriz = 0;
  host.state.hasBounce = 0;
  host.state.phase = 0;
  host.state.t = Math.random() * 2;
  host.state.speedMul = 1;

  for (const behavior of host.behaviors) {
    if (behavior.key === "bounce") {
      host.state.hasBounce = 1;
      speed = behavior.speed ?? speed;
      gravity = behavior.gravity ?? gravity;
      restitution = behavior.restitution ?? 1;
    } else if (behavior.key === "zigzag") {
      host.state.hasZig = 1;
      host.state.zigSpeed = (behavior.speed ?? speed) * host.speedScale;
      host.state.period = behavior.period ?? 1.3;
    } else if (behavior.key === "pulse") {
      host.state.hasPulse = 1;
      host.state.burstEvery = behavior.burstEveryMs ?? 2200;
      host.state.burstMs = behavior.burstMs ?? 400;
      host.state.telegraphMs = behavior.telegraphMs ?? 350;
      host.state.burstMul = behavior.burstMul ?? 1.6;
      host.state.nextBurst = now + (behavior.burstEveryMs ?? 2200);
      host.state.burstUntil = 0;
    } else if (behavior.key === "move_horizontal") {
      host.state.hasHoriz = 1;
      host.state.hSpeed = (behavior.speed ?? 80) * host.speedScale;
      host.state.halfRange = behavior.halfRange ?? 80;
      host.state.originX = host.sprite.x;
      gravity = behavior.gravity ?? 0;
    } else {
      throw new Error(`[PlasmaArena] התנהגות לא מוכרת בזמן ריצה: "${behavior.key}"`);
    }
  }

  host.baseGravity = gravity;
  host.state.cruiseSpeed = speed * host.speedScale;
  host.state.dir = dir === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dir);
  body.setBounce(restitution, restitution);
  body.setGravityY(host.state.hasHoriz && !host.state.hasBounce ? 0 : gravity);

  if (host.state.hasHoriz && !host.state.hasBounce) {
    body.setBounce(0, 0);
    body.setVelocity(host.state.dir * host.state.hSpeed, 0);
    body.setMaxVelocity(Math.abs(host.state.hSpeed) + 20, 40);
    return;
  }

  const launch = popY === null ? -host.state.cruiseSpeed * 0.92 : popY;
  body.setVelocity(host.state.dir * host.state.cruiseSpeed, launch);
}

export function updateMotion(host: MotionHost, dt: number, now: number): void {
  const body = host.sprite.body as Phaser.Physics.Arcade.Body;
  if (!body) return;
  if (host.slowMul !== 1 && now >= host.slowUntil) {
    body.velocity.y /= host.slowMul;
    host.slowMul = 1;
  }

  if (host.state.hasPulse) {
    const tele = host.state.telegraphMs;
    const every = host.state.burstEvery;
    let phase = host.state.phase;
    let next = host.state.nextBurst;
    if (phase === 0 && now >= next - tele) phase = 1;
    if (phase === 1 && now >= next) {
      phase = 2;
      host.state.burstUntil = next + host.state.burstMs;
    }
    if (phase === 2 && now >= host.state.burstUntil) {
      phase = 0;
      next = now + every;
    }
    host.state.phase = phase;
    host.state.nextBurst = next;
    host.state.speedMul = phase === 2 ? host.state.burstMul : 1;
  }

  const slowNow = now < host.slowUntil ? host.slowMul : 1;
  const mul = (host.state.speedMul || 1) * slowNow;

  if (host.state.hasHoriz && !host.state.hasBounce) {
    let vx = host.state.dir * host.state.hSpeed;
    const origin = host.state.originX;
    const half = host.state.halfRange;
    if (host.sprite.x >= origin + half || body.blocked.right) vx = -Math.abs(host.state.hSpeed);
    if (host.sprite.x <= origin - half || body.blocked.left) vx = Math.abs(host.state.hSpeed);
    host.state.dir = Math.sign(vx) || host.state.dir;
    body.setVelocity(vx * slowNow, 0);
    body.setGravityY(0);
    return;
  }

  body.setGravityY(host.baseGravity * mul);
  const cap = Math.max(420, host.state.cruiseSpeed * 2.5 * Math.max(1, host.state.speedMul || 1));
  if (body.velocity.y > cap) body.setVelocityY(cap);
  if (body.velocity.y < -cap) body.setVelocityY(-cap);

  if (host.state.hasZig) {
    host.state.t += dt;
    if (body.blocked.left || body.blocked.right) host.state.t += (host.state.period || 1) / 2;
    const period = host.state.period || 1.3;
    const vx = Math.sin((host.state.t / period) * Math.PI * 2) * host.state.zigSpeed * mul;
    body.setVelocityX(vx);
    return;
  }

  let dir = host.state.dir || 1;
  if (body.blocked.left) dir = 1;
  else if (body.blocked.right) dir = -1;
  else if (Math.abs(body.velocity.x) > 12) dir = Math.sign(body.velocity.x);
  host.state.dir = dir;
  body.setVelocityX(dir * host.state.cruiseSpeed * mul);
}
