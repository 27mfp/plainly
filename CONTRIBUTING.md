# Contributing

Thanks for helping with **Plainly**.

## Add a website (no coding)

1. Open the Plainly menu in Chrome or Firefox  
2. **This page** → **Add** for the site you are on, or type a name under **Your sites**  
3. For FMHY-style lists: **Paste sites** → check the preview → **Add these**  
4. Allow access when the browser asks  
5. Refresh that tab  

Reddit is always included.

## Work on the code

```bash
npm test
npm run icons
npm run package:firefox
```

### Chrome

1. `chrome://extensions` → **Load unpacked** → **project root folder** (the one that contains [`manifest.json`](./manifest.json))  
2. After you change code, click **Reload** on the extension, then refresh the page  

### Firefox

1. Temporary: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select root **[`manifest.json`](./manifest.json)** (not under `dist` / `dist-firefox`)  
2. AMO package: `npm run package:firefox` → use the generated zip  
3. After you change code, click **Reload** next to the extension, then refresh the page  

Repo: https://github.com/27mfp/plainly

### Where things live

| File | Role |
| --- | --- |
| [`manifest.json`](./manifest.json) | Extension settings (load this folder / this file) |
| `src/decoder.js` | Finds and reads coded text (keep tests passing) |
| `src/content.js` | Puts plain text on the page |
| `src/content.css` | Look of the tags |
| `src/background.js` | Extra sites and injecting into tabs |
| `popup.*` | Toolbar menu (sites, paste pack, try text) |
| `scripts/package-firefox.js` | Builds the Firefox zip for AMO |

### Pull requests

Bug fixes, clearer wording, and better decoding are welcome.  
For "support another website," prefer the **Add** / **Paste sites** menu so users don't need a code change.
