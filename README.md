# HAIBOX Dashboard

A configurable Chrome new-tab dashboard for opening HAIBOX web interfaces and other saved links. Tiles, layout and logo are stored locally. JSON export and import let you transfer configurations between computers.

## Download

[Download v5.0.0 GOLDEN](https://github.com/simonemessina92/haibox-dashboard/raw/refs/heads/main/downloads/haibox-local-extension-V5.0.0.zip)

## Install

1. Download and extract the ZIP into a permanent folder.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. In Chrome startup settings, select **Open the New Tab page**.

Long press a tile to edit its name and address. Use Settings to change the layout, logo or import/export a configuration.

## Update

Export your JSON configuration as a backup. Replace the files in the same extension folder, then click **Reload** in `chrome://extensions`. Keep the extension installed and the folder path unchanged to preserve saved settings.

## Branches

- `main`: stable GOLDEN version, currently v5.0.0.
- `develop`: development and testing, based on the latest GOLDEN.

Development versions are promoted to `main` after testing. The extension source is in `haibox-local-extension/`; installable ZIPs are in `downloads/`.

## Configuration

Fresh installations start with 12 empty tiles. Existing settings are preserved on update. V4 JSON exports remain supported. Imports are validated and require confirmation before replacing settings. Open dashboard tabs synchronize configuration changes.
