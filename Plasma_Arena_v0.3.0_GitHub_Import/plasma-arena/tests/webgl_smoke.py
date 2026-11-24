"""Smoke-test the default rendering path and the ordinary no-query offline page."""
import os
from playwright.sync_api import sync_playwright
from browser_qa import QA, URL

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM", "/usr/bin/chromium"),
                                 args=["--no-sandbox", "--enable-unsafe-swiftshader",
                                       "--use-gl=angle", "--use-angle=swiftshader"])
    page = browser.new_context(offline=True, viewport={"width": 960, "height": 640}).new_page()
    errors, network = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("request", lambda req: network.append(req.url) if req.url.startswith(("http:", "https:")) else None)
    page.goto(URL)
    page.locator("#pa-start").click()
    page.wait_for_function("document.querySelector('.pa-hud .pa-kicker').textContent.includes('גל 1')")
    assert page.evaluate("typeof window.__controlsTest") == "undefined"
    assert page.locator("canvas").evaluate("(canvas) => !!canvas.getContext('webgl')")
    assert not errors and not network, (errors, network)
    page.screenshot(path=QA / "07-webgl.png")
    print("PASS: default WebGL, offline HTML without query parameters, first wave, no remote requests or errors")
