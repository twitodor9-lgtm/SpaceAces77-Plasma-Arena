export type BehaviorParams = {
  key: string;
  speed?: number;
  gravity?: number;
  restitution?: number;
  period?: number;
  burstEveryMs?: number;
  burstMs?: number;
  telegraphMs?: number;
  burstMul?: number;
  halfRange?: number;
};

export type SplitDef = {
  childId: string;
  count: number;
};

export type EntityDef = {
  id: string;
  kind: "plasma";
  label: string;
  assetId: string;
  hp: number;
  radius: number;
  score: number;
  contactDamage: number;
  interaction: string;
  behaviors: BehaviorParams[];
  split: SplitDef | null;
};

export type ImpactDef = {
  behavior: string;
  radius: number;
  durationMs: number;
  factor: number;
};

export type ProjectileDef = {
  motion: string;
  speed: number;
  direction: "aim_up";
  radius: number;
  lifeMs: number;
  damage: number;
  pierce: number;
  assetId: string;
  impact: ImpactDef | null;
};

export type WeaponDef = {
  id: string;
  label: string;
  hint: string;
  behavior: string;
  cooldownMs: number;
  energyCost: number;
  projectile: ProjectileDef;
};

export type HazardDef = {
  id: string;
  label: string;
  behavior: string;
  damage: number;
  assetId: string;
  telegraphMs: number;
  activeMs: number;
  inactiveMs: number;
  speed: number;
};

export type HazardPlacement = {
  ref: string;
  x: number;
  y: number;
  w: number;
  h: number;
  x2?: number;
};

export type SpawnRef = { id: string; count: number };

export type WaveEvent = { delayMs: number; spawns: SpawnRef[] };

export type WaveDef = {
  banner: string;
  speedScale: number;
  spawns: SpawnRef[];
  events: WaveEvent[];
};

export type PlatformDef = { x: number; y: number; w: number; h: number };

export type ArenaDef = {
  id: string;
  label: string;
  blurb: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  platforms: PlatformDef[];
  spawnPoints: { x: number; y: number }[];
  waves: WaveDef[];
  hazards: HazardPlacement[];
  winCondition: "clear_all_waves";
};

export type AssetDef = {
  id: string;
  kind: "procedural";
  shape: string;
  color: string;
  accent: string;
  motif: string;
};

export type Strings = {
  title: string;
  kicker: string;
  subtitle: string;
  start: string;
  retry: string;
  menu: string;
  winTitle: string;
  loseTitle: string;
  winBody: string;
  loseBody: string;
  intermission: string;
  density: string;
  energy: string;
  energyHint: string;
  controls: string;
  aimNote: string;
  best: string;
  score: string;
  wave: string;
  hull: string;
  energyShort: string;
};

export type BalanceDef = {
  version: number;
  arenaSize: { width: number; height: number };
  maxBodies: number;
  maxShots: number;
  maxZones: number;
  defaultArenaId: string;
  weaponsOrder: string[];
  player: {
    speed: number;
    jumpVelocity: number;
    gravity: number;
    hull: number;
    iFrameMs: number;
    width: number;
    height: number;
    coyoteMs: number;
    jumpBufferMs: number;
  };
  split: {
    maxGeneration: number;
    childGraceMs: number;
    childPopVelocity: number;
    childSeparation: number;
  };
  spawn: { telegraphMs: number; safeRadius: number; staggerMs: number };
  aim: { influence: number };
  energy: { max: number; regenPerSec: number };
  intermissionMs: number;
  strings: Strings;
};

export type Content = {
  balance: BalanceDef;
  assets: AssetDef[];
  entities: EntityDef[];
  weapons: WeaponDef[];
  hazards: HazardDef[];
  arenas: ArenaDef[];
  entityById: Map<string, EntityDef>;
  weaponById: Map<string, WeaponDef>;
  hazardById: Map<string, HazardDef>;
  arenaById: Map<string, ArenaDef>;
  assetById: Map<string, AssetDef>;
};
