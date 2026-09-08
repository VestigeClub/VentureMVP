import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

test("release build removes stale files and ships only runtime assets", async () => {
  await mkdir("dist", { recursive: true });
  await writeFile("dist/private-notes.txt", "must not ship");
  execFileSync(process.execPath, ["scripts/build-site.mjs"]);
  const files = await readdir("dist", { recursive: true });
  const expected = [
    "index.html",
    "app.js",
    "planner.js",
    "styles.css",
    "assets",
    "assets/fonts",
    "assets/fonts/SpaceGrotesk.ttf",
    "assets/fonts/OFL.txt",
  ];
  assert.deepEqual(files.sort(), expected.sort());
  const html = await readFile("dist/index.html", "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
});
