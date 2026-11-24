"""Build and play an extension fixture from JSON changes only, in a temporary copy."""
import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def read(root, name):
    return json.loads((root / "data" / f"{name}.json").read_text())


def write(root, name, data):
    (root / "data" / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2))


def main():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "plasma-arena"
        shutil.copytree(ROOT, root, ignore=shutil.ignore_patterns("node_modules", "dist", "__pycache__"))
        (root / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
        entities = read(root, "entities")
        plasma = copy.deepcopy(entities["entities"][0])
        plasma.update(id="qa_plasma", label="QA Plasma", contactDamage=2)
        entities["entities"].append(plasma)
        write(root, "entities", entities)
        weapons = read(root, "weapons")
        lance = copy.deepcopy(weapons["weapons"][0])
        lance.update(id="qa_lance", label="QA Lance")
        weapons["weapons"].append(lance)
        write(root, "weapons", weapons)
        hazards = read(root, "hazards")
        gate = copy.deepcopy(hazards["hazards"][0])
        gate.update(id="qa_gate", label="QA Gate", damage=0)
        hazards["hazards"].append(gate)
        write(root, "hazards", hazards)
        balance = read(root, "balance")
        balance["maxBodies"] = 4
        balance["weaponsOrder"].append("qa_lance")
        write(root, "balance", balance)
        arena = read(root, "arenas/core_chamber")
        arena.update(id="qa_deck", label="QA Deck")
        arena["hazards"][0]["ref"] = "qa_gate"
        arena["waves"].insert(0, {"banner": "QA Wave", "spawns": [{"id": "qa_plasma", "count": 6}]})
        write(root, "arenas/qa_deck", arena)
        subprocess.run(["npm", "run", "build"], cwd=root, check=True)

        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM", "/usr/bin/chromium"),
                                         args=["--no-sandbox", "--disable-webgl"])
            page = browser.new_context(offline=True).new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto((root / "dist/Plasma_Arena.html").as_uri() + "?qa")
            page.locator('input[value="qa_deck"]').check()
            page.locator("#pa-start").click()
            page.wait_for_function("window.__controlsTest?.getAlive() === 1")
            page.keyboard.press("Digit3")
            page.keyboard.press("KeyJ", delay=100)
            trace = json.loads(page.evaluate("window.__controlsTest.exportTelemetry()"))
            assert trace["arenaId"] == "qa_deck" and not errors, (trace, errors)
            assert any(e["type"] == "spawn" and e["id"] == "qa_plasma" for e in trace["events"])
            assert any(e["type"] == "shot" and e["id"] == "qa_lance" for e in trace["events"])
            assert "1/4" in page.locator(".pa-wave").inner_text()
            assert any(e["type"] == "hazard" and e["id"] == "qa_gate" for e in trace["events"])
            page.wait_for_function("window.__controlsTest.getAlive() === 4")
            page.wait_for_timeout(1000)
            assert page.evaluate("window.__controlsTest.getPhase()") == "fighting"
            roots = "JSON.parse(window.__controlsTest.exportTelemetry()).events.filter(e => e.type === 'spawn' && e.generation === 0).length"
            assert page.evaluate(roots) == 4
            page.evaluate("window.__controlsTest.popTargets()")
            page.wait_for_timeout(200)
            page.evaluate("window.__controlsTest.popTargets()")
            page.wait_for_timeout(200)
            page.evaluate("window.__controlsTest.popTargets()")
            page.wait_for_function(f"({roots}) === 6")
            print("PASS: two scheduled bodies wait at cap and appear when space clears")
            print("PASS: JSON-only arena, entity, extra wave, weapon and hazard reference loaded offline")


if __name__ == "__main__":
    main()
