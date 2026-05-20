import { getSiteFlag } from "@/lib/db/queries";

// Site-wide "development is paused" notice. Driven by the `claude_outage`
// row in site_flags, toggleable from /admin/abuse → "Not actually abuse".
// Shows for every visitor regardless of Fun Mode — this is operational
// transparency, not a prank. Returns null when the flag is off so the
// element disappears from the DOM entirely.
export async function ClaudeOutageBanner() {
  let on = false;
  try {
    on = await getSiteFlag("claude_outage");
  } catch {
    // If the flag table isn't reachable, fall back to "off" rather than
    // blowing up the whole layout.
  }
  if (!on) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-500/40 bg-amber-500/15 text-amber-100"
    >
      <div className="mx-auto max-w-7xl px-4 py-2 text-center text-xs sm:text-sm">
        I am outta Claude :( the development is stalled until I renew the
        subscription for Claude.
      </div>
    </div>
  );
}
