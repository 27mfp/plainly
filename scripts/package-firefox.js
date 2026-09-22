/**
 * Build an AMO-ready zip (no Chrome-only service_worker key).
 * Usage: node scripts/package-firefox.js
 */
const fs = require("fs");
const path = require("path");
const yazl = require("yazl");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist-firefox");
const version = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8")
).version;
const zipName = `plainly-${version}-firefox.zip`;
const zipPath = path.join(root, zipName);

function rm(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function addZipFiles(zip, dir, prefix = "") {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const from = path.join(dir, ent.name);
    const archivePath = path.posix.join(prefix, ent.name);
    if (ent.isDirectory()) addZipFiles(zip, from, archivePath);
    else zip.addFile(from, archivePath);
  }
}

rm(dist);
fs.mkdirSync(dist, { recursive: true });

// Files shipped to AMO
for (const f of [
  "popup.html",
  "popup.js",
  "popup.css",
  "LICENSE",
  "PRIVACY.md",
]) {
  fs.copyFileSync(path.join(root, f), path.join(dist, f));
}
copyDir(path.join(root, "src"), path.join(dist, "src"));
copyDir(path.join(root, "icons"), path.join(dist, "icons"));
const sourceIcon = path.join(dist, "icons", "icon-source.jpg");
if (fs.existsSync(sourceIcon)) fs.unlinkSync(sourceIcon);

// Firefox-only background: scripts (event page), not service_worker
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8")
);
manifest.background = { scripts: ["src/background.js"] };
fs.writeFileSync(
  path.join(dist, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

rm(zipPath);

// Write ZIP entry names explicitly with POSIX separators, as required by AMO.
const zip = new yazl.ZipFile();
const output = fs.createWriteStream(zipPath);
zip.outputStream.pipe(output);
addZipFiles(zip, dist);
zip.end();

output.on("close", () => console.log("Wrote", zipPath));
