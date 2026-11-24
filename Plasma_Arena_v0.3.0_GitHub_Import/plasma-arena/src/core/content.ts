import assetsJson from "../../data/assets.json";
import balanceJson from "../../data/balance.json";
import entitiesJson from "../../data/entities.json";
import hazardsJson from "../../data/hazards.json";
import weaponsJson from "../../data/weapons.json";
import type { Content } from "./types";
import { assembleContent } from "./validate";

const arenas = import.meta.glob("../../data/arenas/*.json", { eager: true, import: "default" });

let cached: Content | null = null;

export function loadContent(): Content {
  if (cached) return cached;
  cached = assembleContent({
    balance: balanceJson,
    assets: (assetsJson as { assets: unknown }).assets,
    entities: (entitiesJson as { entities: unknown }).entities,
    weapons: (weaponsJson as { weapons: unknown }).weapons,
    hazards: (hazardsJson as { hazards: unknown }).hazards,
    arenas: Object.entries(arenas).sort(([a], [b]) => a.localeCompare(b)).map(([, data]) => data),
  });
  return cached;
}

/** Tests and hot reload can drop the cache. Not used by gameplay. */
export function clearContentCache(): void {
  cached = null;
}
