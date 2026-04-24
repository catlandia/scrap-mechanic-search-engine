-- Minimal migration — only what's genuinely new in V9.3. Drizzle-kit
-- initially regenerated the mod_actions table + tag/category attribution
-- statements too (the 0032 snapshot didn't capture 0031's hand-written
-- additions), but those are already applied in every live environment
-- and re-including them here with a DO block for the FK tripped the
-- neon-http migrator mid-migration, leaving prod with a half-applied
-- 0033 and 500s on every auth path. Stripped to the one column that's
-- actually new.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "moderator_since_at" timestamp with time zone;

-- Backfill: for current moderator+ users, use the earliest user.setRole
-- audit entry that promoted them to mod+ if one exists, else fall back
-- to site_joined_at. The Creator's role is set directly in the DB and
-- never goes through setUserRole, so it also falls back.
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
