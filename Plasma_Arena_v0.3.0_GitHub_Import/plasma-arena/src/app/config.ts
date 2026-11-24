import Phaser from "phaser";
import type { Content } from "../core/types";
import { AttractScene } from "./attractScene";
import { GameScene } from "./gameScene";

export function makeGameConfig(parent: HTMLElement, content: Content): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#070910",
    width: content.balance.arenaSize.width,
    height: content.balance.arenaSize.height,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: content.balance.arenaSize.width,
      height: content.balance.arenaSize.height,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [AttractScene, GameScene],
    banner: false,
    input: { keyboard: true, touch: true, mouse: true },
  };
}
