import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
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
    // Short public-facing id. Auto-incrementing; used in user-facing URLs
    // like /creation/42 while `id` stays the Steam publishedfileid used for
    // ingest upserts and joins.
    shortId: serial("short_id").notNull().unique(),
    title: text("title").notNull(),
    descriptionRaw: text("description_raw").notNull().default(""),
    descriptionClean: text("description_clean").notNull().default(""),
    authorSteamid: text("author_steamid"),
    authorName: text("author_name"),
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
  ],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
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

export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  fetched: integer("fetched").notNull().default(0),
  newItems: integer("new_items").notNull().default(0),
  errors: jsonb("errors").$type<unknown[]>().notNull().default([]),
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
  },
  (t) => [
    index("users_role_idx").on(t.role),
    index("users_banned_idx").on(t.bannedUntil),
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

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
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
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    creationId: text("creation_id")
      .notNull()
      .references(() => creations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.steamid, { onDelete: "cascade" }),
    // Reserved for future threading; not a FK to keep drizzle-kit happy.
    parentId: integer("parent_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: text("deleted_by_user_id"),
  },
  (t) => [
    index("comments_creation_idx").on(t.creationId),
    index("comments_user_idx").on(t.userId),
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

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type FeatureSuggestion = typeof featureSuggestions.$inferSelect;
export type NewFeatureSuggestion = typeof featureSuggestions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
