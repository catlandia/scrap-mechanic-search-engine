# SMSE Browser Extension

Adds a small badge under the title of any Scrap Mechanic Steam Workshop
item page:

- **✓ On Scrap Mechanic Search Engine** — click "Open ↗" to jump to the
  SMSE page for the item.
- **Not on SMSE yet** — click "Submit it ↗" to land on
  `/submit?steam=<id>` with the URL prefilled, so submission is a single
  click + a single press of the submit button.

It only activates on Steam Workshop pages whose `appid` is `387990` (Scrap
Mechanic) or `588870` (Scrap Mechanic Survival).

## Install

### Firefox (free)

1. Download `smse-extension.zip` from the project's GitHub releases (or
   build it from source — see below).
2. Visit [Firefox Add-ons / SMSE](https://addons.mozilla.org/) once we've
   published it.

For local development:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Pick any file inside the `extension/` folder (e.g. `manifest.json`).
4. Browse to a Scrap Mechanic Workshop item — the badge appears under
   the title.

The temporary add-on stays loaded until Firefox restarts.

### Chrome / Brave / Edge (sideload)

1. Download or clone the repo.
2. Open `chrome://extensions` (or `brave://extensions`).
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked**, pick the `extension/` folder.

The extension stays loaded across browser restarts.

> Once the extension proves useful, we'll publish to the Chrome Web Store
> and you'll be able to install with one click.

## Build a release zip

```sh
cd extension
zip -r ../smse-extension.zip . -x '*.DS_Store' '*node_modules*'
```

The resulting `smse-extension.zip` is what gets uploaded to AMO (Firefox)
and the Chrome Web Store.

## Permissions

- `host_permissions: https://scrap-mechanic-search-engine.vercel.app/*` —
  needed so the content script can call SMSE's `/api/extension/lookup`
  endpoint cross-origin from `steamcommunity.com`.
- The content script only runs on
  `steamcommunity.com/sharedfiles/filedetails/*` and
  `steamcommunity.com/workshop/filedetails/*`, and aborts immediately
  unless the page is for Scrap Mechanic.
