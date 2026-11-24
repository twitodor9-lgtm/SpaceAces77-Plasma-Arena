export const MOTION_BEHAVIORS = ["bounce", "zigzag", "pulse", "move_horizontal"] as const;
export const WEAPON_BEHAVIORS = ["projectile"] as const;
export const PROJECTILE_MOTIONS = ["straight"] as const;
export const IMPACT_BEHAVIORS = ["area_slow"] as const;
export const HAZARD_BEHAVIORS = ["timed_barrier", "horizontal_patrol"] as const;
export const INTERACTIONS = ["normal", "resist_slow", "brittle"] as const;
export const MOTIFS = [
  "double-ring",
  "chevron",
  "cross",
  "spark",
  "hex",
  "lance",
  "net",
  "barrier",
  "beam",
  "platform",
  "player",
] as const;
export const SHAPES = ["circle", "line", "ring", "rect", "player"] as const;
export const WIN_CONDITIONS = ["clear_all_waves"] as const;
export const AIM_DIRECTIONS = ["aim_up"] as const;

export type MotionKey = (typeof MOTION_BEHAVIORS)[number];
