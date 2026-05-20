-- Tiny key-value store for Creator-toggleable global flags from
-- /admin/abuse. Each row is a singleton; reads happen on every layout
-- render via a short-TTL unstable_cache wrap, writes flip the state on
-- the next refresh window.
CREATE TABLE IF NOT EXISTS "site_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- Seed the "claude_outage" flag in the OFF state. Creator flips this
-- from /admin/abuse → "Not actually abuse" section when development
-- is paused waiting on subscription renewal.
INSERT INTO "site_flags" ("key", "enabled")
VALUES ('claude_outage', false)
ON CONFLICT ("key") DO NOTHING;
