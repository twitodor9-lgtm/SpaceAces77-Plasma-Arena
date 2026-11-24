export type RunPhase = "boot" | "fighting" | "intermission" | "won" | "lost";

export type RunState = {
  arenaId: string;
  waveIndex: number;
  waveCount: number;
  pending: number;
  alive: number;
  phase: RunPhase;
  score: number;
  hull: number;
  maxHull: number;
};

export type ClearEvent = "none" | "wave-clear" | "win";

export function createRun(arenaId: string, waveCount: number, hull: number): RunState {
  return {
    arenaId,
    waveIndex: 0,
    waveCount,
    pending: 0,
    alive: 0,
    phase: "boot",
    score: 0,
    hull,
    maxHull: hull,
  };
}

export function startWave(run: RunState): RunState {
  if (run.phase === "won" || run.phase === "lost") return run;
  if (run.phase === "intermission") {
    return { ...run, phase: "fighting", waveIndex: run.waveIndex + 1 };
  }
  return { ...run, phase: "fighting" };
}

export function addScore(run: RunState, amount: number): RunState {
  return { ...run, score: run.score + amount };
}

export function applyHit(run: RunState, damage = 1): { run: RunState; lost: boolean } {
  if (run.phase === "won" || run.phase === "lost") {
    return { run, lost: run.phase === "lost" };
  }
  const hull = run.hull - damage;
  if (hull <= 0) return { run: { ...run, hull: 0, phase: "lost" }, lost: true };
  return { run: { ...run, hull }, lost: false };
}

export function commitCounts(
  run: RunState,
  alive: number,
  pending: number,
): { run: RunState; event: ClearEvent } {
  const next: RunState = { ...run, alive, pending };
  if (next.phase === "fighting" && next.alive === 0 && next.pending === 0) {
    if (next.waveIndex >= next.waveCount - 1) {
      return { run: { ...next, phase: "won" }, event: "win" };
    }
    return { run: { ...next, phase: "intermission" }, event: "wave-clear" };
  }
  return { run: next, event: "none" };
}
