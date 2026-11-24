import type { Content } from "../core/types";
import type { ControlRig } from "../player/controls";
import type { Bridge, HudModel, ResultModel } from "./types";

export type Shell = {
  stage: HTMLElement;
  bridge: Bridge;
  onStart: (fn: (opts: { arenaId: string; energy: boolean }) => void) => void;
  onRetry: (fn: () => void) => void;
  onMenu: (fn: () => void) => void;
  destroy: () => void;
};

export function createShell(parent: HTMLElement, content: Content, controls: ControlRig): Shell {
  parent.replaceChildren();
  const style = document.createElement("style");
  style.textContent = CSS;
  const root = document.createElement("div");
  root.className = "pa-root";
  root.innerHTML = `
    <header class="pa-hud" hidden>
      <div class="pa-hud-block">
        <div class="pa-kicker"></div>
        <div class="pa-hull"></div>
      </div>
      <div class="pa-hud-block pa-center">
        <div class="pa-wave"></div>
        <div class="pa-weapon"></div>
      </div>
      <div class="pa-hud-block pa-end">
        <div class="pa-score"></div>
        <div class="pa-energy" hidden></div>
      </div>
    </header>
    <div class="pa-stage-wrap">
      <div class="pa-stage"></div>
      <div class="pa-overlay"></div>
    </div>
    <div class="pa-touch" hidden>
      <button type="button" data-hold="left">שמאל</button>
      <button type="button" data-hold="right">ימין</button>
      <button type="button" data-hold="jump">קפיצה</button>
      <button type="button" data-hold="fire">ירי</button>
      <button type="button" data-hold="next">נשק</button>
    </div>
  `;
  parent.append(style, root);
  const stage = root.querySelector(".pa-stage") as HTMLElement;
  const overlay = root.querySelector(".pa-overlay") as HTMLElement;
  const hud = root.querySelector(".pa-hud") as HTMLElement;
  const touch = root.querySelector(".pa-touch") as HTMLElement;
  const s = content.balance.strings;
  let startFn: (opts: { arenaId: string; energy: boolean }) => void = () => {};
  let retryFn = () => {};
  let menuFn = () => {};
  let arenaId = content.balance.defaultArenaId;
  let energy = false;
  let lastHud = "";

  const holdButtons = [...touch.querySelectorAll<HTMLButtonElement>("[data-hold]")];
  for (const button of holdButtons) {
    const name = button.dataset.hold as "left" | "right" | "jump" | "fire" | "next";
    const down = (event: PointerEvent) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      controls.setTouch(name, true);
    };
    const up = () => controls.setTouch(name, false);
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
  }

  const renderMenu = () => {
    overlay.innerHTML = "";
    const card = document.createElement("section");
    card.className = "pa-card";
    card.dir = "rtl";
    const arenas = content.arenas
      .map((arena) => {
        const checked = arena.id === arenaId ? "checked" : "";
        return `<label class="pa-arena"><input type="radio" name="arena" value="${escapeHtml(arena.id)}" ${checked} /><span><strong>${escapeHtml(arena.label)}</strong><small>${escapeHtml(arena.blurb)}</small></span></label>`;
      })
      .join("");
    card.innerHTML = `
      <p class="pa-kicker">${escapeHtml(s.kicker)}</p>
      <h1>${escapeHtml(s.title)}</h1>
      <p class="pa-sub">${escapeHtml(s.subtitle)}</p>
      <div class="pa-arenas">${arenas}</div>
      <label class="pa-check"><input type="checkbox" ${energy ? "checked" : ""} /><span><strong>${escapeHtml(s.energy)}</strong><small>${escapeHtml(s.energyHint)}</small></span></label>
      <button type="button" class="pa-start" id="pa-start">${escapeHtml(s.start)}</button>
      <p class="pa-help" dir="ltr">${escapeHtml(s.controls)}</p>
      <p class="pa-help">${escapeHtml(s.aimNote)}</p>
    `;
    overlay.append(card);
    card.querySelectorAll<HTMLInputElement>("input[name=arena]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) arenaId = input.value;
      });
    });
    const box = card.querySelector<HTMLInputElement>(".pa-check input");
    box?.addEventListener("change", () => {
      energy = !!box.checked;
    });
    card.querySelector("#pa-start")?.addEventListener("click", () => {
      startFn({ arenaId, energy });
    });
  };

  const renderResult = (model: ResultModel) => {
    overlay.innerHTML = "";
    const card = document.createElement("section");
    card.className = "pa-card";
    card.dir = "rtl";
    card.innerHTML = `
      <p class="pa-kicker">${model.kind === "win" ? "ניצחון" : "כישלון"}</p>
      <h1>${escapeHtml(model.title)}</h1>
      <p class="pa-sub">${escapeHtml(model.body)}</p>
      <p class="pa-scoreline"><span>${escapeHtml(model.strings.score)} ${model.score}</span><span>${escapeHtml(model.strings.best)} ${model.best}</span></p>
      <div class="pa-row">
        <button type="button" class="pa-start" id="pa-retry">${escapeHtml(model.strings.retry)}</button>
        <button type="button" class="pa-ghost" id="pa-menu">${escapeHtml(model.strings.menu)}</button>
      </div>
    `;
    overlay.append(card);
    card.querySelector("#pa-retry")?.addEventListener("click", () => retryFn());
    card.querySelector("#pa-menu")?.addEventListener("click", () => menuFn());
  };

  const bridge: Bridge = {
    cycle: null,
    hud: (model) => {
      const key = JSON.stringify(model);
      if (key === lastHud) return;
      lastHud = key;
      paintHud(root, model);
    },
    result: (model) => {
      touch.hidden = true;
      renderResult(model);
    },
    fatal: (message) => {
      hud.hidden = true;
      touch.hidden = true;
      overlay.innerHTML = `<section class="pa-card" dir="rtl"><h1>הנתונים לא נטענו</h1><pre class="pa-fatal">${escapeHtml(message)}</pre></section>`;
    },
    setPlaying: (playing) => {
      hud.hidden = !playing;
      touch.hidden = !playing;
      if (playing) overlay.innerHTML = "";
      else renderMenu();
      lastHud = "";
    },
  };

  renderMenu();

  return {
    stage,
    bridge,
    onStart: (fn) => {
      startFn = fn;
    },
    onRetry: (fn) => {
      retryFn = fn;
    },
    onMenu: (fn) => {
      menuFn = fn;
    },
    destroy: () => {
      style.remove();
      root.remove();
    },
  };
}

function paintHud(root: HTMLElement, model: HudModel): void {
  const kicker = root.querySelector(".pa-hud .pa-kicker");
  if (kicker) kicker.textContent = model.banner || model.strings.title;
  const hull = root.querySelector(".pa-hull");
  if (hull) {
    hull.replaceChildren();
    for (let i = 0; i < model.maxHull; i++) {
      const pip = document.createElement("i");
      pip.className = i < model.hull ? "on" : "off";
      pip.setAttribute("aria-hidden", "true");
      hull.append(pip);
    }
    const label = document.createElement("span");
    label.textContent = model.strings.hull;
    hull.prepend(label);
  }
  const wave = root.querySelector(".pa-wave");
  if (wave) wave.textContent = `${model.strings.wave} ${model.wave}/${model.waveCount}`;
  const weapon = root.querySelector(".pa-weapon");
  if (weapon) weapon.textContent = `${model.weaponLabel} — ${model.weaponHint}`;
  const score = root.querySelector(".pa-score");
  if (score) score.textContent = `${model.strings.score} ${model.score} · ${model.strings.best} ${model.best}`;
  const energy = root.querySelector(".pa-energy") as HTMLElement | null;
  if (energy) {
    energy.hidden = !model.energyOn;
    energy.textContent = `${model.strings.energyShort} ${Math.ceil(model.energy)}`;
    energy.classList.toggle("denied", model.denied);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CSS = `
.pa-root{position:absolute;inset:0;display:flex;flex-direction:column;background:#070910;color:#E7F2FF;font-family:"DejaVu Sans","FreeSans","Arial Hebrew",Arial,sans-serif;user-select:none;}
.pa-root [hidden]{display:none!important;}
.pa-hud{display:grid;grid-template-columns:1fr auto 1.2fr;gap:8px;align-items:center;padding:8px 12px;min-height:52px;background:#0b101b;border-bottom:1px solid #243044;}
.pa-hud-block{display:flex;flex-direction:column;gap:2px;min-width:0;}
.pa-center{align-items:center;text-align:center;}
.pa-end{align-items:flex-end;text-align:end;}
.pa-kicker{font-size:11px;letter-spacing:.14em;color:#3CF0E0;text-transform:uppercase;}
.pa-wave{font-weight:700;}
.pa-weapon{font-size:12px;color:#FFC857;max-width:280px;}
.pa-score{font-variant-numeric:tabular-nums;}
.pa-energy{font-size:12px;color:#D6FF4A;}
.pa-energy.denied{color:#FF5A36;}
.pa-hull{display:flex;gap:4px;align-items:center;font-size:12px;}
.pa-hull i{width:14px;height:14px;display:inline-block;transform:rotate(45deg);border:2px solid #FF5A36;}
.pa-hull i.on{background:#FF5A36;}
.pa-hull i.off{background:transparent;opacity:.45;}
.pa-stage-wrap{position:relative;flex:1;min-height:0;}
.pa-stage{position:absolute;inset:0;}
.pa-stage::after{content:"";position:absolute;inset:8px;border:1px solid rgba(60,240,224,.28);pointer-events:none;}
.pa-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;pointer-events:none;}
.pa-card{pointer-events:auto;width:min(480px,100%);max-height:100%;overflow:auto;background:rgba(7,10,18,.88);border:1px solid #2a6f78;border-radius:18px;padding:16px;box-sizing:border-box;touch-action:pan-y;box-shadow:0 24px 80px rgba(0,0,0,.45);}
.pa-card h1{margin:4px 0 8px;font-size:28px;letter-spacing:.08em;font-weight:800;}
.pa-sub{margin:0 0 12px;color:#c5d4ea;line-height:1.45;}
.pa-arenas{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}
.pa-arena,.pa-check{display:flex;gap:10px;align-items:flex-start;padding:8px;border:1px solid #243044;border-radius:12px;background:#101826;}
.pa-arena strong,.pa-check strong{display:block;}
.pa-arena small,.pa-check small{display:block;color:#9aabc4;line-height:1.35;}
.pa-start,.pa-ghost{font:700 16px/1 inherit;border-radius:12px;min-height:48px;padding:0 16px;cursor:pointer;}
.pa-start{width:100%;border:0;background:#D6FF4A;color:#142000;margin-top:10px;}
.pa-ghost{background:transparent;color:#E7F2FF;border:1px solid #3CF0E0;}
.pa-row{display:flex;gap:8px;}
.pa-row .pa-start{flex:1;margin-top:0;}
.pa-help{font-size:12px;color:#9aabc4;line-height:1.4;}
.pa-scoreline{display:flex;justify-content:space-between;font-weight:700;}
.pa-fatal{white-space:pre-wrap;color:#FFC857;font-size:12px;}
.pa-touch{display:grid;grid-template-columns:1.1fr 1.1fr .9fr .9fr .7fr;gap:8px;padding:8px;background:#0b101b;border-top:1px solid #243044;}
.pa-touch button{min-height:52px;border-radius:12px;border:1px solid #31445f;background:#141c2e;color:#E7F2FF;font:700 14px/1 inherit;cursor:pointer;touch-action:none;}
.pa-touch button:active{background:#24344e;border-color:#3CF0E0;}
@media (max-width:720px){
  .pa-hud{grid-template-columns:1fr 1fr;}
  .pa-end{grid-column:1 / -1;align-items:flex-start;}
  .pa-weapon{max-width:none;}
  .pa-card h1{font-size:22px;letter-spacing:.04em;}
}
`;
