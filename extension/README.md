# SMSE Browser Extension

Adds a small badge under the title of any Scrap Mechanic Steam Workshop
item page:

- **● On Scrap Mechanic Search Engine — Open ↗** — green pill, links to
  the SMSE page for the item.
- **● Not on Scrap Mechanic Search Engine yet — Submit it ↗** — amber
  pill, links to `/submit?steam=<id>` with the URL prefilled, so
  submitting is one click + one button press.

It only activates on Steam Workshop pages whose `appid` is `387990`
(Scrap Mechanic) or `588870` (Scrap Mechanic Survival).

## Install

### Firefox

1. Visit the [SMSE listing on Firefox Add-ons](https://addons.mozilla.org/firefox/) (link added once published).
2. Click "Add to Firefox."

### Chrome / Brave / Edge

Coming soon to the Chrome Web Store. In the meantime you can sideload:

1. Download `smse-extension.zip` from the [GitHub releases page](https://github.com/catlandia/scrap-mechanic-search-engine/releases).
2. Unzip it.
3. Open `chrome://extensions` (or `brave://extensions` / `edge://extensions`).
4. Toggle **Developer mode** on (top-right).
5. Click **Load unpacked**, pick the unzipped folder.

### Local development (Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Pick `extension/manifest.json` from a clone of this repo.
4. Browse to a Scrap Mechanic Workshop item — the badge appears under
   the title.

The temporary add-on stays loaded until Firefox restarts.

## Build a release zip

From the repo root:

```sh
cd extension && python -c "
import zipfile, os
files = []
for root, dirs, fs in os.walk('.'):
    for f in fs:
        if f == 'README.md': continue
        files.append(os.path.relpath(os.path.join(root, f), '.').replace(os.sep, '/'))
files.sort()
with zipfile.ZipFile('../smse-extension.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for p in files: z.write(p, p)
"
```

The resulting `smse-extension.zip` (in the repo root) is what gets
uploaded to Firefox Add-ons (AMO) and the Chrome Web Store.

## Privacy

The extension makes a single GET request per Workshop page view:

```
GET https://scrap-mechanic-search-engine.vercel.app/api/extension/lookup?steamId=<id>
```

That request only carries the Steam Workshop publishedfileid you're
already viewing in your browser. No cookies, no auth, no tracking.
SMSE's server logs the request like any other web request (IP +
timestamp) but does not associate it with any user identity. The
extension never reads any other page content and never communicates
with any third party.

## Permissions explained

- `host_permissions: https://scrap-mechanic-search-engine.vercel.app/*`
  — needed so the background script can call SMSE's lookup endpoint
  cross-origin from `steamcommunity.com`.
- The content script only runs on
  `steamcommunity.com/sharedfiles/filedetails/*` and
  `steamcommunity.com/workshop/filedetails/*`, and aborts immediately
  unless the page is for Scrap Mechanic (appid `387990` or `588870`).

## License

MIT — see the repo's top-level LICENSE file.

## Source

Source lives in [the main SMSE repo](https://github.com/catlandia/scrap-mechanic-search-engine)
under `extension/`. PRs and issues welcome there.
