<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="Plainly" />
</p>

<h1 align="center">Plainly</h1>

<p align="center">
  <strong>Coded text → plain text you can read.</strong><br />
  Works on Reddit right away. Add other websites from the menu.
</p>

<p align="center">
  <a href="./README.pt-PT.md">Português (PT)</a>
  ·
  <a href="https://github.com/27mfp/plainly"><img alt="GitHub" src="https://img.shields.io/badge/github-27mfp%2Fplainly-18181b?style=flat-square" /></a>
  <img alt="Version" src="https://img.shields.io/badge/version-1.6.0-18181b?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-52525b?style=flat-square" />
</p>

<p align="center">
  <img src="docs/demo-v2.png" alt="Coded lines decoded to Google, YouTube, and this repo" width="720" />
</p>

---

## What it does

Some posts hide links or messages as long coded strings. **Plainly** finds them and shows the readable version next to the code.

- Works automatically on Reddit  
- You can add more sites yourself, or use **Paste sites** for common list pages (rentry, pastebin, FMHY, …)  
- If the plain text is a link, you can open it  
- Copy with one click  
- Nested codes are unwrapped when needed  
- Nothing is sent to any server — see [PRIVACY.md](./PRIVACY.md)

## Example

This project’s own page, as coded text:

```text
aHR0cHM6Ly9naXRodWIuY29tLzI3bWZwL3BsYWlubHk=
```

Plainly shows: [`https://github.com/27mfp/plainly`](https://github.com/27mfp/plainly)

## Install

### Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`)  
2. Turn on **Developer mode**  
3. Click **Load unpacked** and pick this folder  
4. Open Reddit (or a site you added) and **refresh** the tab  

Pin Plainly from the extensions puzzle menu if you want the icon always visible.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`  
2. Click **Load Temporary Add-on…**  
3. Pick `manifest.json` in this folder  
4. Open Reddit (or a site you added) and **refresh** the tab  

Temporary add-ons are removed when Firefox restarts. For a permanent install, pack and sign the extension (or install from [addons.mozilla.org](https://addons.mozilla.org) when published).

**Code:** [github.com/27mfp/plainly](https://github.com/27mfp/plainly)

## How to use

| Want to… | Do this |
| --- | --- |
| Read plain text | Look for the grey tag next to a coded line |
| Open a link | Click the address in the tag |
| Copy the plain text | Click the copy icon on the tag |
| Use the site you’re on | Popup → **This page** → **Add** → allow → **refresh** |
| FMHY / paste lists | Popup → **Paste sites** → **Add these** → allow → **refresh** |
| Add another site | Popup → **Your sites** → type `example.com` → **Add** → allow → **refresh** |
| Remove a site | Popup → **×** next to the name |
| Turn Plainly off | Popup → **On** switch |
| Check text by hand | Popup → open **Try text** → paste |

## For developers

```bash
npm test
npm run icons
npm run package:firefox   # AMO zip in project root
```

```text
plainly/
├── manifest.json      Chrome (load this folder) + base for Firefox
├── icons/             App icons
├── docs/              Demo images
├── src/               Extension code
├── popup.*            Toolbar menu
├── scripts/           Icons + Firefox packaging
└── test/              Tests and local preview page
```

How to contribute: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Other languages

- [Português (Portugal)](./README.pt-PT.md)

## Privacy & security

- No tracking, no accounts, no remote servers  
- Reddit works out of the box; other sites only after you allow them  
- Saves only: on/off, and the site list you added  

[Privacy](./PRIVACY.md) · [Security](./SECURITY.md) · [License (MIT)](./LICENSE)
