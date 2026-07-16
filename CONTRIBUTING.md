# Contributing to Plainly

Thanks for helping improve **Plainly**.

## What Plainly is

A Chrome extension that finds coded text on **Reddit** and shows the plain version next to it. The UI is zinc-coloured and deliberately quiet.

## Scope today

Only Reddit:

```json
"matches": [
  "*://*.reddit.com/*",
  "*://reddit.com/*"
]
```

## Adding another website

1. Fork and create a branch.
2. Edit `manifest.json` → `content_scripts[0].matches` with patterns for the site you tested only.
3. If the site needs special page handling, extend `src/content.js` carefully.
4. Note the site under **Supported sites** in `README.md`.
5. Test with real samples (light and dark themes if the site has them).
6. Open a pull request: what site, which URLs, how you tested.

### Guidelines

- Prefer the narrowest URL patterns that work.
- Do not switch to `"<all_urls>"` without discussion.
- Keep the zinc tag look consistent.
- Keep reading logic in `src/decoder.js` so tests stay meaningful.

## Local setup

```bash
npm test
npm run icons   # rebuild icons from icons/icon-source.jpg (needs Python + Pillow)
```

1. Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked** → this folder  
2. After changes, **Reload** the extension  
3. Refresh Reddit  

Local UI without Reddit: open `test/test-page.html`.

## Code style

- Plain JavaScript, Manifest V3, no build step for the extension itself
- Avoid large dependencies
- Only show tags when the result looks like normal readable text
