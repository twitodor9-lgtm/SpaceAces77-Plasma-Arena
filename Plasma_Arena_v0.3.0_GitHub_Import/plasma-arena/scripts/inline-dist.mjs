import { readFile, writeFile } from "node:fs/promises";

const htmlPath = new URL("../dist/index.html", import.meta.url);
const bundle = await readFile(new URL("./game.js", htmlPath), "utf8");
const html = await readFile(htmlPath, "utf8");
const entry = /<script\b[^>]*\bsrc="\.\/game\.js"[^>]*><\/script>/;
if (!entry.test(html)) throw new Error("Vite output has no game.js entry");
const offline = html.replace(entry, "").replace("</body>", () => `<script>${bundle.replace(/<\/script/gi, "<\\/script")}</script>\n</body>`);
await writeFile(new URL("./Plasma_Arena.html", htmlPath), offline);
