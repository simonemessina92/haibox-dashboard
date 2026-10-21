# CLAUDE.md

Instructions for Claude when working on this repository.

## Project

HAIBOX Dashboard is a Chrome extension (Manifest V3) that replaces the New Tab page with a configurable dashboard of tiles linking to HAIBOX web interfaces and other saved links. It is plain HTML/CSS/JavaScript with no build step and no dependencies.

- Extension source: `haibox-local-extension/` (`manifest.json`, `haibox-dashboard.html`, `haibox-dashboard.js`, images, `README.txt`).
- Installable ZIPs: `downloads/haibox-local-extension-V<version>.zip`.

## Rules

- Write all code, comments, commit messages and documentation in English.
- Develop on `develop`. Never commit or merge to `main` directly: `main` holds only the GOLDEN (stable, tested) version.
- A version is promoted from `develop` to `main` only after Simone has tested it and explicitly calls it "golden".
- Never modify or delete existing ZIPs in `downloads/`. A new version gets a new ZIP.
- Never break saved user configurations: keep the storage keys (`haibox_dashboard_config_v3`, `haibox_links_ubuntu_v1`) and keep older JSON exports (V4 and later) importable.

## Releasing a version

1. Bump `version` in `haibox-local-extension/manifest.json` and update `haibox-local-extension/README.txt` and the root `README.md`.
2. Create the ZIP from the repository root so it contains the `haibox-local-extension/` folder:
   `zip -r downloads/haibox-local-extension-V<version>.zip haibox-local-extension -x '*.DS_Store'`
3. Update the download link in `README.md`.

## Checks

- Syntax check: `node --check haibox-local-extension/haibox-dashboard.js`
- Validate the manifest: `python3 -m json.tool haibox-local-extension/manifest.json`
- Real test: load the folder via `chrome://extensions` > Developer mode > Load unpacked, then open a new tab.
