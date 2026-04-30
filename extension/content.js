// Scrap Mechanic Search Engine — Workshop badge content script.
//
// Runs on Steam Workshop item pages. If the page is for a Scrap Mechanic
// item (appid 387990 or 588870), checks whether SMSE has it indexed and
// injects a small badge under the title:
//   ✓ On SMSE — open  (links to the creation page)
//   + Not on SMSE — submit (links to /submit?steam=…)
// Cross-origin fetch is permitted by the manifest's host_permissions.

(() => {
  "use strict";

  const SITE = "https://scrap-mechanic-search-engine.vercel.app";
  const SM_APPIDS = ["387990", "588870"];

  function getPublishedFileId() {
    try {
      const id = new URL(location.href).searchParams.get("id");
      if (id && /^\d{1,25}$/.test(id)) return id;
    } catch {}
    return null;
  }

  function isScrapMechanicPage() {
    // Look for any link mentioning the SM app ids — every Workshop item
    // page has at least one breadcrumb/header link to /app/<id>/.
    return SM_APPIDS.some((appid) =>
      document.querySelector(
        `a[href*="/app/${appid}/"], a[href*="/app/${appid}?"], a[href$="/app/${appid}"]`,
      ),
    );
  }

  function findInjectionAnchor() {
    // Steam Workshop's item title sits in `.workshopItemTitle`. Fall back
    // to the broader header container if the markup ever changes.
    return (
      document.querySelector(".workshopItemTitle") ||
      document.querySelector(".workshopItemDetailsHeader") ||
      document.querySelector(".apphub_HeaderStandardTop")
    );
  }

  function makeBadge(state, message, linkText, linkHref) {
    const wrap = document.createElement("div");
    wrap.className = `smse-badge smse-state-${state}`;
    const dot = document.createElement("span");
    dot.className = "smse-dot";
    wrap.appendChild(dot);
    const txt = document.createElement("span");
    txt.className = "smse-text";
    txt.textContent = message;
    wrap.appendChild(txt);
    if (linkText && linkHref) {
      wrap.appendChild(document.createTextNode(" — "));
      const a = document.createElement("a");
      a.className = "smse-link";
      a.href = linkHref;
      a.textContent = linkText;
      a.target = "_blank";
      a.rel = "noreferrer";
      wrap.appendChild(a);
    }
    return wrap;
  }

  async function run() {
    const id = getPublishedFileId();
    if (!id) return;
    if (!isScrapMechanicPage()) return;

    const anchor = findInjectionAnchor();
    if (!anchor) return;

    const loading = makeBadge("loading", "Checking SMSE…");
    anchor.insertAdjacentElement("afterend", loading);

    try {
      const res = await fetch(
        `${SITE}/api/extension/lookup?steamId=${encodeURIComponent(id)}`,
        { credentials: "omit", cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error("lookup error");

      let next;
      if (data.exists) {
        next = makeBadge(
          "exists",
          "On Scrap Mechanic Search Engine",
          "Open ↗",
          data.url,
        );
      } else {
        next = makeBadge(
          "missing",
          "Not on Scrap Mechanic Search Engine yet",
          "Submit it ↗",
          data.submitUrl,
        );
      }
      loading.replaceWith(next);
    } catch {
      // Network failure or 5xx — fail silently rather than render a
      // confusing error pill on a third-party site.
      loading.remove();
    }
  }

  run();
})();
