import Phaser from "phaser";
import { session } from "./session";

type Ball = { x: number; y: number; vx: number; vy: number; r: number; color: number; motif: "ring" | "chev" | "cross" };

export class AttractScene extends Phaser.Scene {
  private balls: Ball[] = [];
  private gfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super("attract");
  }

  create(): void {
    const size = session.content?.balance.arenaSize ?? { width: 960, height: 540 };
    this.balls = [
      { x: 220, y: 120, vx: 90, vy: -40, r: 42, color: 0xff3d8a, motif: "ring" },
      { x: 520, y: 80, vx: -70, vy: 20, r: 26, color: 0xb794f6, motif: "chev" },
      { x: 760, y: 140, vx: 60, vy: -10, r: 32, color: 0xff7a59, motif: "cross" },
    ];
    this.gfx = this.add.graphics();
    this.events.once("shutdown", () => {
      this.balls = [];
    });
    this.draw(size.width, size.height);
  }

  update(_time: number, delta: number): void {
    const size = session.content?.balance.arenaSize ?? { width: 960, height: 540 };
    const dt = Math.min(delta, 50) / 1000;
    for (const ball of this.balls) {
      ball.vy += 640 * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < ball.r) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x > size.width - ball.r) {
        ball.x = size.width - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y < ball.r) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
      }
      if (ball.y > size.height - 30 - ball.r) {
        ball.y = size.height - 30 - ball.r;
        ball.vy = -Math.abs(ball.vy) * 0.98;
      }
    }
    this.draw(size.width, size.height);
  }

  private draw(width: number, height: number): void {
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x070910, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x10182a, 1);
    g.fillRect(0, height - 28, width, 28);
    g.fillStyle(0xff3d8a, 0.08);
    g.fillCircle(width / 2, 80, 90);
    for (const ball of this.balls) {
      g.fillStyle(ball.color, 0.25);
      g.fillCircle(ball.x, ball.y, ball.r);
      g.fillStyle(ball.color, 1);
      g.fillCircle(ball.x, ball.y, ball.r * 0.78);
      g.lineStyle(3, 0xffffff, 0.8);
      g.strokeCircle(ball.x, ball.y, ball.r * 0.78);
      if (ball.motif === "ring") g.strokeCircle(ball.x, ball.y, ball.r * 0.48);
      if (ball.motif === "cross") {
        g.fillRect(ball.x - 2, ball.y - ball.r * 0.4, 4, ball.r * 0.8);
        g.fillRect(ball.x - ball.r * 0.4, ball.y - 2, ball.r * 0.8, 4);
      }
    }
  }
}
