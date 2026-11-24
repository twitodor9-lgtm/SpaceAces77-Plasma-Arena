"""Touchscreen emulation in an isolated Chromium process."""
import os

from playwright.sync_api import sync_playwright

from browser_qa import QA, URL, probe, wait_phase

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM", "/usr/bin/chromium"),
                                 args=["--no-sandbox", "--disable-webgl"])
    mobile = browser.new_context(offline=True, has_touch=True, is_mobile=True, viewport={"width": 844, "height": 390})
    page = mobile.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL + "?qa")
    page.locator("#pa-start").tap()
    wait_phase(page, "fighting")
    page.wait_for_timeout(300)
    cdp = mobile.new_cdp_session(page)

    def hold(name):
        box = page.locator(f'[data-hold="{name}"]').bounding_box()
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [
            {"x": box["x"] + box["width"] / 2, "y": box["y"] + box["height"] / 2}
        ]})

    prev_x = probe(page, "getX")
    hold("left")
    page.wait_for_function("(x) => window.__controlsTest.getX() < x - 12", arg=prev_x, timeout=4000)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
    page.wait_for_function("window.__controlsTest.getSpeed() === 0")
    page.locator('[data-hold="next"]').tap()
    page.wait_for_function("document.querySelector('.pa-weapon').textContent.includes('רשת דופק')")
    page.locator('[data-hold="fire"]').tap()
    page.wait_for_function("JSON.parse(window.__controlsTest.exportTelemetry()).events.some(e => e.type === 'shot' && e.id === 'pulse_net')")
    page.screenshot(path=QA / "05-touch.png")
    assert not errors, errors
    print("PASS: touch Start, movement hold/cancel, weapon selection and fire")
