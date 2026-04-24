-- V9.9 — Per-kind top-creator crown badges.
-- Eight new auto-managed sibling badges to the overall `top_creator`, one
-- per CreationKind. This migration has no schema change; it only seeds the
-- initial per-kind winners so the badges are live on deploy day without
-- having to wait for the next approve/archive to trigger a refresh.
--
-- Same eligibility + tiebreak rules as refreshTopCreatorBadge() — site
-- account required, hard-banned users excluded, tie-break on
-- site_joined_at ASC. Eight near-identical blocks (one per kind) rather
-- than a DO $$ loop: the neon-http migrator previously failed on PL/pgSQL
-- EXCEPTION blocks (see V9.5 0033 hotfix), so we keep it plain SQL.
--
-- Idempotent: user_badges has a composite PK on (user_id, badge_slug) so
-- re-running the migration is a no-op for a user already holding the
-- right badge. Rerunning against a drifted state won't *revoke* wrong
-- grants — but subsequent mod actions route through
-- refreshAllTopCreatorBadges() which does the full rewrite.

-- Blueprint
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'blueprint'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'blueprint'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_blueprint', NULL, 'Auto-granted: most approved blueprint creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- Mod
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'mod'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'mod'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_mod', NULL, 'Auto-granted: most approved mod creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- World
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'world'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'world'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_world', NULL, 'Auto-granted: most approved world creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- Challenge
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'challenge'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'challenge'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_challenge', NULL, 'Auto-granted: most approved challenge creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- Tile
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'tile'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'tile'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_tile', NULL, 'Auto-granted: most approved tile creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- Custom Game
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'custom_game'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'custom_game'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_custom_game', NULL, 'Auto-granted: most approved custom_game creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- Terrain Asset
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'terrain_asset'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'terrain_asset'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_terrain_asset', NULL, 'Auto-granted: most approved terrain_asset creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- Other
WITH combined AS (
  SELECT id AS creation_id, author_steamid AS steamid
  FROM creations WHERE status = 'approved' AND author_steamid IS NOT NULL AND kind = 'other'
  UNION
  SELECT c.id, (elem->>'steamid')::text
  FROM creations c, jsonb_array_elements(c.creators) AS elem
  WHERE c.status = 'approved' AND c.kind = 'other'
),
agg AS (
  SELECT steamid, COUNT(DISTINCT creation_id)::int AS cnt
  FROM combined WHERE steamid IS NOT NULL GROUP BY steamid
),
winner AS (
  SELECT a.steamid FROM agg a
  INNER JOIN users u ON u.steamid = a.steamid
  WHERE u.hard_banned = false
  ORDER BY a.cnt DESC, u.site_joined_at ASC NULLS LAST, a.steamid ASC
  LIMIT 1
)
INSERT INTO user_badges (user_id, badge_slug, granted_by_user_id, note)
SELECT steamid, 'top_creator_other', NULL, 'Auto-granted: most approved other creations.'
FROM winner
ON CONFLICT (user_id, badge_slug) DO NOTHING;
--> statement-breakpoint

-- V9.9 on-site changelog entry. Idempotent via title guard.
INSERT INTO "changelog_entries" ("tier", "title", "body", "published_at")
SELECT
  'update',
  'V9.9 — Per-kind top-creator crowns + /creators kind filter',
  $$Eight new auto-managed sibling crowns to the existing 👑 **Top creator** badge — one per creation kind. A player who dominates Blueprints but not Worlds today gets no visible recognition; now every kind has its own champion.

**New badges.** 🏗️ **Top Blueprint creator**, 🔧 **Top Mod creator**, 🌍 **Top World creator**, 🎯 **Top Challenge creator**, 🧩 **Top Tile creator**, 🎮 **Top Custom-Game creator**, 🏔️ **Top Terrain creator**, ⭐ **Top Other creator**. Each is assigned automatically to the single site-account holder with the most approved creations **of that kind**, using the same counting logic as the overall crown (authors + co-authors, DISTINCT on creation id, hard-banned users excluded, tie-break on earliest to the site). The overall `top_creator` stays untouched — these are siblings, not replacements, so a player can hold the overall crown AND one or more per-kind crowns simultaneously.

**Kind filter on `/creators`.** The leaderboard now accepts `?kind=X` and shows a pill row at the top to flip between All, Blueprint, Mod, World, Challenge, Tile, Custom Game, Terrain, Other. Filter state lives in the URL so it survives refresh and can be linked directly — useful for "who's the most active mod author this site has ever seen" style questions.

**Refresh wiring.** Every server action that can shift a per-kind count — approve, quick-approve, archive from report, manual archive, restore from archive, hard-delete, admin-add auto-approve, re-scrape creators, and (critically) `setCreationKind` — now routes through a single `refreshAllTopCreatorBadges()` entry point that recomputes both the overall crown and all eight kind-specific ones sequentially. `setCreationKind` was the gotcha: flipping a creation's kind moves it between two buckets, so both the old kind's leader and the new kind's leader can change in a single call.

**Admin visibility.** All eight new slugs join `SYSTEM_AUTO_BADGES`, so the `/admin/users` BadgeManager hides manual grant/revoke buttons for them — manual grants would just be reverted on the next count-changing action. The `grantBadgeAction` server action also throws `badge_system_auto_managed` defensively if any of them are called directly.

**Backfill.** Migration `0037` seeds the initial winners at deploy time across all eight kinds — no waiting for the next approval cycle to populate the crowns.$$,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "changelog_entries"
  WHERE "title" = 'V9.9 — Per-kind top-creator crowns + /creators kind filter'
);
