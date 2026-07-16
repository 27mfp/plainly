# Contributing

Thanks for helping improve **Base64 Decoder for Reddit**.

## Scope today

The extension only injects on Reddit. That keeps permissions tight and the UX focused.

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
5. Test on that site with real Base64 samples (and dark/light themes if relevant).
6. Open a PR describing the site, match patterns, and how you tested.

### Guidelines

- Prefer the **narrowest** match patterns that work.
- Do **not** switch back to `"<all_urls>"` without a strong reason and discussion.
- Keep the slate badge UI consistent; site-specific CSS overrides only when necessary.
- Decoder logic stays in `src/decoder.js` so unit tests remain the source of truth.

## Local development

```bash
npm test
```

1. Chrome → `chrome://extensions` → **Load unpacked** → this folder  
2. After code changes, click **Reload** on the extension card  
3. Hard-refresh Reddit (or the site you are adding)

Manual DOM preview (no Reddit required): open `test/test-page.html` (scripts are included on the page).

## Code style

- Vanilla JS, Manifest V3, no build step required for the extension itself.
- Avoid large dependencies.
- Keep false-positive rate low: only show badges when decode yields plausible UTF-8 text.
