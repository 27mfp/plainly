/**
 * Resize icons/icon-source.jpg into Chrome extension sizes.
 * Requires: Python + Pillow  (or run: npm run icons)
 *
 * Usage: node scripts/generate-icons.js
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const py = `
from PIL import Image
from pathlib import Path

root = Path(r${JSON.stringify(root)})
src = root / "icons" / "icon-source.jpg"
if not src.exists():
    src = root / "icons" / "icon512.png"
if not src.exists():
    raise SystemExit("Missing icons/icon-source.jpg or icons/icon512.png")

out = root / "icons"
img = Image.open(src).convert("RGBA")
zinc = (24, 24, 27, 255)
bg = Image.new("RGBA", img.size, zinc)
px = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if r > 240 and g > 240 and b > 240:
            px[x, y] = zinc
composed = Image.alpha_composite(bg, img)
master = composed.resize((512, 512), Image.Resampling.LANCZOS)
master.save(out / "icon512.png")
for size in (16, 32, 48, 128):
    composed.resize((size, size), Image.Resampling.LANCZOS).save(out / f"icon{size}.png")
print("icons ok")
`;

const result = spawnSync("python", ["-c", py], {
  encoding: "utf8",
  cwd: root,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) {
  process.exit(result.status || 1);
}
