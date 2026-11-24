export type ControlRig = {
  down: (code: string) => boolean;
  pressed: (code: string) => boolean;
  setTouch: (name: "left" | "right" | "jump" | "fire" | "prev" | "next", held: boolean) => void;
  setKeys: (codes: string[] | null) => void;
  clear: () => void;
  endFrame: () => void;
  destroy: () => void;
};

const TOUCH_CODES = {
  left: "KeyA",
  right: "KeyD",
  jump: "KeyW",
  fire: "KeyJ",
  prev: "KeyQ",
  next: "KeyE",
} as const;

export function attachControls(target: Window): ControlRig {
  const keys = new Set<string>();
  const touch = new Set<string>();
  let override: Set<string> | null = null;
  const edges = new Set<string>();
  let prev = new Set<string>();

  const block = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  const onDown = (event: KeyboardEvent) => {
    if (!override && !event.repeat && !keys.has(event.code)) edges.add(event.code);
    keys.add(event.code);
    if (block.has(event.code)) event.preventDefault();
  };
  const onUp = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };
  const clear = () => {
    keys.clear();
    touch.clear();
    override = null;
    prev.clear();
    edges.clear();
  };

  target.addEventListener("keydown", onDown);
  target.addEventListener("keyup", onUp);
  target.addEventListener("blur", clear);
  target.document.addEventListener("visibilitychange", clear);

  const active = () => {
    if (override) return override;
    if (touch.size === 0) return keys;
    const mixed = new Set(keys);
    for (const code of touch) mixed.add(code);
    return mixed;
  };

  return {
    down: (code) => active().has(code),
    pressed: (code) => edges.has(code) || (active().has(code) && !prev.has(code)),
    setTouch: (name, held) => {
      const code = TOUCH_CODES[name];
      if (held) {
        if (!override && !touch.has(code)) edges.add(code);
        touch.add(code);
      }
      else touch.delete(code);
    },
    setKeys: (codes) => {
      override = codes === null ? null : new Set(codes);
      edges.clear();
      prev.clear();
    },
    clear,
    endFrame: () => {
      prev = new Set(active());
      edges.clear();
    },
    destroy: () => {
      target.removeEventListener("keydown", onDown);
      target.removeEventListener("keyup", onUp);
      target.removeEventListener("blur", clear);
      target.document.removeEventListener("visibilitychange", clear);
      clear();
    },
  };
}
