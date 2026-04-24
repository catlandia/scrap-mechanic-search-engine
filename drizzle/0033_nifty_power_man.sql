-- This migration is drizzle-kit regenerated but a few statements are
-- guarded because the prior snapshot (0032) didn't capture the manual
-- changes made in 0031_mod_actions_audit.sql (which was hand-written for
-- V9.1's audit log + tag/category attribution columns). IF NOT EXISTS
-- guards make this re-runnable in environments that already have those
-- objects.

CREATE TABLE IF NOT EXISTS "mod_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_name" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"summary" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "moderator_since_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mod_actions" ADD CONSTRAINT "mod_actions_actor_user_id_users_steamid_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_created_at_idx" ON "mod_actions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_actor_idx" ON "mod_actions" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_action_idx" ON "mod_actions" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_target_idx" ON "mod_actions" USING btree ("target_type","target_id");--> statement-breakpoint

-- Backfill moderator_since_at for existing moderator+ users. Use the
-- earliest user.setRole audit entry that promoted them to mod+ if one
-- exists (requires V9.1+ audit log); fall back to site_joined_at. The
-- Creator role is set directly in the DB and never goes through
-- setUserRole, so it falls back too.
UPDATE "users" u
SET "moderator_since_at" = COALESCE(
  (SELECT MIN(ma.created_at)
     FROM mod_actions ma
     WHERE ma.target_type = 'user'
       AND ma.target_id = u.steamid
       AND ma.action = 'user.setRole'
       AND (ma.metadata->>'to') IN ('moderator', 'elite_moderator', 'creator')),
  u.site_joined_at
)
WHERE u.role IN ('moderator', 'elite_moderator', 'creator')
  AND u.moderator_since_at IS NULL;
