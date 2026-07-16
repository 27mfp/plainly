# Base64 Decoder for Reddit

Chrome extension that detects Base64 on **Reddit** and shows a sleek slate chip with the decoded text.

Open source — **PRs welcome** to support other sites ([CONTRIBUTING.md](./CONTRIBUTING.md)).

## What it does

On a Reddit post like:

```text
aHR0cHM6Ly9tZWdhdHVnYS5pby8=
aHR0cHM6Ly93d3cuYmVzdGZyZWVzdHJlYW1pbmcub3JnLw==
```

you get a minimal slate badge next to each string:

- Short **b64** label
- Decoded text (clickable when it is an `http(s)` URL)
- Copy icon on the chip

## Supported sites

| Site   | Status   |
| ------ | -------- |
| Reddit | Supported (`*.reddit.com`) |

Want another site? See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Install (unpacked)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repository folder (`base64decoder`)
5. Open Reddit and reload the tab after installing or updating

Optional: pin the extension — popup toggles decoding and lets you try a string manually.

## Develop & test

```bash
npm test          # Node unit tests for the decoder
npm run icons     # Regenerate slate icons
```

- **Reddit:** load unpacked, visit a post with Base64, hard-refresh after changes.
- **Local UI preview:** open `test/test-page.html` (injects content script styles/scripts without the manifest).

## Project layout

```text
manifest.json          MV3 — Reddit-only content_scripts matches
src/decoder.js         Pure detect/decode logic (shared with tests)
src/content.js         Scanner, slate chips, URL links, copy
src/content.css        Minimal slate badge styles
popup.html / .js / .css  Toggle + manual decode (slate UI)
test/                  Unit tests + simulated post page
CONTRIBUTING.md        How to add other websites via PR
```

## Notes

- Runs only on Reddit host patterns (not all websites).
- Only **printable UTF-8** decodes are shown (skips binary noise).
- Minimum candidate length is **16** characters to reduce false positives.
- Missing `=` padding is added automatically when valid.
- `storage` is only used for the on/off toggle.
