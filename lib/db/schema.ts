import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

export const CREATION_KINDS = [
  "blueprint",
  "mod",
  "world",
  "challenge",
  "tile",
  "custom_game",
  "terrain_asset",
  "other",
] as const;
export type CreationKind = (typeof CREATION_KINDS)[number];

export const CREATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "archived",
  "deleted",
] as const;
export type CreationStatus = (typeof CREATION_STATUSES)[number];

export const TAG_SOURCES = ["keyword", "steam", "admin", "community"] as const;
export type TagSource = (typeof TAG_SOURCES)[number];

export const USER_ROLES = [
  "user",
  "moderator",
  "elite_moderator",
  "creator",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_WEIGHT: Record<UserRole, number> = {
  user: 1,
  moderator: 5,
  elite_moderator: 15,
  // Creator uses hard-override at the application layer; their vote weight
  // below is mostly symbolic (if they choose to vote rather than admin-confirm).
  creator: 50,
};

export const REPORT_REASONS = [
  "wrong_tags",
  "poor_quality",
  "spam",
  "not_scrap_mechanic",
  "missing_creators",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "cleared", "actioned"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_SOURCES = ["user", "auto"] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

export const creations = pgTable(
  "creations",
  {
    id: text("id").primaryKey(),
    // Short public-facing id. Used in user-facing URLs like /creation/42
    // while `id` stays the Steam publishedfileid used for ingest upserts
    // and joins. Nullable on purpose: inserts leave it empty and it's
    // assigned on first approval via `nextval('creations_short_id_seq')`
    // so the visible number always tracks the approved catalog size —
    // pending/rejected rows no longer burn sequence values. The sequence
    // object itself is kept in Postgres (it pre-dates this change).
    shortId: integer("short_id").unique(),
    title: text("title").notNull(),
    descriptionRaw: text("description_raw").notNull().default(""),
    descriptionClean: text("description_clean").notNull().default(""),
    authorSteamid: text("author_steamid"),
    authorName: text("author_name"),
    // Multi-creator attribution. Steam's API only returns the single primary
    // `creator` field, but many workshop items are collaborations with 2–10
    // contributors shown in the rendered Workshop page. Scraped at ingest
    // time from the sidebar HTML; resolved to {steamid, name}. Empty array
    // means "only the primary author" or "scrape failed".
    creators: jsonb("creators")
      .$type<Array<{ steamid: string; name: string }>>()
      .notNull()
      .default([]),
    // Timestamp of the most recent `fetchWorkshopContributors` call. The
    // weekly refresh cron orders by this ASC-NULLS-FIRST to rotate through
    // the catalog, so every item eventually gets a fresh scrape even if
    // its contributor list stays the same.
    creatorsRefreshedAt: timestamp("creators_refreshed_at", { withTimezone: true }),
    thumbnailUrl: text("thumbnail_url"),
    steamUrl: text("steam_url").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    timeCreated: timestamp("time_created", { withTimezone: true }),
    timeUpdated: timestamp("time_updated", { withTimezone: true }),
    voteScore: real("vote_score"),
    votesUp: integer("votes_up"),
    votesDown: integer("votes_down"),
    subscriptions: integer("subscriptions").notNull().default(0),
    favorites: integer("favorites").notNull().default(0),
    views: integer("views").notNull().default(0),
    steamTags: jsonb("steam_tags").$type<string[]>().notNull().default([]),
    kind: text("kind").notNull().default("other"),
    status: text("status").notNull().default("pending"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    // v2.0: track attribution. Null = cron-ingested / system.
    uploadedByUserId: text("uploaded_by_user_id"),
    reviewedByUserId: text("reviewed_by_user_id"),
    // v2.0: denormalised raw up/down vote counts from creation_votes so card
    // grids don't need a GROUP BY on every render. Recomputed on every vote.
    // (Stored in the original "site_weighted_*" columns; we removed the role-
    // weighting in V2.0e — each user's vote now counts as exactly 1, and
    // role breakdown is displayed separately.)
    siteWeightedUp: integer("site_weighted_up").notNull().default(0),
    siteWeightedDown: integer("site_weighted_down").notNull().default(0),
    // Generated-stored: Postgres recomputes on every insert/update, so app
    // code must never write to this column.
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description_clean, ''))`,
    ),
  },
  (t) => [
    index("creations_status_idx").on(t.status),
    index("creations_kind_idx").on(t.kind),
    index("creations_approved_at_idx").on(t.approvedAt.desc()),
    index("creations_time_updated_idx").on(t.timeUpdated),
    index("creations_author_idx").on(t.authorSteamid),
    index("creations_search_vector_idx").using("gin", t.searchVector),
    // GIN on creators jsonb so /author/[steamid] queries using @> for
    // contributor lookup stay cheap as the catalog grows.
    index("creations_creators_idx").using("gin", t.creators),
  ],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  // V9.1: who created this category, and when. Added so mods can answer
  // "who added this?" from /admin/audit without cross-referencing commit
  // history. FK with set-null so deleting the creator user doesn't wipe
  // the category; pre-V9.1 rows carry nulls.
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    // V9.1: same attribution fields as categories. Pre-V9.1 rows carry
    // nulls — don't backfill from mod_actions, there's no reliable source.
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tags_category_idx").on(t.categoryId)],
);

export const creationTags = pgTable(
  "creation_tags",
  {
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    confidence: real("confidence"),
    confirmed: boolean("confirmed").notNull().default(false),
    // v2.0: creator-level hard override — rejected tags never appear regardless
    // of community votes.
    rejected: boolean("rejected").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.creationId, t.tagId] }),
    index("creation_tags_tag_creation_idx").on(t.tagId, t.creationId),
  ],
);

export const creationCategories = pgTable(
  "creation_categories",
  {
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.creationId, t.categoryId] })],
);

export interface IngestProgress {
  kindsDone: number;
  kindsTotal: number;
  currentKind: string | null;
  pageInCurrentKind: number;
  pagesPerKind: number;
}

export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  fetched: integer("fetched").notNull().default(0),
  newItems: integer("new_items").notNull().default(0),
  errors: jsonb("errors").$type<unknown[]>().notNull().default([]),
  // Live progress snapshot, updated after each page fetch during a run.
  // Nullable / empty object while the run hasn't started the loop yet.
  progress: jsonb("progress").$type<IngestProgress | null>(),
});

// ---------------- v2.0: accounts, voting, favourites, reports ----------------

export const users = pgTable(
  "users",
  {
    steamid: text("steamid").primaryKey(),
    // Short, human-readable per-site ID. #1 = first to sign up.
    shortId: serial("short_id").notNull().unique(),
    personaName: text("persona_name").notNull(),
    avatarUrl: text("avatar_url"),
    profileUrl: text("profile_url"),
    // Steam account creation timestamp, used for the 7-day minimum-age gate.
    steamCreatedAt: timestamp("steam_created_at", { withTimezone: true }),
    // Total minutes played in Scrap Mechanic (null if profile hides playtime).
    smPlaytimeMinutes: integer("sm_playtime_minutes"),
    siteJoinedAt: timestamp("site_joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    role: text("role").notNull().default("user"),
    // v2.2 moderation. bannedUntil / mutedUntil in the far future = permanent.
    bannedUntil: timestamp("banned_until", { withTimezone: true }),
    banReason: text("ban_reason"),
    // Hard ban: blocks sign-in entirely + makes getCurrentUser return null
    // even if a session cookie exists. Creator-only, never auto-expires.
    hardBanned: boolean("hard_banned").notNull().default(false),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
    muteReason: text("mute_reason"),
    warningsCount: integer("warnings_count").notNull().default(0),
    warningNote: text("warning_note"),
    // Creator can wave specific users past the 7-day Steam account-age gate —
    // useful for trusted community members on fresh Steam accounts.
    bypassAgeGate: boolean("bypass_age_gate").notNull().default(false),
    // When a mod acts on a user's age-gate appeal (grant or dismiss), this
    // stamps the moment so the /admin/appeals queue only shows unresolved
    // requests. Null = no appeal ever decided (either none submitted or the
    // user re-appealed after a dismissal).
    ageGateAppealHandledAt: timestamp("age_gate_appeal_handled_at", {
      withTimezone: true,
    }),
    // First time this user was promoted to moderator or higher. Preserved
    // across demotions — re-promoted users keep their original date. Null
    // for users who've never held a mod+ role. Display only while current
    // role is still mod+ (see /profile/[steamid]).
    moderatorSinceAt: timestamp("moderator_since_at", {
      withTimezone: true,
    }),
  },
  (t) => [
    index("users_role_idx").on(t.role),
    index("users_banned_idx").on(t.bannedUntil),
    index("users_last_seen_idx").on(t.lastSeenAt),
  ],
);

export const tagVotes = pgTable(
  "tag_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    // +1 upvote, -1 downvote. Zero or missing row = no vote.
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.creationId, t.tagId] }),
    index("tag_votes_creation_tag_idx").on(t.creationId, t.tagId),
  ],
);

export const creationVotes = pgTable(
  "creation_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.creationId] }),
    index("creation_votes_creation_idx").on(t.creationId),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.creationId] }),
    index("favorites_user_idx").on(t.userId),
    index("favorites_creation_idx").on(t.creationId),
  ],
);

/**
 * Verified views: one row per (signed-in user, creation) — ghosts don't count.
 * Upserted when the user opens the creation detail page; lastViewedAt tracks
 * repeat views. COUNT(*) per creationId gives the site-native view count.
 */
export const creationViews = pgTable(
  "creation_views",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    firstViewedAt: timestamp("first_viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.creationId] }),
    index("creation_views_creation_idx").on(t.creationId),
  ],
);

// A report targets exactly one of: a creation (card-level flag) or a
// comment (moderation of in-thread content). XOR via CHECK constraint.
export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    creationId: text("creation_id").references(() => creations.id, {
      onDelete: "cascade",
    }),
    commentId: integer("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    // Null when source = 'auto' (machine-generated report).
    reporterUserId: text("reporter_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    customText: text("custom_text"),
    source: text("source").notNull().default("user"),
    status: text("status").notNull().default("open"),
    resolverUserId: text("resolver_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
    resolverNote: text("resolver_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_creation_status_idx").on(t.creationId, t.status),
    index("reports_comment_idx").on(t.commentId),
    check(
      "reports_target_xor",
      sql`(${t.creationId} IS NOT NULL AND ${t.commentId} IS NULL) OR (${t.creationId} IS NULL AND ${t.commentId} IS NOT NULL)`,
    ),
  ],
);

// A comment targets exactly one of: a creation (detail-page thread) or a
// user profile (wall-style guestbook). The XOR is enforced by a CHECK.
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    creationId: text("creation_id").references(() => creations.id, {
      onDelete: "cascade",
    }),
    profileSteamid: text("profile_steamid").references(() => users.steamid, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    // Self-reference to parent; not a FK to keep drizzle-kit happy.
    parentId: integer("parent_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: text("deleted_by_user_id"),
    // Denormalized vote tallies — kept in sync by voteComment's recompute.
    // Lets card rendering stay a single join instead of a per-comment
    // aggregate on every load.
    votesUp: integer("votes_up").notNull().default(0),
    votesDown: integer("votes_down").notNull().default(0),
  },
  (t) => [
    index("comments_creation_idx").on(t.creationId),
    index("comments_profile_idx").on(t.profileSteamid),
    index("comments_user_idx").on(t.userId),
    check(
      "comments_target_xor",
      sql`(${t.creationId} IS NOT NULL AND ${t.profileSteamid} IS NULL) OR (${t.creationId} IS NULL AND ${t.profileSteamid} IS NOT NULL)`,
    ),
  ],
);

export const commentVotes = pgTable(
  "comment_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.commentId] }),
    index("comment_votes_comment_idx").on(t.commentId),
  ],
);

// Daily Blockdle finishers — one row per signed-in user per UTC day,
// recording whether they won and how many guesses they used. Drives
// the /minigames/blockdle leaderboard. Only written on the first
// terminal submission (won or lost) for that day via
// onConflictDoNothing, so a crash/retry can't overwrite a real attempt.
export const blockdleDailyResults = pgTable(
  "blockdle_daily_results",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    dateIsoUtc: text("date_iso_utc").notNull(),
    guessesUsed: integer("guesses_used").notNull(),
    won: boolean("won").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.dateIsoUtc] }),
    index("blockdle_daily_results_date_idx").on(t.dateIsoUtc),
  ],
);

export type Creation = typeof creations.$inferSelect;
export type NewCreation = typeof creations.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export const SUGGESTION_STATUSES = [
  "submitted",
  "approved",
  "rejected",
  "implemented",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const featureSuggestions = pgTable(
  "feature_suggestions",
  {
    id: serial("id").primaryKey(),
    submitterUserId: text("submitter_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body"),
    status: text("status").notNull().default("submitted"),
    approvedByUserId: text("approved_by_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    implementedAt: timestamp("implemented_at", { withTimezone: true }),
    creatorNote: text("creator_note"),
    // Base64 data URI of an image the submitter attached (mockups, screenshots,
    // sketches). Stored inline in the DB instead of an external blob host to
    // stay strictly free-tier. Capped at ~500 KB of binary via the submit
    // action.
    imageDataUri: text("image_data_uri"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("feature_suggestions_status_idx").on(t.status)],
);

export const featureSuggestionVotes = pgTable(
  "feature_suggestion_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    suggestionId: integer("suggestion_id")
      .notNull()
      .references(() => featureSuggestions.id, { onDelete: "cascade" }),
    // +1 upvote, -1 downvote. No row = no vote.
    value: integer("value").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.suggestionId] }),
    index("feature_suggestion_votes_suggestion_idx").on(t.suggestionId),
  ],
);

export const NOTIFICATION_TIERS = [
  "user",
  "moderator",
  "elite_moderator",
  "creator",
] as const;
export type NotificationTier = (typeof NOTIFICATION_TIERS)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    type: text("type").notNull(),
    // Which coloured bell this notification shows up under. 'user' = grey,
    // 'moderator' = blue, 'elite_moderator' = gold, 'creator' = purple.
    tier: text("tier").notNull().default("user"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_user_read_idx").on(t.userId, t.read),
    index("notifications_user_tier_read_idx").on(t.userId, t.tier, t.read),
  ],
);

// Per-badge allowlist of steamids that should receive the badge
// automatically at sign-in. Intentionally NOT an FK to users.steamid —
// creators add influencers before they've signed in, so the user row may
// not exist yet. The sign-in handler reconciles by granting user_badges
// rows whenever someone on the allowlist first signs in.
export const badgeAutogrants = pgTable(
  "badge_autogrants",
  {
    slug: text("slug").notNull(),
    steamid: text("steamid").notNull(),
    label: text("label"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    addedByUserId: text("added_by_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
  },
  (t) => [
    primaryKey({ columns: [t.slug, t.steamid] }),
    index("badge_autogrants_steamid_idx").on(t.steamid),
  ],
);

export type BadgeAutogrant = typeof badgeAutogrants.$inferSelect;
export type NewBadgeAutogrant = typeof badgeAutogrants.$inferInsert;

// Badge slugs live in TypeScript (see lib/badges/definitions.ts) rather than
// a badges table — the catalog is small and code-owned, so rows here are
// just the grants themselves.
export const userBadges = pgTable(
  "user_badges",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    badgeSlug: text("badge_slug").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // null = auto-granted by the system (e.g. beta-tester on sign-in).
    grantedByUserId: text("granted_by_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
    note: text("note"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.badgeSlug] }),
    index("user_badges_badge_idx").on(t.badgeSlug),
  ],
);

export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;

// V9.1 audit log — every non-trivial mod action writes one row here.
// Listed on /admin/audit for any mod+, filterable by actor/action/target.
// `actorName` is a snapshot so the row stays legible even if the actor
// renames themselves on Steam or is later deleted. `metadata` holds the
// action's contextual details (reason, previous value, etc.) as jsonb so
// new actions don't need schema migrations.
export const modActions = pgTable(
  "mod_actions",
  {
    id: serial("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    summary: text("summary"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("mod_actions_created_at_idx").on(t.createdAt.desc()),
    index("mod_actions_actor_idx").on(t.actorUserId),
    index("mod_actions_action_idx").on(t.action),
    index("mod_actions_target_idx").on(t.targetType, t.targetId),
  ],
);

export type ModAction = typeof modActions.$inferSelect;
export type NewModAction = typeof modActions.$inferInsert;

// ---------------- Changelog ----------------
// Two tiers match how the Creator actually thinks about ship cadence:
// "update" for meaningful new features a user would care about, "patch"
// for small fixes or incremental polish. Both share the same table —
// the public page shows them together with a visible pill, the tab
// filter defaults to Updates so the big stuff is seen first.
export const CHANGELOG_TIERS = ["update", "patch"] as const;
export type ChangelogTier = (typeof CHANGELOG_TIERS)[number];

export const changelogEntries = pgTable(
  "changelog_entries",
  {
    id: serial("id").primaryKey(),
    tier: text("tier").notNull().default("update"),
    title: text("title").notNull(),
    body: text("body"),
    authorUserId: text("author_user_id").references(() => users.steamid, {
      onDelete: "set null",
    }),
    // Entries are drafted then published — `publishedAt` null means draft,
    // only-Creator-visible; setting it fires notifications and flips the
    // entry public.
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete so a hasty un-publish doesn't wipe history. The public
    // reader filters on `deletedAt is null`; admin sees everything.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("changelog_entries_published_at_idx").on(t.publishedAt),
    index("changelog_entries_tier_idx").on(t.tier),
  ],
);

// Per-user last-seen tracker for the "unread" pill next to the top-bar
// link. `lastSeenEntryId` = highest changelog entry id the user has
// visibly seen. Rows only exist for users who've ever opened /changelog.
export const changelogReads = pgTable("changelog_reads", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.steamid, { onDelete: "cascade" }),
  lastSeenEntryId: integer("last_seen_entry_id").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Scheduled deploy announcements. Each row represents "at scheduled_at,
// someone is going to push a new version live." The site reads the most
// recent row whose scheduled_at is within a short window (future or up to
// 30s past) and renders a top-bar countdown. Inserted by `scripts/deploy.ts`
// 60 seconds before running `git push`, so visitors see the warning before
// Vercel starts the rebuild. Rows are never deleted — they serve as a
// lightweight deploy log too.
export const deployAnnouncements = pgTable("deploy_announcements", {
  id: serial("id").primaryKey(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Stamped by `scripts/complete-deploy.ts` during the Vercel build after
  // `next build` finishes. Until this is set the banner keeps showing
  // "Deploying now…" forever — we can't reliably guess when a rolling
  // deploy actually goes live from inside the old bundle, so we wait for
  // the new bundle's build step to tell us. Once the client sees a
  // non-null completedAt it auto-reloads (once per announcement, via
  // sessionStorage) to pick up the new code.
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type NewChangelogEntry = typeof changelogEntries.$inferInsert;
export type ChangelogRead = typeof changelogReads.$inferSelect;
export type DeployAnnouncement = typeof deployAnnouncements.$inferSelect;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type FeatureSuggestion = typeof featureSuggestions.$inferSelect;
export type NewFeatureSuggestion = typeof featureSuggestions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
