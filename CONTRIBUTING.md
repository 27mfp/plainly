# Contributing

Thanks for helping with **Plainly**.

## Add a website (no coding)

1. Open the Plainly menu in Chrome  
2. Under **Sites**, paste `example.com` or use **Add this site**  
3. Allow access when Chrome asks  
4. Refresh that tab  

Reddit is always included.

## Work on the code

```bash
npm test
npm run icons
```

1. Chrome → `chrome://extensions` → **Load unpacked** → this folder  
2. After you change code, click **Reload** on the extension, then refresh the page  
3. Repo: https://github.com/27mfp/plainly  

### Where things live

| File | Role |
| --- | --- |
| `src/decoder.js` | Finds and reads coded text (keep tests passing) |
| `src/content.js` | Puts plain text on the page |
| `src/content.css` | Look of the tags |
| `src/background.js` | Extra sites and injecting into tabs |

### Pull requests

Bug fixes, clearer wording, and better decoding are welcome.  
For “support another website,” prefer the **Add site** menu so users don’t need a code change.
