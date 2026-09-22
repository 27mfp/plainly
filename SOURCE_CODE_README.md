# Plainly 1.6.0 — Mozilla Source Code Build Instructions

This source package reproduces the Firefox extension submitted to Mozilla Add-ons.
The extension is written in plain JavaScript, HTML, and CSS. It is not transpiled,
minified, concatenated, bundled, or obfuscated.

## Build environment

The submitted package was built and tested with:

- Windows 11 Pro 10.0.26200 (64-bit)
- Node.js 24.15.0
- npm 12.0.1

The build script is cross-platform and supports Node.js 18 or later on Windows,
macOS, or Linux.

## Install the required programs

1. Install Node.js from <https://nodejs.org/>. npm is included with Node.js.
2. Open a terminal in the directory containing this file and `package.json`.
3. Confirm the installed versions:

   ```sh
   node --version
   npm --version
   ```

Node.js 18 or later is required. To match the submitted build environment exactly,
use Node.js 24.15.0 and npm 12.0.1.

## Build the Firefox extension

Run these commands from the source package root:

```sh
npm ci
npm test
npm run package:firefox
```

The resulting extension package is:

```text
plainly-1.6.0-firefox.zip
```

The file submitted to AMO as `plainly-1.6.0-firefox-amo-v2.zip` is the same generated
archive with a different filename.

## What the build script does

`scripts/package-firefox.js` performs all required technical build steps:

1. Creates a clean `dist-firefox` staging directory.
2. Copies the extension's JavaScript, HTML, CSS, icons, license, and privacy policy
   without transforming their contents.
3. Reads the root `manifest.json` and replaces Chrome's
   `background.service_worker` declaration with Firefox's equivalent
   `background.scripts` declaration.
4. Writes the Firefox-specific `manifest.json`.
5. Creates `plainly-1.6.0-firefox.zip` with standards-compliant forward-slash paths.

The only build dependency is the open-source `yazl` ZIP library and its
`buffer-crc32` dependency. Their exact versions and integrity hashes are recorded
in `package-lock.json` and installed by `npm ci`. Third-party library source is not
included in this source archive.

No network access, code download, or runtime dependency is used by the extension.
There is no generated executable JavaScript in the submitted add-on.
