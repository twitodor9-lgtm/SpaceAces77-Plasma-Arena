import Phaser from "phaser";
import { hexNum } from "./draw";

export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: string | number,
  count = 8,
): void {
  const tint = typeof color === "number" ? color : hexNum(color);
  const n = Math.min(count, 10);
  for (let i = 0; i < n; i++) {
    const dot = scene.add.circle(x, y, i % 2 === 0 ? 3 : 2, tint, 0.95);
    const a = (Math.PI * 2 * i) / n + 0.2;
    const dist = 28 + (i % 3) * 10;
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist,
      alpha: 0,
      scale: 0.2,
      duration: 240,
      onComplete: () => dot.destroy(),
    });
  }
}
