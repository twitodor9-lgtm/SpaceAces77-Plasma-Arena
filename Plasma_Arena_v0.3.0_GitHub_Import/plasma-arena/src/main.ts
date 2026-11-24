import { bootPlasmaArena } from "./boot";

const mount = document.getElementById("plasma-mount");
if (!mount) {
  document.body.textContent = "[PlasmaArena] חסר #plasma-mount";
} else {
  bootPlasmaArena(mount);
}
