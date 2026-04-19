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

// Curated list of Steam IDs that get the Influencer badge auto-granted on
// sign-in. Source of truth is this array — to add someone, append a line
// with a comment naming them. Removing from the list stops future auto-
// grants but doesn't revoke an existing grant; revoke via /admin/users if
// you want to actively pull the badge.
export const INFLUENCER_STEAMIDS: string[] = [
  "76561197994708053", // glykaman — steamcommunity.com/id/glykaman
];

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
};

export function getBadge(slug: string): BadgeDef | null {
  return BADGES[slug] ?? null;
}

export const BADGE_SLUGS = Object.keys(BADGES);
