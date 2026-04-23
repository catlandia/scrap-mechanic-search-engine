-- V8.17: reclassify every legacy creation.kind='other' row into 'mod'.
-- `detectKind` in lib/steam/client.ts now falls through to 'mod' for items
-- without a recognised Steam kind tag, so the historical /other backlog
-- should be flattened into /mods for consistency. Purely a data migration
-- — no schema change.
UPDATE "creations" SET "kind" = 'mod' WHERE "kind" = 'other';
