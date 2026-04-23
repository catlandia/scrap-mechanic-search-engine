-- V9.1 — mod_actions audit log + tag/category attribution columns.
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
DO $$ BEGIN
  ALTER TABLE "mod_actions"
    ADD CONSTRAINT "mod_actions_actor_user_id_users_steamid_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("steamid") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_created_at_idx" ON "mod_actions" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_actor_idx" ON "mod_actions" ("actor_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_action_idx" ON "mod_actions" ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_actions_target_idx" ON "mod_actions" ("target_type", "target_id");
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
-- Initial top-creator badge backfill. Same logic as refreshTopCreatorBadge()
-- in lib/badges/top-creator.ts — pick the eligible user with the most approved
-- creations (counting authors + co-authors, distinct on creation id), revoke
-- the badge from anyone else, grant it to them. Re-running this migration is
-- a no-op because user_badges is guarded by its composite PK.
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations
  WHERE status = 'approved' AND author_steamid IS NOT NULL
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined
  WHERE steamid IS NOT NULL
  GROUP BY steamid
),
winner AS (
  SELECT a.steamid
  FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator', NULL, 'Auto-granted: most approved creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint
DELETE FROM user_badges
WHERE badge_slug = 'top_creator'
  AND user_id NOT IN (
    SELECT winner.steamid FROM (
      WITH combined AS (
        SELECT id AS creation_id, author_steamid AS steamid
        FROM creations
        WHERE status = 'approved' AND author_steamid IS NOT NULL
        UNION
        SELECT c.id, (elem->>'steamid')::text
        FROM creations c, jsonb_array_elements(c.creators) AS elem
        WHERE c.status = 'approved'
      ),
      agg AS (
        SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
        FROM combined
        WHERE steamid IS NOT NULL
        GROUP BY steamid
      )
      SELECT a.steamid
      FROM agg a
      INNER JOIN users u ON u.steamid = a.steamid
      WHERE u.hard_banned = false
      ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
      LIMIT 1
    ) AS winner
  );
