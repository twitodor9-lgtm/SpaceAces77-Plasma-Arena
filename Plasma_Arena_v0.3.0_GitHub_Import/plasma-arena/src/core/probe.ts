export type ControlsProbe = {
  getX: () => number;
  getY: () => number;
  getSpeed: () => number;
  getYaw: () => number;
  setKeys: (codes: string[] | null) => void;
  setSteer?: (value: number) => void;
  getPhase: () => string;
  getHull: () => number;
  getWave: () => number;
  getAlive: () => number;
  exportTelemetry: () => string;
  getTargets: () => { x: number; y: number; vx: number; vy: number; radius: number }[];
  damagePlayer: (damage: number) => void;
  popTargets: () => void;
  getScore: () => number;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}
