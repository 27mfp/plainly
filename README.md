# Base64 Decoder (Chrome Extension)

Automatically detects Base64 strings on web pages (including Reddit) and shows the decoded text inline.

## What it does

When you open a post that contains Base64, for example:

```text
maria was looking for a book, but all books title were in base64, the list is the following:

aHR0cHM6Ly9tZWdhdHVnYS5pby8=

aHR0cHM6Ly93d3cuYmVzdGZyZWVzdHJlYW1pbmcub3JnLw==
```

…you get green **decoded** badges next to each string (URLs, messages, etc.). Click a badge to copy the decoded value.

## Install (unpacked)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repository folder (`base64decoder`)

Optional: pin the extension and use the popup to toggle it or try a string manually.

## Develop & test

```bash
# Unit tests (Node, no browser)
npm test

# Regenerate icons
npm run icons
```

### Manual UI test

1. Load the extension unpacked
2. Open `test/test-page.html` in Chrome  
   (or right‑click the file → Open with Chrome after the extension is loaded; for `file://` the content script still runs if allowed — easiest is to serve the folder or open via extension inspection)
3. Confirm badges appear next to the sample Base64 lines

For Reddit: visit any post with Base64 text; the content script uses a `MutationObserver` so SPA navigation and infinite scroll still get scanned.

## Project layout

```text
manifest.json          Chrome MV3 manifest
src/decoder.js         Pure detect/decode logic (also used by tests)
src/content.js         Page scanner + DOM badges
src/content.css        Badge styles (light/dark)
popup.html / .js / .css  Toggle + manual decode
test/decoder.test.js   Node unit tests
test/test-page.html    Simulated Reddit post
icons/                 Extension icons
```

## Notes

- Only **printable UTF‑8** decodes are shown (skips binary noise).
- Minimum candidate length is **16** characters to reduce false positives.
- Missing `=` padding is added automatically when valid.
- Storage permission is only used for the on/off toggle.
