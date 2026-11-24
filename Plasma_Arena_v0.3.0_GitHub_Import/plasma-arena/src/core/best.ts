const KEY = "spaceaces77.plasma-arena.best.v1";

export function readBest(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function writeBest(score: number): number {
  const best = Math.max(readBest(), Math.floor(score));
  try {
    localStorage.setItem(KEY, String(best));
  } catch {
    /* private mode */
  }
  return best;
}
