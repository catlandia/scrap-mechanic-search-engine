// Floating "Support me" button → links straight to the Ko-fi page.
//
// We use a plain anchor rather than Ko-fi's overlay-widget.js on purpose: the
// overlay opens an embedded panel with "Powered by Ko-fi" branding, whereas a
// direct link takes supporters straight to the Ko-fi page. Bonus — no
// third-party script at all, so zero extra client cost and nothing to
// CSP-allowlist.
//
// Positioned bottom-LEFT so it never collides with the bottom-right compare
// basket pill (see CompareBasket.tsx).
const KOFI_URL = "https://ko-fi.com/cyberslime2077";

export function KofiWidget() {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Support me on Ko-fi"
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#794bc4] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 hover:shadow-xl"
    >
      <span aria-hidden>☕</span>
      Support me
    </a>
  );
}
