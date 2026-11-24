"""Keyboard-only combat playthrough. The probe is read-only in this test."""
import json
import os
import time

from playwright.sync_api import sync_playwright

from browser_qa import QA, ROOT, URL, events, probe, start

SAMPLE = """() => {
  const p = window.__controlsTest;
  return { x: p.getX(), y: p.getY(), phase: p.getPhase(), targets: p.getTargets() };
}"""


def play(page, arena):
    page.goto(URL + "?qa")
    start(page, arena)
    platforms = json.loads((ROOT / f"data/arenas/{arena}.json").read_text())["platforms"]
    page.keyboard.down("KeyJ")
    current_key = None
    deadline = time.monotonic() + 100
    while time.monotonic() < deadline:
        frame = page.evaluate(SAMPLE)
        if frame["phase"] in ("won", "lost"):
            break
        x, y = frame["x"], frame["y"]
        plan = []
        for target in frame["targets"]:
            if y - target["y"] < 20:
                continue
            travel = (y - target["y"]) / 900
            aim = min(936, max(24, target["x"] + target["vx"] * travel))
            blocked = any(p["x"] < aim < p["x"] + p["w"] and target["y"] < p["y"] < y - 25
                          for p in platforms)
            if not blocked:
                plan.append((abs(aim - x), aim))
        if plan:
            destination = min(plan)[1]
            move = -1 if destination < x - 19 else 1 if destination > x + 19 else 0
        else:
            move = -1 if x > 500 else 1
        key = "ArrowLeft" if move < 0 else "ArrowRight" if move > 0 else None
        if key != current_key:
            if current_key:
                page.keyboard.up(current_key)
            if key:
                page.keyboard.down(key)
            current_key = key
        page.wait_for_timeout(70)
    page.keyboard.up("KeyJ")
    if current_key:
        page.keyboard.up(current_key)
    trace = events(page)
    (QA / f"{arena}-keyboard.json").write_text(probe(page, "exportTelemetry"), encoding="utf8")
    page.screenshot(path=QA / f"06-{arena}-keyboard.png")
    outcome = {kind: sum(e["type"] == kind for e in trace)
               for kind in ("shot", "split", "pop", "hit", "wave")}
    result = next((e for e in trace if e["type"] == "result"), None)
    print(arena, outcome, result, flush=True)
    assert outcome["split"] > 0 and outcome["pop"] > 0, outcome


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.getenv("CHROMIUM", "/usr/bin/chromium"),
                                            args=["--no-sandbox", "--disable-webgl"])
        page = browser.new_context(offline=True, viewport={"width": 1100, "height": 720}).new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        for arena in ("core_chamber", "relay_deck"):
            play(page, arena)
        assert not errors, errors
