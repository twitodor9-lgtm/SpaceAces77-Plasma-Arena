import Phaser from "phaser";
import { hexNum } from "./draw";

/** Arcade-style particle burst. Count is clamped; bigger radius callers pass higher counts. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: string | number,
  count = 8,
): void {
  const tint = typeof color === "number" ? color : hexNum(color);
  const n = Math.min(Math.max(count, 4), 14);
  for (let i = 0; i < n; i++) {
    const size = i % 3 === 0 ? 4 : i % 2 === 0 ? 3 : 2;
    const dot = scene.add.circle(x, y, size, tint, 0.95);
    const a = (Math.PI * 2 * i) / n + i * 0.17;
    const dist = 32 + (i % 4) * 12 + Math.random() * 8;
    const rise = -18 - Math.random() * 22;
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist + rise,
      alpha: 0,
      scale: 0.15,
      duration: 280 + (i % 3) * 40,
      ease: "Cubic.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}
