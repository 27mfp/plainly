# Changelog

All notable changes to **Plainly** are listed here.

## 1.3.4 — 2026-07-16

### UI
- Remove-site control: larger hit area, SVG icon, focus/press states, “host removed” toast

## 1.3.3 — 2026-07-16

### Features
- **Add this site** button — uses the active tab, normalizes to origin (drops path/query)
- `activeTab` permission for reading the current page URL

## 1.3.2 — 2026-07-16

### Polish
- Success toast after adding a site + “refresh that tab” hint
- Content script re-entry guard (no double tags on re-inject)
- GitHub: https://github.com/27mfp/plainly
- README screenshot

## 1.3.1 — 2026-07-16

### Fix
- Adding a site works after the Chrome permission dialog (popup used to close before the site was saved)

## 1.3.0 — 2026-07-16

### Popup
- Slimmer menu (less text)
- GitHub icon in the header
- **Add site by URL** — Chrome permission prompt, no PR required

### Engine
- Background worker registers content scripts for user sites
- Optional host permissions for sites you add

## 1.2.0 — 2026-07-16

### Brand & UI
- Renamed the product to **Plainly**
- Zinc color system for tags and popup
- New minimal app icon (coded → clear mark)
- Popup shows logo, version, and clearer product framing

### Docs
- README rewritten for users and contributors
- Added LICENSE (MIT), PRIVACY, CHANGELOG, SECURITY

## 1.1.1 — 2026-07-16

- Plain-language labels (less jargon)
- Arrow tag instead of technical badges

## 1.1.0 — 2026-07-16

- Reddit-only host matches
- Clickable links when plain text is a URL
- Copy control on each tag
- CONTRIBUTING guide for adding other sites

## 1.0.0 — 2026-07-16

- First release: detect coded text, show plain text on pages
