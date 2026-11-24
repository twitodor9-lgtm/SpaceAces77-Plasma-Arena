import Phaser from "phaser";
import { makeGameConfig } from "./app/config";
import { session } from "./app/session";
import { createSfx } from "./audio/sfx";
import { clearContentCache, loadContent } from "./core/content";
import { attachControls } from "./player/controls";
import { createShell } from "./ui/shell";

export type PlasmaHandle = { destroy: (removeCanvas: boolean) => void };

export function bootPlasmaArena(parent: HTMLElement): PlasmaHandle {
  clearContentCache();
  const controls = attachControls(window);
  const sfx = createSfx();
  const unlock = () => sfx.unlock();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  let content;
  try {
    content = loadContent();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    parent.replaceChildren();
    const pre = document.createElement("pre");
    pre.textContent = message;
    pre.style.cssText = "color:#FFC857;padding:16px;white-space:pre-wrap;font-family:ui-monospace,monospace";
    parent.append(pre);
    return {
      destroy() {
        controls.destroy();
        parent.replaceChildren();
      },
    };
  }

  session.content = content;
  session.controls = controls;
  session.sfx = sfx;
  const shell = createShell(parent, content, controls);
  session.bridge = shell.bridge;
  const launch = { arenaId: content.balance.defaultArenaId, energy: false };

  const game = new Phaser.Game(makeGameConfig(shell.stage, content));

  shell.onStart((opts) => {
    sfx.unlock();
    launch.arenaId = opts.arenaId;
    launch.energy = opts.energy;
    if (game.scene.isActive("attract")) game.scene.stop("attract");
    game.scene.start("game", { ...launch });
  });
  shell.onRetry(() => {
    sfx.unlock();
    const running = game.scene.getScene("game");
    if (running?.scene.isActive()) running.scene.restart({ ...launch });
    else game.scene.start("game", { ...launch });
  });
  shell.onMenu(() => {
    if (game.scene.isActive("game")) game.scene.stop("game");
    if (!game.scene.isActive("attract")) game.scene.start("attract");
    shell.bridge.setPlaying(false);
  });

  return {
    destroy(removeCanvas: boolean) {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      game.destroy(removeCanvas);
      controls.destroy();
      shell.destroy();
      session.bridge = null;
      session.content = null;
      session.controls = null;
      session.sfx = null;
    },
  };
}