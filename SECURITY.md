# Security

## Supported versions

| Version | Supported |
| --- | --- |
| 1.2.x   | Yes       |
| &lt; 1.2 | Best effort |

## Reporting a problem

If you find a security issue (for example unexpected access, data leaving the browser, or a bad permission request):

1. **Do not** open a public issue with exploit details.
2. Prefer a private security advisory on [github.com/27mfp/plainly](https://github.com/27mfp/plainly), or contact the maintainer without public exploit details.
3. Include steps to reproduce and the extension version from the popup.

We aim to respond within a few days and fix serious issues quickly.

## Design notes

- No network calls from the extension for decoding
- Only Reddit host matches by default
- Only the on/off preference is stored
