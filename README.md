<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="Plainly icon" />
</p>

<h1 align="center">Plainly</h1>

<p align="center">
  <strong>Coded text → plain text you can read.</strong><br />
  Works on Reddit out of the box. Add any other site from the popup.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.3.0-18181b?style=flat-square" />
  <img alt="Manifest" src="https://img.shields.io/badge/manifest-V3-3f3f46?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-52525b?style=flat-square" />
  <img alt="Platform" src="https://img.shields.io/badge/Chrome-extension-27272a?style=flat-square" />
</p>

---

## Why Plainly?

Posts sometimes hide links or messages as long coded strings. **Plainly** spots them and shows the readable version right next to the code.

## Features

- **Automatic** on Reddit and any site you add
- **Quiet zinc tags** with a thin RGB edge
- **Open links** when the plain text is a web address
- **Copy** with one click on the tag
- **Add a site yourself** — paste a URL in the popup (Chrome asks for access; no GitHub PR needed)
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
4. Open Reddit (or add a site in the popup) and refresh

Pin **Plainly** from the puzzle menu.

## Use

| Action | How |
| --- | --- |
| Read plain text | Zinc tag next to a coded line |
| Open a link | Click the address in the tag |
| Copy | Click the copy icon |
| Add another website | Popup → **Sites** → paste `example.com` or a full URL → **Add** → allow access → refresh that tab |
| Remove a site | Popup → **×** next to the site |
| Turn off | Popup → **On** switch |
| Try a code | Paste it under **Try a code** |
| GitHub | Octocat icon in the popup header |

> Set your repo URL in `popup.js` (`GITHUB_URL`) when you publish.

## Develop

```bash
npm test
npm run icons
```

```text
plainly/
├── manifest.json
├── icons/
├── src/
│   ├── background.js   # registers scripts for user sites
│   ├── decoder.js
│   ├── content.js
│   └── content.css
├── popup.html / .css / .js
├── test/
└── docs (PRIVACY, SECURITY, CHANGELOG, CONTRIBUTING)
```

## Privacy & security

- No analytics or remote decode API  
- Reddit is built-in; other sites only after you approve them in Chrome  
- Storage: on/off switch + your site list  

[PRIVACY.md](./PRIVACY.md) · [SECURITY.md](./SECURITY.md) · [LICENSE](./LICENSE) (MIT)
