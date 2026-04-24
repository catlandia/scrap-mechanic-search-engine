-- Minimal migration: adds moderator_since_at to users and backfills for
-- existing mod+ accounts. Drizzle-kit initially regenerated 0031's
-- mod_actions + tag/category attribution statements here too (the 0032
-- snapshot predated those hand-written additions), but re-including them
-- tripped the neon-http migrator in prod. Stripped to the one column
-- that's genuinely new plus its backfill. The breakpoint between the
-- two statements below is load-bearing: neon HTTP executes one
-- statement per call, so drizzle needs the marker to split them.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "moderator_since_at" timestamp with time zone;
--> statement-breakpoint
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
