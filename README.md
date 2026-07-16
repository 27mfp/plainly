<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="Plainly icon" />
</p>

<h1 align="center">Plainly</h1>

<p align="center">
  <strong>Coded text on Reddit → plain text you can read.</strong><br />
  Quiet zinc tags. Open source. Reddit only (for now).
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.2.0-18181b?style=flat-square" />
  <img alt="Manifest" src="https://img.shields.io/badge/manifest-V3-3f3f46?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-52525b?style=flat-square" />
  <img alt="Platform" src="https://img.shields.io/badge/Chrome-extension-27272a?style=flat-square" />
</p>

---

## Why Plainly?

Posts sometimes hide links or messages as long coded strings. **Plainly** spots them and shows the readable version right next to the code — no extra tools, no copy-paste dance.

## Features

- **Automatic** — works as you scroll Reddit
- **Quiet zinc UI** — small tags that match light and dark Reddit
- **Links open** — if the plain text is a web address, click to open
- **Copy in one click** — small icon on each tag
- **Private** — nothing leaves your browser ([PRIVACY.md](./PRIVACY.md))
- **Open source** — add other sites via PR ([CONTRIBUTING.md](./CONTRIBUTING.md))

## Example

A post might look like:

```text
aHR0cHM6Ly9tZWdhdHVnYS5pby8=
aHR0cHM6Ly93d3cuYmVzdGZyZWVzdHJlYW1pbmcub3JnLw==
```

With Plainly you see grey tags:

`→ https://megatuga.io/` · `→ https://www.bestfreestreaming.org/`

## Install

### From this folder (developers)

1. Open Chrome → `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → choose this repository folder
4. Open Reddit and **refresh** the tab

Pin **Plainly** from the puzzle menu so the icon stays visible.

### After you change code

Reload the extension on `chrome://extensions`, then refresh Reddit.

## Use

| Action | How |
| --- | --- |
| Read plain text | Look for the zinc tag next to a coded line |
| Open a link | Click the address in the tag |
| Copy plain text | Click the copy icon on the tag |
| Turn off | Open the popup → switch off |
| Check a code by hand | Paste it in the popup |

## Supported sites

| Site | Status |
| --- | --- |
| Reddit (`*.reddit.com`) | Supported |

Other sites: see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Develop

```bash
npm test          # decoder checks (Node)
npm run icons     # rebuild icons from icons/icon-source.jpg
```

```text
plainly/
├── manifest.json       # Chrome app definition
├── icons/              # App icon set (16 → 512)
├── src/
│   ├── decoder.js      # Find & read coded text
│   ├── content.js      # Reddit page tags
│   └── content.css     # Zinc tag styles
├── popup.html          # Toolbar popup
├── popup.css
├── popup.js
├── test/               # Tests + sample page
├── PRIVACY.md
├── SECURITY.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

## Privacy & security

- No analytics, no accounts, no remote decode API  
- Only Reddit is accessed by default  
- Only the on/off preference is stored  

Details: [PRIVACY.md](./PRIVACY.md) · [SECURITY.md](./SECURITY.md)

## License

[MIT](./LICENSE) — use it, fork it, ship improvements.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
