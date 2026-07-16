# Contributing

Thanks for helping improve **Plain Text Helper for Reddit**.

## Scope today

The extension only runs on Reddit. That keeps access limited and the experience focused.

```json
"matches": [
  "*://*.reddit.com/*",
  "*://reddit.com/*"
]
```

## Adding another website (PRs welcome)

1. **Fork** and create a branch.
2. Edit `manifest.json` → `content_scripts[0].matches` and add host patterns only for the site you tested, for example:

   ```json
   "*://*.example.com/*",
   "*://example.com/*"
   ```

3. If the site needs special DOM handling (shadow roots, heavy virtual lists, etc.), extend `src/content.js` with a small site-specific path — prefer feature detection over user-agent hacks.
4. Add a short note under **Supported sites** in `README.md`.
5. Test on that site with real coded samples (and dark/light themes if relevant).
6. Open a pull request describing the site, which URLs you added, and how you tested.

### Guidelines

- Prefer the **narrowest** URL patterns that work.
- Do **not** switch back to `"<all_urls>"` without a strong reason and discussion.
- Keep the grey tag look consistent; site-specific CSS only when necessary.
- Reading coded text stays in `src/decoder.js` so the automatic tests stay the source of truth.

## Local development

```bash
npm test
```

1. Chrome → `chrome://extensions` → **Load unpacked** → this folder  
2. After code changes, click **Reload** on the extension card  
3. Refresh Reddit (or the site you are adding)

Manual preview (no Reddit required): open `test/test-page.html` (scripts are included on the page).

## Code style

- Plain JavaScript, Manifest V3, no build step required for the extension itself.
- Avoid large dependencies.
- Only show tags when the result looks like normal readable text.
