import { RoleBadge } from "@/components/RoleBadge";
import { UserName } from "@/components/UserName";
import type { PublicReportBadge } from "@/lib/db/queries";
import type { UserRole } from "@/lib/db/schema";

const REASON_LABELS: Record<string, string> = {
  wrong_tags: "Wrong tags",
  poor_quality: "Poor quality",
  spam: "Spam",
  not_scrap_mechanic: "Not Scrap Mechanic",
  other: "Other",
};

/**
 * Visible on /creation/[id] once a moderator has actioned a report. Only
 * status='actioned' reports surface publicly; open / cleared stay private.
 */
export function ReportBadge({ badge }: { badge: PublicReportBadge }) {
  const label = REASON_LABELS[badge.reason] ?? badge.reason;
  const note = badge.resolverNote ?? badge.customText;
  return (
    <aside className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 font-medium text-amber-200">
        <span aria-hidden>⚠</span>
        Flagged by moderators: {label}
      </div>
      {note && (
        <p className="whitespace-pre-wrap text-amber-100/80">{note}</p>
      )}
      {badge.resolverName && (
        <div className="flex items-center gap-2 text-xs text-amber-100/60">
          <span>— </span>
          <UserName
            name={badge.resolverName}
            role={badge.resolverRole as UserRole | null}
            steamid={badge.resolverSteamid ?? undefined}
          />
          <RoleBadge role={badge.resolverRole as UserRole | null} />
          {badge.resolvedAt && (
            <span className="text-amber-100/40">
              · {new Date(badge.resolvedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
