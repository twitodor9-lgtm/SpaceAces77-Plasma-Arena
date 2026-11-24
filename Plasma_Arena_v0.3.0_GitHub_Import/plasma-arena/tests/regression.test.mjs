import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assembleContent } from "../src/core/validate.ts";
import { fitSpawn, avoidsPlatforms } from "../src/core/spawnPlacement.ts";
import { applyHit, createRun } from "../src/core/runState.ts";
import { RunTelemetry } from "../src/core/telemetry.ts";
import { attachControls } from "../src/player/controls.ts";

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
const bundle = () => ({
  balance: read("balance"),
  assets: read("assets").assets,
  weapons: read("weapons").weapons,
  entities: read("entities").entities,
  hazards: read("hazards").hazards,
  arenas: [read("arenas/core_chamber"), read("arenas/relay_deck")],
});

test("duplicate IDs, fractional cap, out-of-bounds spawn and paid base weapon are rejected", () => {
  for (const change of [
    (raw) => raw.arenas.push(raw.arenas[0]),
    (raw) => { raw.balance.maxBodies = 4.1; },
    (raw) => { raw.arenas[0].spawnPoints[0].x = 961; },
    (raw) => { raw.weapons[0].energyCost = 1; },
    (raw) => { raw.entities[0].contactDamage = -1; },
  ]) {
    const raw = bundle();
    change(raw);
    assert.throws(() => assembleContent(raw));
  }
});

test("spawn keeps large bodies in bounds and identifies blocked points", () => {
  const point = fitSpawn({ x: 1, y: 539 }, 40, 960, 540);
  assert.deepEqual(point, { x: 44, y: 496 });
  assert.equal(avoidsPlatforms(point, 40, [{ x: 40, y: 480, w: 100, h: 16 }]), false);
  assert.equal(avoidsPlatforms(point, 40, [{ x: 100, y: 480, w: 100, h: 16 }]), true);
});

test("damage uses configured values including zero, and loss stays terminal", () => {
  const run = createRun("arena", 3, 3);
  assert.equal(applyHit(run, 0).run.hull, 3);
  const hit = applyHit(run, 2);
  assert.equal(hit.run.hull, 1);
  const loss = applyHit(hit.run, 2);
  assert.equal(loss.run.hull, 0);
  assert.equal(applyHit(loss.run, 2).run, loss.run);
});

test("short keyboard taps survive a frame; visibility, blur and destroy clear every input source", () => {
  const window = new EventTarget();
  window.document = new EventTarget();
  const rig = attachControls(window);
  const dispatch = (kind, code) => window.dispatchEvent(Object.assign(new Event(kind), { code }));
  dispatch("keydown", "KeyW");
  dispatch("keyup", "KeyW");
  assert.equal(rig.pressed("KeyW"), true);
  rig.endFrame();
  assert.equal(rig.pressed("KeyW"), false);
  rig.setTouch("left", true);
  rig.setKeys(["KeyD"]);
  window.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(rig.down("KeyA"), false);
  assert.equal(rig.down("KeyD"), false);
  dispatch("keydown", "KeyD");
  assert.equal(rig.down("KeyD"), true);
  window.dispatchEvent(new Event("blur"));
  assert.equal(rig.down("KeyD"), false);
  rig.setKeys(["KeyA"]);
  rig.setKeys(null);
  assert.equal(rig.down("KeyA"), false);
  rig.destroy();
  dispatch("keydown", "KeyD");
  assert.equal(rig.down("KeyD"), false);
});

test("telemetry stays bounded and keeps the terminal result", () => {
  const telemetry = new RunTelemetry("core", 100);
  for (let i = 0; i < 5001; i++) telemetry.record("shot", 100 + i);
  telemetry.record("result", 6100, { kind: "win" });
  const trace = JSON.parse(telemetry.json());
  assert.equal(trace.events.length, 5000);
  assert.equal(trace.dropped, 2);
  assert.deepEqual(trace.events.at(-1), { kind: "win", type: "result", ms: 6000 });
});
