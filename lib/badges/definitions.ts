export type BadgeGrantKind = "auto" | "manual";

export interface BadgeDef {
  slug: string;
  name: string;
  description: string;
  icon: string;
  // Tailwind classes for the pill. Kept inline so the catalog is a single
  // source of truth, and so grepping for a badge slug finds its style.
  pill: string;
  grantKind: BadgeGrantKind;
}

// Auto-grant this badge to anyone whose siteJoinedAt is before this date.
// Updates to the constant don't retroactively revoke — they just close the
// window for new grants. Push this date back when the public beta actually
// ends and the badge becomes a keepsake.
export const BETA_END_DATE = new Date("2027-01-01T00:00:00Z");

// Which badges support an allowlist-based auto-grant (managed via
// /admin/badges). The creator adds steamids there; the sign-in handler
// grants user_badges on match. Badges not listed here are either purely
// manual (admin UI) or auto-granted via some other rule (e.g. date-based
// betatester).
export const AUTOGRANT_BADGES: readonly string[] = ["influencer"];

export const BADGES: Record<string, BadgeDef> = {
  betatester: {
    slug: "betatester",
    name: "Beta tester",
    description: "Joined while the site was still in public beta.",
    icon: "🧪",
    pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    grantKind: "auto",
  },
  influencer: {
    slug: "influencer",
    name: "Influencer",
    description:
      "Creators who publish Scrap Mechanic content the community actually watches.",
    icon: "🎬",
    pill: "bg-red-500/15 text-red-300 border-red-500/40",
    grantKind: "auto",
  },
  bright_idea: {
    slug: "bright_idea",
    name: "Bright idea",
    description:
      "Submitted a feature idea the Creator acted on and shipped to the site.",
    icon: "💡",
    pill: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    grantKind: "manual",
  },
  bug_hunter: {
    slug: "bug_hunter",
    name: "Bug hunter",
    description:
      "Found a real bug on the site, tested a pre-release feature, or flagged something that got fixed because of their report.",
    icon: "🐛",
    pill: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    grantKind: "manual",
  },
  top_creator: {
    slug: "top_creator",
    name: "Top creator",
    description:
      "Currently holds the most approved creations on the site (including co-authored items). Awarded automatically — if the count changes, the badge moves.",
    icon: "👑",
    pill: "bg-amber-500/15 text-amber-300 border-amber-500/50",
    grantKind: "auto",
  },
};

// Auto-managed badges are granted/revoked by the system (not by mods or
// the creator's /admin/badges autogrant allowlist). Listed here so the
// /admin/badges + /admin/users UIs can hide their grant buttons and the
// backfill script can skip them.
export const SYSTEM_AUTO_BADGES: readonly string[] = ["top_creator"];

export function getBadge(slug: string): BadgeDef | null {
  return BADGES[slug] ?? null;
}

export const BADGE_SLUGS = Object.keys(BADGES);
