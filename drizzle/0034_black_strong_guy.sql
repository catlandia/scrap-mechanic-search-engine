CREATE TABLE IF NOT EXISTS "deploy_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deploy_announcements_scheduled_idx" ON "deploy_announcements" ("scheduled_at" DESC);
