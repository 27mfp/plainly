/**
 * Build an AMO-ready zip (no Chrome-only service_worker key).
 * Usage: node scripts/package-firefox.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

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

// Prefer PowerShell Compress-Archive on Windows; fall back to tar
const isWin = process.platform === "win32";
if (isWin) {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${dist.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" }
  );
} else {
  execFileSync("tar", ["-a", "-cf", zipPath, "-C", dist, "."], {
    stdio: "inherit",
  });
}

console.log("Wrote", zipPath);
