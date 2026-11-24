/** Mostly-up aim. `dirX` is -1..1 from horizontal input. Screen +y is down, so y is negative. */
export function aimVector(dirX: number, influence: number): { x: number; y: number } {
  const clamped = Math.max(-1, Math.min(1, dirX));
  const sway = Math.max(0, Math.min(1.1, influence));
  const ang = -Math.PI / 2 + clamped * sway;
  const x = Math.cos(ang);
  const y = Math.sin(ang);
  const mag = Math.hypot(x, y) || 1;
  return { x: x / mag, y: y / mag };
}
