import type { Content, EntityDef } from "./types";

export type SplitPlan = {
  childIds: string[];
  truncated: boolean;
};

/** How many children to spawn right now, honoring the live body cap and generation cap. */
export function planSplit(
  content: Content,
  parent: EntityDef,
  generation: number,
  aliveAfterParentGone: number,
): SplitPlan {
  const split = parent.split;
  if (!split || !split.childId || split.count <= 0) {
    return { childIds: [], truncated: false };
  }
  if (generation >= content.balance.split.maxGeneration) {
    return { childIds: [], truncated: true };
  }
  const child = content.entityById.get(split.childId);
  if (!child) {
    throw new Error(`[PlasmaArena] ילד התפצלות חסר בזמן ריצה: "${split.childId}"`);
  }
  const room = content.balance.maxBodies - aliveAfterParentGone;
  const n = Math.max(0, Math.min(split.count, room));
  return {
    childIds: Array.from({ length: n }, () => child.id),
    truncated: n < split.count,
  };
}

/** Full descendant list if every body is destroyed and the cap is high enough to fit the tree. */
export function simulateFullSplit(
  content: Content,
  rootId: string,
  maxBodies = 10_000,
): { ids: string[]; truncated: boolean } {
  const ids: string[] = [];
  let used = 0;
  let truncated = false;

  const walk = (id: string, generation: number) => {
    if (used >= maxBodies) {
      truncated = true;
      return;
    }
    const def = content.entityById.get(id);
    if (!def) throw new Error(`[PlasmaArena] ישות חסרה בסימולציה: "${id}"`);
    ids.push(id);
    used += 1;
    const plan = planSplit(
      { ...content, balance: { ...content.balance, maxBodies } },
      def,
      generation,
      used,
    );
    if (plan.truncated && plan.childIds.length === 0 && def.split && def.split.count > 0) {
      truncated = true;
    }
    if (plan.truncated) truncated = true;
    for (const childId of plan.childIds) walk(childId, generation + 1);
  };

  walk(rootId, 0);
  return { ids, truncated };
}
