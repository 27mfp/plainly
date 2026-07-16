# Plain Text Helper for Reddit

A Chrome extension that finds coded lines on **Reddit** and shows the plain text next to them.

Open source — help welcome for other sites ([CONTRIBUTING.md](./CONTRIBUTING.md)).

## What it does

When a post has lines like:

```text
aHR0cHM6Ly9tZWdhdHVnYS5pby8=
aHR0cHM6Ly93d3cuYmVzdGZyZWVzdHJlYW1pbmcub3JnLw==
```

you see a small grey tag with the readable version:

- An arrow pointing at the plain text
- If it’s a link, you can open it
- A copy button if you want it on the clipboard

## Supported sites

| Site   | Status    |
| ------ | --------- |
| Reddit | Supported |

Want another site? See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Install

1. Open Chrome → `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Choose this folder
5. Open Reddit and refresh the page

You can pin the extension to turn it on/off or paste a code to check by hand.

## Develop & test

```bash
npm test          # automatic checks for the decoder
npm run icons     # rebuild the app icons
```

- **Reddit:** load the folder in Chrome, open a post with coded text, refresh after you change code.
- **Local preview:** open `test/test-page.html` in the browser.

## Project layout

```text
manifest.json          Chrome settings (Reddit only)
src/decoder.js         Finding and reading coded text
src/content.js         Putting plain text next to posts
src/content.css        Look of the grey tags
popup.html / .js / .css  On/off switch and manual check
test/                  Automatic tests + sample page
CONTRIBUTING.md        How to add other websites
```

## Notes

- Only runs on Reddit.
- Only shows results that look like normal readable text (not random junk).
- Very short codes are ignored so normal words aren’t flagged by mistake.
- Missing padding on codes is fixed automatically when possible.
- Chrome “storage” is only used for the on/off switch.
