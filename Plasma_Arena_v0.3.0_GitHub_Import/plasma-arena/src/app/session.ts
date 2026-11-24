import type { Sfx } from "../audio/sfx";
import type { Content } from "../core/types";
import type { ControlRig } from "../player/controls";
import type { Bridge } from "../ui/types";

export const session: {
  content: Content | null;
  controls: ControlRig | null;
  sfx: Sfx | null;
  bridge: Bridge | null;
} = {
  content: null,
  controls: null,
  sfx: null,
  bridge: null,
};
