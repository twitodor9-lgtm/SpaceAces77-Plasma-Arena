import Phaser from "phaser";
import type { AssetDef } from "../core/types";

export function hexNum(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

export function paintAssets(scene: Phaser.Scene, assets: AssetDef[]): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const asset of assets) {
    if (scene.textures.exists(asset.id)) continue;
    g.clear();
    if (asset.motif === "player") drawPlayer(g, asset);
    else if (asset.shape === "circle") drawOrb(g, asset);
    else if (asset.motif === "lance") drawLance(g, asset);
    else if (asset.motif === "net") drawNet(g, asset);
    else drawSlab(g, asset);
    const w = asset.motif === "player" ? 72 : asset.motif === "lance" ? 16 : 128;
    const h = asset.motif === "player" ? 104 : asset.motif === "lance" ? 28 : 128;
    g.generateTexture(asset.id, w, h);
  }
  g.destroy();
}

function drawOrb(g: Phaser.GameObjects.Graphics, asset: AssetDef): void {
  const c = 64;
  const color = hexNum(asset.color);
  const accent = hexNum(asset.accent);
  g.fillStyle(color, 0.28);
  g.fillCircle(c, c, 62);
  g.fillStyle(color, 1);
  g.fillCircle(c, c, 46);
  g.lineStyle(4, accent, 0.9);
  g.strokeCircle(c, c, 46);
  g.fillStyle(accent, 0.95);
  g.fillCircle(c, c, 16);
  if (asset.motif === "double-ring") {
    g.lineStyle(3, accent, 0.85);
    g.strokeCircle(c, c, 30);
  } else if (asset.motif === "chevron") {
    g.lineStyle(4, accent, 1);
    g.beginPath();
    g.moveTo(44, 70);
    g.lineTo(64, 52);
    g.lineTo(84, 70);
    g.moveTo(44, 84);
    g.lineTo(64, 66);
    g.lineTo(84, 84);
    g.strokePath();
  } else if (asset.motif === "cross") {
    g.fillStyle(accent, 1);
    g.fillRect(60, 40, 8, 48);
    g.fillRect(40, 60, 48, 8);
  } else if (asset.motif === "spark") {
    g.fillStyle(accent, 1);
    g.fillTriangle(64, 34, 76, 64, 52, 64);
    g.fillTriangle(64, 94, 52, 64, 76, 64);
  } else if (asset.motif === "hex") {
    g.lineStyle(4, accent, 1);
    g.beginPath();
    const r = 22;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.strokePath();
  }
}

function drawLance(g: Phaser.GameObjects.Graphics, asset: AssetDef): void {
  g.fillStyle(hexNum(asset.color), 1);
  g.fillRoundedRect(5, 1, 6, 26, 3);
  g.fillStyle(hexNum(asset.accent), 1);
  g.fillCircle(8, 6, 3);
}

function drawNet(g: Phaser.GameObjects.Graphics, asset: AssetDef): void {
  g.lineStyle(6, hexNum(asset.color), 1);
  g.strokeCircle(64, 64, 36);
  g.lineStyle(3, hexNum(asset.accent), 0.9);
  g.strokeCircle(64, 64, 18);
  g.lineStyle(2, hexNum(asset.accent), 0.8);
  g.lineBetween(64, 30, 64, 98);
  g.lineBetween(30, 64, 98, 64);
}

function drawSlab(g: Phaser.GameObjects.Graphics, asset: AssetDef): void {
  const color = hexNum(asset.color);
  const accent = hexNum(asset.accent);
  if (asset.motif === "platform") {
    g.fillStyle(color, 1);
    g.fillRect(0, 0, 128, 128);
    g.fillStyle(accent, 1);
    g.fillRect(0, 0, 128, 22);
    g.fillStyle(0x070910, 0.28);
    g.fillRect(16, 48, 14, 40);
    g.fillRect(56, 48, 14, 40);
    g.fillRect(96, 48, 14, 40);
    return;
  }
  g.fillStyle(color, 1);
  if (asset.motif === "barrier") {
    g.fillRect(56, 8, 16, 112);
    g.fillStyle(accent, 1);
    g.fillTriangle(64, 28, 74, 48, 54, 48);
    return;
  }
  g.fillRect(8, 56, 112, 16);
  g.fillStyle(accent, 1);
  g.fillTriangle(108, 64, 92, 54, 92, 74);
}

function drawPlayer(g: Phaser.GameObjects.Graphics, asset: AssetDef): void {
  const suit = hexNum(asset.color);
  const visor = hexNum(asset.accent);
  g.fillStyle(0x1a2436, 1);
  g.fillRoundedRect(18, 78, 14, 18, 3);
  g.fillRoundedRect(40, 78, 14, 18, 3);
  g.fillStyle(visor, 0.9);
  g.fillCircle(22, 92, 3);
  g.fillCircle(50, 92, 3);
  g.fillStyle(suit, 1);
  g.fillRoundedRect(16, 36, 40, 46, 10);
  g.fillStyle(0xff3d8a, 1);
  g.fillRoundedRect(30, 48, 12, 18, 3);
  g.fillStyle(0xc5d4ea, 1);
  g.fillCircle(36, 22, 16);
  g.fillStyle(0x101826, 1);
  g.fillRoundedRect(24, 16, 24, 14, 6);
  g.fillStyle(visor, 1);
  g.fillRoundedRect(27, 19, 18, 6, 3);
  g.fillStyle(0x8fa3c8, 1);
  g.fillRoundedRect(12, 42, 8, 22, 3);
  g.fillRoundedRect(52, 42, 8, 22, 3);
}
