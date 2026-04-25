-- Defensive heal pass for `game_reviews` (V9.20). The neon-http migrator
-- has no transactions, so 0039 marked itself applied in
-- `__drizzle_migrations` even though the CREATE TABLE statement didn't
-- land in prod. Re-running 0039 is impossible because drizzle hashes
-- migrations and skips ones it's already recorded. This migration
-- re-issues every 0039 statement as IF NOT EXISTS so any partially-
-- applied environment lands at the correct end state, and any cleanly-
-- applied environment is a no-op.

CREATE TABLE IF NOT EXISTS "game_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"steam_app_id" integer,
	"thumbnail_url" text,
	"score" integer,
	"body" text DEFAULT '' NOT NULL,
	"pros" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_user_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "game_reviews_slug_unique" UNIQUE("slug"),
	CONSTRAINT "game_reviews_score_range" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100))
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_reviews_author_user_id_users_steamid_fk') THEN
    ALTER TABLE "game_reviews" ADD CONSTRAINT "game_reviews_author_user_id_users_steamid_fk"
      FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_reviews_published_at_idx" ON "game_reviews" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_reviews_slug_idx" ON "game_reviews" USING btree ("slug");
