import {
  AIM_DIRECTIONS,
  HAZARD_BEHAVIORS,
  IMPACT_BEHAVIORS,
  INTERACTIONS,
  MOTIFS,
  MOTION_BEHAVIORS,
  PROJECTILE_MOTIONS,
  SHAPES,
  WEAPON_BEHAVIORS,
  WIN_CONDITIONS,
} from "./behaviorKeys";
import { ContentError } from "./errors";
import type {
  ArenaDef,
  AssetDef,
  BalanceDef,
  BehaviorParams,
  Content,
  EntityDef,
  HazardDef,
  Strings,
  WeaponDef,
} from "./types";

const STRING_KEYS: (keyof Strings)[] = [
  "title",
  "kicker",
  "subtitle",
  "start",
  "retry",
  "menu",
  "winTitle",
  "loseTitle",
  "winBody",
  "loseBody",
  "intermission",
  "density",
  "energy",
  "energyHint",
  "controls",
  "aimNote",
  "best",
  "score",
  "wave",
  "hull",
  "energyShort",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export type RawBundle = {
  balance: unknown;
  assets: unknown;
  entities: unknown;
  weapons: unknown;
  hazards: unknown;
  arenas: unknown;
};

export function assembleContent(raw: RawBundle): Content {
  const issues: string[] = [];
  const balance = parseBalance(raw.balance, issues);
  const assets = parseAssets(raw.assets, issues);
  const entities = parseEntities(raw.entities, issues);
  const weapons = parseWeapons(raw.weapons, issues);
  const hazards = parseHazards(raw.hazards, issues);
  const arenas = parseArenas(raw.arenas, issues);

  const assetIds = idsOf(assets);
  const entityIds = idsOf(entities);
  const weaponIds = idsOf(weapons);
  const hazardIds = idsOf(hazards);
  const arenaIds = idsOf(arenas);

  dupes(assetIds, "asset", issues);
  dupes(entityIds, "entity", issues);
  dupes(weaponIds, "weapon", issues);
  dupes(hazardIds, "hazard", issues);
  dupes(arenaIds, "arena", issues);

  if (balance) {
    for (const id of balance.weaponsOrder) {
      if (!weaponIds.includes(id)) issues.push(`weaponsOrder מפנה לנשק חסר: "${id}"`);
    }
    if (new Set(balance.weaponsOrder).size !== balance.weaponsOrder.length) {
      issues.push("weaponsOrder מכיל כפילות");
    }
    const base = weapons.find((weapon) => weapon.id === balance.weaponsOrder[0]);
    if (base && (base.energyCost !== 0 || base.projectile.damage <= 0)) {
      issues.push("הנשק הראשון חייב לגרום נזק ללא עלות אנרגיה");
    }
    if (balance.defaultArenaId && !arenaIds.includes(balance.defaultArenaId)) {
      issues.push(`defaultArenaId חסר: "${balance.defaultArenaId}"`);
    }
  }

  for (const entity of entities) {
    if (!assetIds.includes(entity.assetId)) {
      issues.push(`entity "${entity.id}" מפנה ל-asset חסר: "${entity.assetId}"`);
    }
    const keys = entity.behaviors.map((b) => b.key);
    const bases = keys.filter((k) => k === "bounce" || k === "move_horizontal");
    if (bases.length !== 1) {
      issues.push(
        `entity "${entity.id}" חייב התנהגות בסיס אחת בדיוק: bounce או move_horizontal (נמצאו ${bases.length})`,
      );
    }
    if (keys.includes("move_horizontal") && keys.length !== 1) {
      issues.push(`entity "${entity.id}": move_horizontal לא משולב עם התנהגויות אחרות ב-v0.1`);
    }
    if ((keys.includes("zigzag") || keys.includes("pulse")) && !keys.includes("bounce")) {
      issues.push(`entity "${entity.id}": zigzag/pulse דורשים גם bounce`);
    }
    if (entity.split?.childId && !entityIds.includes(entity.split.childId)) {
      issues.push(`entity "${entity.id}" מתפצל לישות חסרה: "${entity.split.childId}"`);
    }
  }

  for (const weapon of weapons) {
    if (!assetIds.includes(weapon.projectile.assetId)) {
      issues.push(`weapon "${weapon.id}" מפנה ל-asset חסר: "${weapon.projectile.assetId}"`);
    }
  }

  for (const hazard of hazards) {
    if (!assetIds.includes(hazard.assetId)) {
      issues.push(`hazard "${hazard.id}" מפנה ל-asset חסר: "${hazard.assetId}"`);
    }
  }

  if (balance) {
    for (const arena of arenas) {
      if (arena.width !== balance.arenaSize.width || arena.height !== balance.arenaSize.height) {
        issues.push(
          `arena "${arena.id}" בגודל ${arena.width}×${arena.height}, אבל arenaSize הוא ${balance.arenaSize.width}×${balance.arenaSize.height}`,
        );
      }
      const within = ({ x, y }: { x: number; y: number }) => x >= 0 && y >= 0 && x <= arena.width && y <= arena.height;
      if (![arena.playerSpawn, ...arena.spawnPoints].every(within)) {
        issues.push(`arena "${arena.id}" נקודת הופעה מחוץ לגבולות`);
      }
      for (const wave of arena.waves) {
        for (const spawn of [...wave.spawns, ...wave.events.flatMap((e) => e.spawns)]) {
          if (!entityIds.includes(spawn.id)) {
            issues.push(`arena "${arena.id}" מזמן ישות חסרה: "${spawn.id}"`);
          }
        }
      }
      for (const place of arena.hazards) {
        if (!hazardIds.includes(place.ref)) {
          issues.push(`arena "${arena.id}" מפנה למכשול חסר: "${place.ref}"`);
        }
        const def = hazards.find((h) => h.id === place.ref);
        if (def?.behavior === "horizontal_patrol" && place.x2 === undefined) {
          issues.push(`arena "${arena.id}" מיקום "${place.ref}" חסר x2 לסיור אופקי`);
        }
      }
    }
  }

  checkSplitCycles(entities, issues);
  if (balance) checkSplitDepth(entities, balance.split.maxGeneration, issues);

  if (issues.length || !balance) throw new ContentError(issues.length ? issues : ["balance חסר"]);

  return {
    balance,
    assets,
    entities,
    weapons,
    hazards,
    arenas,
    assetById: new Map(assets.map((a) => [a.id, a])),
    entityById: new Map(entities.map((e) => [e.id, e])),
    weaponById: new Map(weapons.map((w) => [w.id, w])),
    hazardById: new Map(hazards.map((h) => [h.id, h])),
    arenaById: new Map(arenas.map((a) => [a.id, a])),
  };
}

function checkSplitCycles(entities: EntityDef[], issues: string[]): void {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const color = new Map<string, number>();
  const dfs = (id: string, stack: string[]) => {
    const state = color.get(id) ?? 0;
    if (state === 1) {
      issues.push(`מעגל התפצלות: ${[...stack, id].join(" → ")}`);
      return;
    }
    if (state === 2) return;
    color.set(id, 1);
    const child = byId.get(id)?.split?.childId;
    if (child && byId.has(child)) dfs(child, [...stack, id]);
    color.set(id, 2);
  };
  for (const entity of entities) dfs(entity.id, []);
}

function checkSplitDepth(entities: EntityDef[], maxGeneration: number, issues: string[]): void {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const depthOf = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0;
    const child = byId.get(id)?.split?.childId;
    if (!child || !byId.has(child)) return 0;
    seen.add(id);
    return 1 + depthOf(child, seen);
  };
  for (const entity of entities) {
    const depth = depthOf(entity.id, new Set());
    if (depth > maxGeneration) {
      issues.push(
        `שרשרת ההתפצלות של "${entity.id}" בעומק ${depth} ארוכה מ-split.maxGeneration (${maxGeneration})`,
      );
    }
  }
}

function parseBalance(raw: unknown, issues: string[]): BalanceDef | null {
  if (!isRec(raw)) {
    issues.push("balance אינו אובייקט");
    return null;
  }
  const arenaSize = isRec(raw.arenaSize) ? raw.arenaSize : {};
  const player = isRec(raw.player) ? raw.player : {};
  const split = isRec(raw.split) ? raw.split : {};
  const spawn = isRec(raw.spawn) ? raw.spawn : {};
  const aim = isRec(raw.aim) ? raw.aim : {};
  const energy = isRec(raw.energy) ? raw.energy : {};
  const stringsRaw = isRec(raw.strings) ? raw.strings : {};
  const strings = {} as Strings;
  for (const key of STRING_KEYS) {
    const value = stringsRaw[key];
    if (typeof value !== "string" || !value.trim()) issues.push(`balance.strings.${key} חסר`);
    else strings[key] = value;
  }
  const weaponsOrder = Array.isArray(raw.weaponsOrder)
    ? raw.weaponsOrder.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (!Array.isArray(raw.weaponsOrder) || weaponsOrder.length !== raw.weaponsOrder.length) {
    issues.push("weaponsOrder חייב להיות מערך מזהים");
  }
  if (weaponsOrder.length < 1) issues.push("weaponsOrder ריק");

  const balance: BalanceDef = {
    version: num(raw.version, "balance.version", issues, { min: 1, max: Number.MAX_SAFE_INTEGER, int: true }),
    arenaSize: {
      width: num(arenaSize.width, "arenaSize.width", issues, { min: 640, max: 1920 }),
      height: num(arenaSize.height, "arenaSize.height", issues, { min: 360, max: 1080 }),
    },
    maxBodies: num(raw.maxBodies, "maxBodies", issues, { min: 4, max: 80, int: true }),
    maxShots: num(raw.maxShots, "maxShots", issues, { min: 1, max: 40, int: true }),
    maxZones: num(raw.maxZones, "maxZones", issues, { min: 1, max: 12, int: true }),
    defaultArenaId: str(raw.defaultArenaId, "defaultArenaId", issues),
    weaponsOrder,
    player: {
      speed: num(player.speed, "player.speed", issues, { min: 40, max: 800 }),
      jumpVelocity: num(player.jumpVelocity, "player.jumpVelocity", issues, { min: -2000, max: -50 }),
      gravity: num(player.gravity, "player.gravity", issues, { min: 100, max: 4000 }),
      hull: num(player.hull, "player.hull", issues, { min: 1, max: 9, int: true }),
      iFrameMs: num(player.iFrameMs, "player.iFrameMs", issues, { min: 0, max: 5000 }),
      width: num(player.width, "player.width", issues, { min: 8, max: 128 }),
      height: num(player.height, "player.height", issues, { min: 8, max: 160 }),
      coyoteMs: num(player.coyoteMs, "player.coyoteMs", issues, { min: 0, max: 400 }),
      jumpBufferMs: num(player.jumpBufferMs, "player.jumpBufferMs", issues, { min: 0, max: 400 }),
    },
    split: {
      maxGeneration: num(split.maxGeneration, "split.maxGeneration", issues, { min: 0, max: 8, int: true }),
      childGraceMs: num(split.childGraceMs, "split.childGraceMs", issues, { min: 0, max: 3000 }),
      childPopVelocity: num(split.childPopVelocity, "split.childPopVelocity", issues, { min: -2000, max: 0 }),
      childSeparation: num(split.childSeparation, "split.childSeparation", issues, { min: 0, max: 200 }),
    },
    spawn: {
      telegraphMs: num(spawn.telegraphMs, "spawn.telegraphMs", issues, { min: 0, max: 5000 }),
      safeRadius: num(spawn.safeRadius, "spawn.safeRadius", issues, { min: 0, max: 600 }),
      staggerMs: num(spawn.staggerMs, "spawn.staggerMs", issues, { min: 0, max: 2000 }),
    },
    aim: { influence: num(aim.influence, "aim.influence", issues, { min: 0, max: 1.2 }) },
    energy: {
      max: num(energy.max, "energy.max", issues, { min: 1, max: 999 }),
      regenPerSec: num(energy.regenPerSec, "energy.regenPerSec", issues, { min: 0, max: 200 }),
    },
    intermissionMs: num(raw.intermissionMs, "intermissionMs", issues, { min: 0, max: 8000 }),
    strings,
  };
  return balance;
}

function parseAssets(raw: unknown, issues: string[]): AssetDef[] {
  if (!Array.isArray(raw)) {
    issues.push("assets אינו מערך");
    return [];
  }
  return raw.map((item, i) => {
    const rec = isRec(item) ? item : {};
    if (!isRec(item)) issues.push(`assets[${i}] אינו אובייקט`);
    const kind = str(rec.kind, `assets[${i}].kind`, issues);
    if (kind && kind !== "procedural") issues.push(`assets[${i}].kind חייב להיות procedural (בלי נכס מרוחק)`);
    const shape = str(rec.shape, `assets[${i}].shape`, issues);
    if (shape && !SHAPES.includes(shape as (typeof SHAPES)[number])) {
      issues.push(`assets[${i}].shape לא נתמך: "${shape}"`);
    }
    const motif = str(rec.motif, `assets[${i}].motif`, issues);
    if (motif && !MOTIFS.includes(motif as (typeof MOTIFS)[number])) {
      issues.push(`assets[${i}].motif לא נתמך: "${motif}". מוטיב חדש דורש קוד ציור.`);
    }
    const color = str(rec.color, `assets[${i}].color`, issues);
    const accent = str(rec.accent, `assets[${i}].accent`, issues);
    if (color && !HEX.test(color)) issues.push(`assets[${i}].color אינו hex של 6 ספרות`);
    if (accent && !HEX.test(accent)) issues.push(`assets[${i}].accent אינו hex של 6 ספרות`);
    for (const key of Object.keys(rec)) {
      const value = rec[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        issues.push(`assets[${i}] מכיל כתובת מרוחקת בשדה ${key}`);
      }
    }
    return {
      id: str(rec.id, `assets[${i}].id`, issues),
      kind: "procedural",
      shape,
      color,
      accent,
      motif,
    };
  });
}

function parseEntities(raw: unknown, issues: string[]): EntityDef[] {
  if (!Array.isArray(raw)) {
    issues.push("entities אינו מערך");
    return [];
  }
  return raw.map((item, i) => {
    const rec = isRec(item) ? item : {};
    const where = `entities[${i}]`;
    const behaviors = parseBehaviors(rec.behaviors, `${where}.behaviors`, issues);
    let split: EntityDef["split"] = null;
    if (rec.split === null || rec.split === undefined) split = null;
    else if (!isRec(rec.split)) issues.push(`${where}.split אינו אובייקט או null`);
    else {
      const childId = rec.split.childId;
      const count = num(rec.split.count, `${where}.split.count`, issues, { min: 0, max: 8, int: true });
      if (childId === null || childId === undefined || childId === "") split = null;
      else if (typeof childId !== "string") issues.push(`${where}.split.childId אינו מחרוזת`);
      else split = { childId, count };
    }
    const interaction = str(rec.interaction, `${where}.interaction`, issues);
    if (interaction && !INTERACTIONS.includes(interaction as (typeof INTERACTIONS)[number])) {
      issues.push(`${where}.interaction לא נתמך: "${interaction}"`);
    }
    const kind = str(rec.kind, `${where}.kind`, issues);
    if (kind && kind !== "plasma") issues.push(`${where}.kind חייב להיות plasma ב-v0.1`);
    return {
      id: str(rec.id, `${where}.id`, issues),
      kind: "plasma",
      label: str(rec.label, `${where}.label`, issues),
      assetId: str(rec.assetId, `${where}.assetId`, issues),
      hp: num(rec.hp, `${where}.hp`, issues, { min: 1, max: 20, int: true }),
      radius: num(rec.radius, `${where}.radius`, issues, { min: 6, max: 120 }),
      score: num(rec.score, `${where}.score`, issues, { min: 0, max: 100000 }),
      contactDamage: num(rec.contactDamage, `${where}.contactDamage`, issues, { min: 0, max: 5, int: true }),
      interaction,
      behaviors,
      split,
    };
  });
}

function parseBehaviors(raw: unknown, where: string, issues: string[]): BehaviorParams[] {
  if (!Array.isArray(raw) || raw.length < 1) {
    issues.push(`${where} חייב להכיל לפחות התנהגות אחת`);
    return [];
  }
  return raw.map((item, i) => {
    const rec = isRec(item) ? item : {};
    const key = str(rec.key, `${where}[${i}].key`, issues);
    if (key && !MOTION_BEHAVIORS.includes(key as (typeof MOTION_BEHAVIORS)[number])) {
      issues.push(
        `${where}[${i}].key התנהגות לא מוכרת: "${key}". מפתחות נתמכים: ${MOTION_BEHAVIORS.join(", ")}`,
      );
    }
    const out: BehaviorParams = { key };
    copyOpt(rec, out, "speed", `${where}[${i}].speed`, issues, { min: 0, max: 1200 });
    copyOpt(rec, out, "gravity", `${where}[${i}].gravity`, issues, { min: 0, max: 4000 });
    copyOpt(rec, out, "restitution", `${where}[${i}].restitution`, issues, { min: 0, max: 1.2 });
    copyOpt(rec, out, "period", `${where}[${i}].period`, issues, { min: 0.2, max: 10 });
    copyOpt(rec, out, "burstEveryMs", `${where}[${i}].burstEveryMs`, issues, { min: 200, max: 20000 });
    copyOpt(rec, out, "burstMs", `${where}[${i}].burstMs`, issues, { min: 50, max: 4000 });
    copyOpt(rec, out, "telegraphMs", `${where}[${i}].telegraphMs`, issues, { min: 0, max: 4000 });
    copyOpt(rec, out, "burstMul", `${where}[${i}].burstMul`, issues, { min: 1, max: 4 });
    copyOpt(rec, out, "halfRange", `${where}[${i}].halfRange`, issues, { min: 8, max: 800 });
    if (key === "bounce" && out.speed === undefined) issues.push(`${where}[${i}] bounce דורש speed`);
    if (key === "zigzag" && (out.speed === undefined || out.period === undefined)) {
      issues.push(`${where}[${i}] zigzag דורש speed ו-period`);
    }
    if (key === "pulse" && out.burstEveryMs === undefined) issues.push(`${where}[${i}] pulse דורש burstEveryMs`);
    if (key === "move_horizontal" && (out.speed === undefined || out.halfRange === undefined)) {
      issues.push(`${where}[${i}] move_horizontal דורש speed ו-halfRange`);
    }
    return out;
  });
}

function parseWeapons(raw: unknown, issues: string[]): WeaponDef[] {
  if (!Array.isArray(raw)) {
    issues.push("weapons אינו מערך");
    return [];
  }
  return raw.map((item, i) => {
    const rec = isRec(item) ? item : {};
    const where = `weapons[${i}]`;
    const behavior = str(rec.behavior, `${where}.behavior`, issues);
    if (behavior && !WEAPON_BEHAVIORS.includes(behavior as (typeof WEAPON_BEHAVIORS)[number])) {
      issues.push(`${where}.behavior לא נתמך: "${behavior}". נתמך: ${WEAPON_BEHAVIORS.join(", ")}`);
    }
    const projectile = isRec(rec.projectile) ? rec.projectile : {};
    if (!isRec(rec.projectile)) issues.push(`${where}.projectile חסר`);
    const motion = str(projectile.motion, `${where}.projectile.motion`, issues);
    if (motion && !PROJECTILE_MOTIONS.includes(motion as (typeof PROJECTILE_MOTIONS)[number])) {
      issues.push(`${where}.projectile.motion לא נתמך: "${motion}"`);
    }
    const direction = str(projectile.direction, `${where}.projectile.direction`, issues);
    if (direction && !AIM_DIRECTIONS.includes(direction as (typeof AIM_DIRECTIONS)[number])) {
      issues.push(`${where}.projectile.direction לא נתמך: "${direction}"`);
    }
    let impact: WeaponDef["projectile"]["impact"] = null;
    if (projectile.impact === null || projectile.impact === undefined) impact = null;
    else if (!isRec(projectile.impact)) issues.push(`${where}.projectile.impact אינו אובייקט או null`);
    else {
      const impactBehavior = str(projectile.impact.behavior, `${where}.impact.behavior`, issues);
      if (
        impactBehavior &&
        !IMPACT_BEHAVIORS.includes(impactBehavior as (typeof IMPACT_BEHAVIORS)[number])
      ) {
        issues.push(`${where}.impact.behavior לא נתמך: "${impactBehavior}"`);
      }
      impact = {
        behavior: impactBehavior,
        radius: num(projectile.impact.radius, `${where}.impact.radius`, issues, { min: 8, max: 400 }),
        durationMs: num(projectile.impact.durationMs, `${where}.impact.durationMs`, issues, {
          min: 50,
          max: 8000,
        }),
        factor: num(projectile.impact.factor, `${where}.impact.factor`, issues, { min: 0.05, max: 1 }),
      };
    }
    return {
      id: str(rec.id, `${where}.id`, issues),
      label: str(rec.label, `${where}.label`, issues),
      hint: str(rec.hint, `${where}.hint`, issues),
      behavior,
      cooldownMs: num(rec.cooldownMs, `${where}.cooldownMs`, issues, { min: 0, max: 20000 }),
      energyCost: num(rec.energyCost, `${where}.energyCost`, issues, { min: 0, max: 999 }),
      projectile: {
        motion,
        speed: num(projectile.speed, `${where}.projectile.speed`, issues, { min: 40, max: 2000 }),
        direction: "aim_up",
        radius: num(projectile.radius, `${where}.projectile.radius`, issues, { min: 2, max: 40 }),
        lifeMs: num(projectile.lifeMs, `${where}.projectile.lifeMs`, issues, { min: 50, max: 5000 }),
        damage: num(projectile.damage, `${where}.projectile.damage`, issues, { min: 0, max: 20 }),
        pierce: num(projectile.pierce, `${where}.projectile.pierce`, issues, { min: 1, max: 8, int: true }),
        assetId: str(projectile.assetId, `${where}.projectile.assetId`, issues),
        impact,
      },
    };
  });
}

function parseHazards(raw: unknown, issues: string[]): HazardDef[] {
  if (!Array.isArray(raw)) {
    issues.push("hazards אינו מערך");
    return [];
  }
  return raw.map((item, i) => {
    const rec = isRec(item) ? item : {};
    const where = `hazards[${i}]`;
    const behavior = str(rec.behavior, `${where}.behavior`, issues);
    if (behavior && !HAZARD_BEHAVIORS.includes(behavior as (typeof HAZARD_BEHAVIORS)[number])) {
      issues.push(`${where}.behavior לא נתמך: "${behavior}". נתמך: ${HAZARD_BEHAVIORS.join(", ")}`);
    }
    const hazard: HazardDef = {
      id: str(rec.id, `${where}.id`, issues),
      label: str(rec.label, `${where}.label`, issues),
      behavior,
      damage: num(rec.damage, `${where}.damage`, issues, { min: 0, max: 5, int: true }),
      assetId: str(rec.assetId, `${where}.assetId`, issues),
      telegraphMs: num(rec.telegraphMs, `${where}.telegraphMs`, issues, { min: 0, max: 8000 }),
      activeMs: num(rec.activeMs ?? 0, `${where}.activeMs`, issues, { min: 0, max: 20000 }),
      inactiveMs: num(rec.inactiveMs ?? 0, `${where}.inactiveMs`, issues, { min: 0, max: 20000 }),
      speed: num(rec.speed ?? 0, `${where}.speed`, issues, { min: 0, max: 2000 }),
    };
    if (behavior === "timed_barrier" && (hazard.activeMs <= 0 || hazard.inactiveMs <= 0)) {
      issues.push(`${where} timed_barrier דורש activeMs ו-inactiveMs חיוביים`);
    }
    if (behavior === "horizontal_patrol" && hazard.speed <= 0) {
      issues.push(`${where} horizontal_patrol דורש speed חיובי`);
    }
    return hazard;
  });
}

function parseArenas(raw: unknown, issues: string[]): ArenaDef[] {
  if (!Array.isArray(raw) || raw.length < 1) {
    issues.push("arenas חייב להכיל לפחות זירה אחת");
    return [];
  }
  return raw.map((item, i) => {
    const rec = isRec(item) ? item : {};
    const where = `arenas[${i}]`;
    const win = str(rec.winCondition, `${where}.winCondition`, issues);
    if (win && !WIN_CONDITIONS.includes(win as (typeof WIN_CONDITIONS)[number])) {
      issues.push(`${where}.winCondition לא נתמך: "${win}"`);
    }
    const spawn = isRec(rec.playerSpawn) ? rec.playerSpawn : {};
    const wavesRaw = Array.isArray(rec.waves) ? rec.waves : [];
    if (wavesRaw.length < 1) issues.push(`${where}.waves ריק`);
    const waves = wavesRaw.map((wave, wi) => parseWave(wave, `${where}.waves[${wi}]`, issues));
    const platforms = Array.isArray(rec.platforms)
      ? rec.platforms.map((p, pi) => parseRect(p, `${where}.platforms[${pi}]`, issues))
      : [];
    const spawnPoints = Array.isArray(rec.spawnPoints)
      ? rec.spawnPoints.map((p, pi) => {
          const point = isRec(p) ? p : {};
          return {
            x: num(point.x, `${where}.spawnPoints[${pi}].x`, issues, { min: 0, max: 4000 }),
            y: num(point.y, `${where}.spawnPoints[${pi}].y`, issues, { min: 0, max: 4000 }),
          };
        })
      : [];
    if (spawnPoints.length < 1) issues.push(`${where}.spawnPoints ריק`);
    const hazards = Array.isArray(rec.hazards)
      ? rec.hazards.map((h, hi) => {
          const place = isRec(h) ? h : {};
          const parsed: ArenaDef["hazards"][number] = {
            ref: str(place.ref, `${where}.hazards[${hi}].ref`, issues),
            x: num(place.x, `${where}.hazards[${hi}].x`, issues, { min: 0, max: 4000 }),
            y: num(place.y, `${where}.hazards[${hi}].y`, issues, { min: 0, max: 4000 }),
            w: num(place.w, `${where}.hazards[${hi}].w`, issues, { min: 4, max: 2000 }),
            h: num(place.h, `${where}.hazards[${hi}].h`, issues, { min: 4, max: 2000 }),
          };
          if (place.x2 !== undefined) {
            parsed.x2 = num(place.x2, `${where}.hazards[${hi}].x2`, issues, { min: 0, max: 4000 });
          }
          return parsed;
        })
      : [];
    return {
      id: str(rec.id, `${where}.id`, issues),
      label: str(rec.label, `${where}.label`, issues),
      blurb: str(rec.blurb, `${where}.blurb`, issues),
      width: num(rec.width, `${where}.width`, issues, { min: 320, max: 4000 }),
      height: num(rec.height, `${where}.height`, issues, { min: 240, max: 4000 }),
      playerSpawn: {
        x: num(spawn.x, `${where}.playerSpawn.x`, issues, { min: 0, max: 4000 }),
        y: num(spawn.y, `${where}.playerSpawn.y`, issues, { min: 0, max: 4000 }),
      },
      platforms,
      spawnPoints,
      waves,
      hazards,
      winCondition: "clear_all_waves",
    };
  });
}

function parseWave(raw: unknown, where: string, issues: string[]): ArenaDef["waves"][number] {
  const rec = isRec(raw) ? raw : {};
  const spawns = parseSpawns(rec.spawns, `${where}.spawns`, issues);
  if (spawns.length < 1) issues.push(`${where} בלי הופעות`);
  const events = Array.isArray(rec.events)
    ? rec.events.map((event, i) => {
        const ev = isRec(event) ? event : {};
        return {
          delayMs: num(ev.delayMs, `${where}.events[${i}].delayMs`, issues, { min: 0, max: 20000 }),
          spawns: parseSpawns(ev.spawns, `${where}.events[${i}].spawns`, issues),
        };
      })
    : [];
  return {
    banner: str(rec.banner, `${where}.banner`, issues),
    speedScale: num(rec.speedScale ?? 1, `${where}.speedScale`, issues, { min: 0.2, max: 3 }),
    spawns,
    events,
  };
}

function parseSpawns(raw: unknown, where: string, issues: string[]): { id: string; count: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const rec = isRec(item) ? item : {};
    return {
      id: str(rec.id, `${where}[${i}].id`, issues),
      count: num(rec.count, `${where}[${i}].count`, issues, { min: 1, max: 12, int: true }),
    };
  });
}

function parseRect(raw: unknown, where: string, issues: string[]) {
  const rec = isRec(raw) ? raw : {};
  return {
    x: num(rec.x, `${where}.x`, issues, { min: -100, max: 4000 }),
    y: num(rec.y, `${where}.y`, issues, { min: -100, max: 4000 }),
    w: num(rec.w, `${where}.w`, issues, { min: 8, max: 2000 }),
    h: num(rec.h, `${where}.h`, issues, { min: 4, max: 400 }),
  };
}

function copyOpt(
  src: Record<string, unknown>,
  dest: BehaviorParams,
  key: keyof BehaviorParams,
  where: string,
  issues: string[],
  bounds: { min: number; max: number },
): void {
  if (src[key] === undefined) return;
  dest[key] = num(src[key], where, issues, bounds) as never;
}

function idsOf(rows: { id: string }[]): string[] {
  return rows.map((row) => row.id).filter(Boolean);
}

function dupes(ids: string[], label: string, issues: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) issues.push(`מזהה ${label} כפול: "${id}"`);
    seen.add(id);
  }
}

function isRec(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown, where: string, issues: string[]): string {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${where} חייב להיות מחרוזת לא ריקה`);
    return "";
  }
  return value.trim();
}

function num(
  value: unknown,
  where: string,
  issues: string[],
  bounds: { min: number; max: number; int?: boolean },
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${where} חייב להיות מספר (${String(value)})`);
    return bounds.min;
  }
  if (bounds.int && !Number.isInteger(value)) issues.push(`${where} חייב להיות מספר שלם`);
  if (value < bounds.min || value > bounds.max) {
    issues.push(`${where}=${value} מחוץ לטווח ${bounds.min}..${bounds.max}`);
  }
  return value;
}
