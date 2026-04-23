import type { PublicReportBadge } from "@/lib/db/queries";

const REASON_LABELS: Record<string, string> = {
  wrong_tags: "Tagged incorrectly",
  poor_quality: "Low quality",
  spam: "Spam",
  not_scrap_mechanic: "Not Scrap Mechanic content",
  missing_creators: "Missing contributors",
  other: "Community report",
};

/**
 * Visible on /creation/[id] once a moderator has actioned a report. Only
 * status='actioned' reports surface publicly; open / cleared stay private.
 * Shows only the canonical reason label — never reporter free text or
 * resolver identity.
 */
export function ReportBadge({ badge }: { badge: PublicReportBadge }) {
  const label = REASON_LABELS[badge.reason] ?? REASON_LABELS.other;
  return (
    <aside className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 font-medium text-amber-200">
        <span aria-hidden>⚠</span>
        Flagged by moderators: {label}
      </div>
    </aside>
  );
}
