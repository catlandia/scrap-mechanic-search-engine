import {
  bigint,
  boolean,
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

export const CREATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type CreationStatus = (typeof CREATION_STATUSES)[number];

export const TAG_SOURCES = ["keyword", "steam", "admin"] as const;
export type TagSource = (typeof TAG_SOURCES)[number];

export const creations = pgTable(
  "creations",
  {
    id: text("id").primaryKey(),
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
  },
  (t) => [
    index("creations_status_idx").on(t.status),
    index("creations_kind_idx").on(t.kind),
    index("creations_approved_at_idx").on(t.approvedAt.desc()),
    index("creations_time_updated_idx").on(t.timeUpdated),
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

export type Creation = typeof creations.$inferSelect;
export type NewCreation = typeof creations.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Category = typeof categories.$inferSelect;
