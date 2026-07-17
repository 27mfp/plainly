# Changelog

Notable changes to **Plainly**.

## 1.6.0 — 2026-07-17

### Feature
- **Paste sites** — one click for rentry, pastebin, private pastes, FMHY, and similar (where coded lists often live)
- Shows a short preview of which sites will be added before you confirm
- **Nested coded text** — unwraps layered codes in one go (code → code → plain text)
- Multi-site access request when the browser closes the popup mid-dialog

### UI
- Compact flat menu: **This page**, **Paste sites**, **Your sites**, collapsible **Try text**
- Plain-language wording (less technical jargon)
- Semantic colours: red remove, green on/add, blue paste pack, green/red toasts
- Quiet thin scrollbars; no sideways overflow from long site lists

### Fix
- Chrome Manifest V3: `background` is **service_worker only** (no MV2 `scripts` key that blocked loading)
- Firefox packaging still uses `background.scripts` via `npm run package:firefox`

### Docs
- README (EN + PT) for paste sites and the new menu
- CONTRIBUTING: Chrome + Firefox load steps
- Version badge **1.6.0**

## 1.5.1 — 2026-07-16

### Fix
- Firefox min versions raised for AMO: desktop **140+**, Android **142+** (needed for `optional_host_permissions` and data-collection declaration)  

## 1.5.0 — 2026-07-16

### Feature
- **Firefox support** — same folder loads in Chrome and Firefox  
- Manifest uses a service worker (Chrome) and a background script (Firefox)  
- Uses the promise-based `browser` API when available  
- Gecko extension id and “no data collection” declaration for Firefox  

### Docs
- Install steps for Chrome/Edge and Firefox  

## 1.4.0 — 2026-07-16

### Fix
- Removed the system that caused the “duplicate script” error when adding sites  
- Extra sites now run when you open a matching tab (simpler and more reliable)  
- Clears any old leftover registrations on install  

### Polish
- Faster page scanning (less work on busy pages)  
- Safer handling of decoded links  
- Cleaner docs  

## 1.3.x — 2026-07-16

- **Add this site** button  
- Add sites by URL (with Chrome permission prompt)  
- Success messages after add/remove  
- GitHub link: https://github.com/27mfp/plainly  
- Fix: site was not saved when the permission dialog closed the popup  
- Better remove button on the site list  
