# Contributing to Plainly

Thanks for helping improve **Plainly**.

## Users: add a site without code

1. Open the Plainly popup  
2. Under **Sites**, paste `example.com` or a full URL  
3. Click **Add** and allow access when Chrome asks  
4. Refresh that site  

Reddit is always included.

## Developers

```bash
npm test
npm run icons
```

1. Chrome → `chrome://extensions` → **Load unpacked**  
2. Reload the extension after changes  
3. Set `GITHUB_URL` in `popup.js` to your real repo when you publish  

### Code pointers

- `src/decoder.js` — find and read coded text (keep tests green)
- `src/content.js` / `content.css` — page tags
- `src/background.js` — user-added sites
- Prefer narrow permissions; don’t force `<all_urls>` as required

### Pull requests

Improvements to decoding quality, UI, docs, and bug fixes are welcome. Site support for end users should stay in the popup “Add site” flow whenever possible.
