import Phaser from "phaser";
import { hexNum } from "../assets/draw";
import type { ArenaDef, Content, HazardDef, HazardPlacement } from "../core/types";

export type LiveHazard = {
  def: HazardDef;
  place: HazardPlacement;
  phase: "telegraph" | "active" | "idle";
  elapsed: number;
  hot: boolean;
  armed: boolean;
  x: number;
  dir: number;
  gfx: Phaser.GameObjects.Graphics;
};

export type HazardSystem = {
  list: LiveHazard[];
  update: (dt: number) => void;
  hotRects: () => { x: number; y: number; w: number; h: number }[];
  overlapPlayer: (x: number, y: number, hw: number, hh: number) => LiveHazard | null;
};

export function createHazardSystem(
  scene: Phaser.Scene,
  content: Content,
  arena: ArenaDef,
  onPhase: (id: string, phase: LiveHazard["phase"]) => void,
): HazardSystem {
  const list: LiveHazard[] = arena.hazards.map((place) => {
    const def = content.hazardById.get(place.ref);
    if (!def) throw new Error(`[PlasmaArena] מכשול חסר בזמן ריצה: "${place.ref}"`);
    return {
      def,
      place,
      phase: def.behavior === "horizontal_patrol" ? "idle" : "telegraph",
      elapsed: 0,
      hot: false,
      armed: true,
      x: place.x,
      dir: (place.x2 ?? place.x) >= place.x ? 1 : -1,
      gfx: scene.add.graphics().setDepth(2),
    };
  });

  const draw = (hazard: LiveHazard, nowBlink: number) => {
    const g = hazard.gfx;
    g.clear();
    const color = hexNum(content.assetById.get(hazard.def.assetId)?.color ?? "#FF5A36");
    const accent = hexNum(content.assetById.get(hazard.def.assetId)?.accent ?? "#FFFFFF");
    const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(nowBlink / 50));
    if (hazard.def.behavior === "timed_barrier") {
      const x = hazard.place.x;
      const y = hazard.place.y;
      const w = hazard.place.w;
      const h = hazard.place.h;
      if (hazard.phase === "idle") {
        g.lineStyle(2, color, 0.35);
        g.strokeRect(x, y, w, h);
        g.lineStyle(2, accent, 0.25);
        for (let yy = y + 8; yy < y + h; yy += 16) g.lineBetween(x, yy, x + w, yy);
      } else if (hazard.phase === "telegraph") {
        g.lineStyle(3, accent, blink);
        g.strokeRect(x - 3, y, w + 6, h);
        g.fillStyle(accent, blink);
        g.fillTriangle(x + w / 2, y - 16, x + w / 2 + 8, y - 2, x + w / 2 - 8, y - 2);
        g.fillRect(x + w / 2 - 1.5, y - 14, 3, 7);
      } else {
        g.fillStyle(color, 0.88);
        g.fillRect(x, y, w, h);
        g.lineStyle(2, accent, 0.9);
        for (let yy = y - 20; yy < y + h + 20; yy += 12) {
          g.lineBetween(x, yy, x + w, yy + 10);
        }
        g.lineStyle(3, 0xffffff, 0.8);
        g.strokeRect(x, y, w, h);
      }
      return;
    }

    const y = hazard.place.y;
    const w = hazard.place.w;
    const h = hazard.place.h;
    const x = hazard.x;
    const alpha = hazard.phase === "telegraph" ? blink : hazard.phase === "active" ? 1 : 0.4;
    g.fillStyle(color, hazard.phase === "idle" ? 0.25 : 0.9 * alpha);
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(2, accent, alpha);
    g.strokeRoundedRect(x, y, w, h, 4);
    const midY = y + h / 2;
    const tip = hazard.dir >= 0 ? x + w + 10 : x - 10;
    const base = hazard.dir >= 0 ? x + w - 2 : x + 2;
    g.fillStyle(accent, alpha);
    g.fillTriangle(tip, midY, base, midY - 7, base, midY + 7);
    if (hazard.phase === "telegraph") {
      g.fillTriangle(x + w / 2, y - 16, x + w / 2 + 7, y - 3, x + w / 2 - 7, y - 3);
    }
  };

  return {
    list,
    update: (dt) => {
      const now = scene.time.now;
      for (const hazard of list) {
        const previous = hazard.phase;
        hazard.elapsed += dt * 1000;
        if (hazard.def.behavior === "timed_barrier") {
          const limit =
            hazard.phase === "telegraph"
              ? hazard.def.telegraphMs
              : hazard.phase === "active"
                ? hazard.def.activeMs
                : hazard.def.inactiveMs;
          if (hazard.elapsed >= limit) {
            hazard.elapsed = 0;
            hazard.phase = hazard.phase === "telegraph" ? "active" : hazard.phase === "active" ? "idle" : "telegraph";
            if (hazard.phase !== "active") hazard.armed = true;
          }
          hazard.hot = hazard.phase === "active";
        } else {
          const left = Math.min(hazard.place.x, hazard.place.x2 ?? hazard.place.x);
          const right = Math.max(hazard.place.x, hazard.place.x2 ?? hazard.place.x);
          if (hazard.phase === "idle" && hazard.elapsed >= hazard.def.inactiveMs) {
            hazard.phase = "telegraph";
            hazard.elapsed = 0;
          } else if (hazard.phase === "telegraph" && hazard.elapsed >= hazard.def.telegraphMs) {
            hazard.phase = "active";
            hazard.elapsed = 0;
            hazard.armed = true;
          } else if (hazard.phase === "active") {
            hazard.x += hazard.dir * hazard.def.speed * dt;
            const edge = hazard.dir > 0 ? right : left;
            if ((hazard.dir > 0 && hazard.x >= edge) || (hazard.dir < 0 && hazard.x <= edge)) {
              hazard.x = edge;
              hazard.dir *= -1;
              hazard.phase = "idle";
              hazard.elapsed = 0;
              hazard.armed = true;
            }
          }
          hazard.hot = hazard.phase === "active";
        }
        if (hazard.phase !== previous) onPhase(hazard.def.id, hazard.phase);
        draw(hazard, now);
      }
    },
    hotRects: () =>
      list
        .filter((hazard) => hazard.hot)
        .map((hazard) => ({
          x: hazard.def.behavior === "timed_barrier" ? hazard.place.x : hazard.x,
          y: hazard.place.y,
          w: hazard.place.w,
          h: hazard.place.h,
        })),
    overlapPlayer: (x, y, hw, hh) => {
      for (const hazard of list) {
        if (!hazard.hot || !hazard.armed || !hazard.def.damage) continue;
        const rx = hazard.def.behavior === "timed_barrier" ? hazard.place.x : hazard.x;
        const ry = hazard.place.y;
        if (x + hw > rx && x - hw < rx + hazard.place.w && y + hh > ry && y - hh < ry + hazard.place.h) {
          return hazard;
        }
      }
      return null;
    },
  };
}
