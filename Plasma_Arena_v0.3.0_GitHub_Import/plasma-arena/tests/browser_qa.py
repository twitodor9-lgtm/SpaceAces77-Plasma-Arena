""" Chromium QA. Run after npm run build with Python Playwright and Chromium installed. """
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT / "dist/Plasma_Arena.html").as_uri()
QA = ROOT.parent / "qa"
QA.mkdir(exist_ok=True)


def probe(page, method):
    return page.evaluate(f"window.__controlsTest?.{method}()")


def events(page):
    return json.loads(probe(page, "exportTelemetry"))["events"]


def wait_phase(page, value):
    page.wait_for_function("(phase) => window.__controlsTest?.getPhase() === phase", arg=value)


def start(page, arena):
    page.locator(f'input[value="{arena}"]').check()
    page.locator("#pa-start").click()
    page.wait_for_function("!!window.__controlsTest")


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.getenv("CHROMIUM", "/usr/bin/chromium"),
                                            args=["--no-sandbox", "--disable-webgl"])
        ctx = browser.new_context(offline=True, viewport={"width": 1120, "height": 740})
        page = ctx.new_page()
        errors, remote = [], []
        page.on("pageerror", lambda error: (errors.append(str(error)), print(error.stack, flush=True)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("request", lambda req: remote.append(req.url) if req.url.startswith(("http:", "https:")) else None)
        page.goto(URL + "?qa&boxes")
        page.screenshot(path=QA / "01-menu.png")
        for arena in ("core_chamber", "relay_deck"):
            start(page, arena)
            page.wait_for_timeout(450)
            x, y = probe(page, "getX"), probe(page, "getY")
            page.keyboard.down("ArrowLeft")
            page.wait_for_timeout(380)
            page.keyboard.up("ArrowLeft")
            left = probe(page, "getX")
            assert left < x - 12, (left, x)
            page.keyboard.down("ArrowRight")
            page.wait_for_timeout(380)
            page.keyboard.up("ArrowRight")
            assert probe(page, "getX") > left + 12, (left, probe(page, "getX"), probe(page, "getY"), events(page))
            page.keyboard.press("Space")
            page.wait_for_timeout(220)
            assert probe(page, "getY") < y - 10
            page.keyboard.press("Digit2")
            page.keyboard.press("KeyJ", delay=100)
            page.wait_for_function("window.__controlsTest && JSON.parse(window.__controlsTest.exportTelemetry()).events.some(e => e.type === 'net')")
            page.keyboard.press("Digit1")
            page.keyboard.down("KeyJ")
            page.wait_for_timeout(400)
            page.keyboard.up("KeyJ")
            page.keyboard.down("ArrowLeft")
            page.evaluate("window.dispatchEvent(new Event('blur'))")
            page.wait_for_timeout(120)
            assert probe(page, "getSpeed") == 0
            page.keyboard.up("ArrowLeft")
            page.screenshot(path=QA / f"02-{arena}-play.png")
            natural = events(page)
            print(arena, "real input:", {key: sum(e['type'] == key for e in natural)
                                           for key in ("shot", "net", "split", "hit")}, flush=True)

            # Controlled exercise of live scene waves; bypasses aim only.
            for _ in range(100):
                if probe(page, "getPhase") in ("won", "lost"):
                    break
                page.evaluate("window.__controlsTest.popTargets()")
                page.wait_for_timeout(220)
            wait_phase(page, "won")
            trace = events(page)
            assert [e['wave'] for e in trace if e['type'] == 'wave'] == [1, 2, 3]
            assert {e['generation'] for e in trace if e['type'] == 'spawn'} >= {0, 1, 2}
            for spawn in (e for e in trace if e['type'] == 'spawn' and e['generation'] == 0):
                assert any(e['type'] == 'telegraph' and e['id'] == spawn['id']
                           and (e['x'], e['y']) == (spawn['x'], spawn['y'])
                           and spawn['ms'] - e['ms'] >= 680 for e in trace)
            assert trace[-1]["kind"] == "win"
            (QA / f"{arena}-win.json").write_text(probe(page, "exportTelemetry"), encoding="utf8")
            page.screenshot(path=QA / f"03-{arena}-win.png")
            page.locator("#pa-retry").click()
            wait_phase(page, "fighting")
            assert probe(page, "getWave") == 0 and probe(page, "getHull") == 3
            page.evaluate("window.__controlsTest.damagePlayer(2)")
            assert probe(page, "getHull") == 1
            page.evaluate("window.__controlsTest.damagePlayer(2)")
            assert probe(page, "getHull") == 1
            page.wait_for_timeout(1100)
            page.evaluate("window.__controlsTest.damagePlayer(1)")
            wait_phase(page, "lost")
            frozen = probe(page, "exportTelemetry")
            page.wait_for_timeout(800)
            assert probe(page, "exportTelemetry") == frozen
            page.screenshot(path=QA / f"04-{arena}-lose.png")
            page.locator("#pa-menu").click()
            page.wait_for_function("!window.__controlsTest")
            print(arena, "controlled: three waves, win, retry, damage, i-frames, frozen loss, menu PASS", flush=True)
        assert not errors and not remote, (errors, remote)
        print("PASS: offline file:// in both arenas with zero HTTP requests and console errors")


if __name__ == "__main__":
    main()
