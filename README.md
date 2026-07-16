<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="Plainly icon" />
</p>

<h1 align="center">Plainly</h1>

<p align="center">
  <strong>Coded text → plain text you can read.</strong><br />
  Works on Reddit out of the box. Add any other site from the popup.
</p>

<p align="center">
  <a href="https://github.com/27mfp/plainly"><img alt="GitHub" src="https://img.shields.io/badge/github-27mfp%2Fplainly-18181b?style=flat-square" /></a>
  <img alt="Version" src="https://img.shields.io/badge/version-1.3.3-18181b?style=flat-square" />
  <img alt="Manifest" src="https://img.shields.io/badge/manifest-V3-3f3f46?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-52525b?style=flat-square" />
</p>

<p align="center">
  <img src="docs/screenshot.png" alt="Plainly showing plain text tags next to coded lines" width="720" />
</p>

---

## Why Plainly?

Posts sometimes hide links or messages as long coded strings. **Plainly** spots them and shows the readable version right next to the code.

## Features

- **Automatic** on Reddit and any site you add
- **Quiet zinc tags** with a thin RGB edge
- **Open links** when the plain text is a web address
- **Copy** with one click on the tag
- **Add a site yourself** — paste a URL in the popup (Chrome asks for access)
- **Private** — nothing leaves your browser ([PRIVACY.md](./PRIVACY.md))

## Example

```text
aHR0cHM6Ly9tZWdhdHVnYS5pby8=
```

→ tag shows `https://megatuga.io/`

## Install

1. Open Chrome → `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → choose this folder
4. Open Reddit (or add a site in the popup) and **refresh** that tab

Pin **Plainly** from the puzzle menu.

Repo: [github.com/27mfp/plainly](https://github.com/27mfp/plainly)

## Use

| Action | How |
| --- | --- |
| Read plain text | Zinc tag next to a coded line |
| Open a link | Click the address in the tag |
| Copy | Click the copy icon |
| Add the page you’re on | Popup → **Add this site** (uses the site only, not the full path) → allow → **refresh** |
| Add another website | Popup → paste `example.com` or a URL → **Add** → allow → **refresh** |
| Remove a site | Popup → **×** next to the site |
| Turn off | Popup → **On** switch |
| Try a code | Paste it under **Try a code** |
| GitHub | Icon in the popup header |

## Develop

```bash
npm test
npm run icons
```

```text
plainly/
├── manifest.json
├── icons/
├── docs/screenshot.png
├── src/
│   ├── background.js
│   ├── decoder.js
│   ├── content.js
│   └── content.css
├── popup.html / .css / .js
└── test/
```

## Privacy & security

- No analytics or remote decode API  
- Reddit is built-in; other sites only after you approve them in Chrome  
- Storage: on/off switch + your site list  

[PRIVACY.md](./PRIVACY.md) · [SECURITY.md](./SECURITY.md) · [LICENSE](./LICENSE) (MIT)
