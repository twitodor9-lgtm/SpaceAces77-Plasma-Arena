export function damageMultiplier(interaction: string): number {
  if (interaction === "brittle") return 2;
  if (interaction === "normal" || interaction === "resist_slow") return 1;
  throw new Error(`[PlasmaArena] interaction לא מוכר בזמן ריצה: "${interaction}"`);
}

export function acceptsSlow(interaction: string): boolean {
  if (interaction === "resist_slow") return false;
  if (interaction === "normal" || interaction === "brittle") return true;
  throw new Error(`[PlasmaArena] interaction לא מוכר בזמן ריצה: "${interaction}"`);
}
