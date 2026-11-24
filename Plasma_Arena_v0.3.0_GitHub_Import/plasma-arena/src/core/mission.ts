export type MissionDetail = {
  arenaId: string;
  score: number;
  waves: number;
};

/**
 * Future campaign hook. Not wired to any shared campaign contract.
 * Listen on window for CustomEvent "plasma-arena-mission".
 * detail.result is "missionComplete" or "missionFailed".
 */
export function emitMission(result: "missionComplete" | "missionFailed", detail: MissionDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("plasma-arena-mission", {
      detail: { result, ...detail },
    }),
  );
}
