// Background script — handles all cross-origin fetches for the extension.
//
// We can't fetch from the content script directly: Firefox's MV3
// implementation enforces the host page's Content-Security-Policy on
// content-script `fetch()` calls, and Steam's CSP only allows connections
// to Steam-owned domains. Fetching from the background context (a
// privileged extension context) bypasses the page CSP entirely.
//
// Both Firefox and Chrome dispatch chrome.runtime.onMessage from any
// content script, so the same script handles both. The browser polyfill
// (`browser` on Firefox, `chrome` on Chrome) returns the same promise-
// based API on modern versions, so we don't need a webextension-polyfill.

const api = typeof browser !== "undefined" ? browser : chrome;

const SITE = "https://scrap-mechanic-search-engine.vercel.app";

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "smse-lookup") return false;
  const id = typeof msg.steamId === "string" ? msg.steamId : "";
  if (!/^\d{1,25}$/.test(id)) {
    sendResponse({ ok: false, error: "invalid steamId" });
    return false;
  }
  fetch(`${SITE}/api/extension/lookup?steamId=${encodeURIComponent(id)}`, {
    credentials: "omit",
    cache: "no-store",
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  // Returning true keeps the message channel open so sendResponse can fire
  // asynchronously after the fetch settles.
  return true;
});
