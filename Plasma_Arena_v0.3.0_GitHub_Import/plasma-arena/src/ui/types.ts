import type { Strings } from "../core/types";

export type HudModel = {
  score: number;
  best: number;
  hull: number;
  maxHull: number;
  wave: number;
  waveCount: number;
  weaponLabel: string;
  weaponHint: string;
  energy: number;
  energyMax: number;
  energyOn: boolean;
  denied: boolean;
  banner: string;
  strings: Strings;
};

export type ResultModel = {
  kind: "win" | "lose";
  title: string;
  body: string;
  score: number;
  best: number;
  strings: Strings;
};

export type Bridge = {
  hud: (model: HudModel) => void;
  result: (model: ResultModel) => void;
  fatal: (message: string) => void;
  setPlaying: (playing: boolean) => void;
  cycle: ((dir: number) => void) | null;
};
