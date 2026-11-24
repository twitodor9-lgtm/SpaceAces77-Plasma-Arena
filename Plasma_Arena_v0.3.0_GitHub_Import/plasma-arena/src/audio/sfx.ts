export type Sfx = {
  unlock: () => void;
  shoot: () => void;
  net: () => void;
  pop: (big: boolean) => void;
  hurt: () => void;
  wave: () => void;
  win: () => void;
  lose: () => void;
  warn: () => void;
  dry: () => void;
};

export function createSfx(): Sfx {
  let ctx: AudioContext | null = null;
  const ensure = () => {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };
  const tone = (freq: number, dur: number, type: OscillatorType, gain = 0.045, slide = 0) => {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) {
      o.frequency.exponentialRampToValueAtTime(Math.max(48, freq + slide), c.currentTime + dur);
    }
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  };
  return {
    unlock: () => {
      ensure();
    },
    shoot: () => tone(680, 0.06, "square", 0.035, 220),
    net: () => tone(240, 0.16, "sawtooth", 0.04, -90),
    pop: (big) => tone(big ? 160 : 480, big ? 0.12 : 0.08, "triangle", 0.05, big ? 30 : 260),
    hurt: () => tone(96, 0.18, "sawtooth", 0.05, -50),
    wave: () => tone(540, 0.1, "square", 0.04, 180),
    win: () => {
      tone(523, 0.1, "square", 0.045);
      window.setTimeout(() => tone(659, 0.1, "square", 0.045), 110);
      window.setTimeout(() => tone(784, 0.18, "square", 0.05), 220);
    },
    lose: () => tone(150, 0.28, "triangle", 0.05, -70),
    warn: () => tone(860, 0.05, "square", 0.03),
    dry: () => tone(80, 0.05, "square", 0.03),
  };
}
