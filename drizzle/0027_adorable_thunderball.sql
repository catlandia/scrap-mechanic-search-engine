ALTER TABLE "creations" ALTER COLUMN "short_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "creations" ALTER COLUMN "short_id" DROP NOT NULL;--> statement-breakpoint
-- Stop burning short_id sequence numbers on inserts. The column is now
-- nullable and only gets a value when the creation is approved (via
-- `COALESCE(short_id, nextval('creations_short_id_seq'))` in approveCreation
-- / quickApprove / autoApprove). This keeps visible IDs tracking the approved
-- catalog size instead of drifting upward as pending items get rejected.
ALTER TABLE "creations" ALTER COLUMN "short_id" DROP DEFAULT;--> statement-breakpoint
-- Backfill: clear short_id on rows that never reached the public site so the
-- sequence can be reset downward. Approved / archived / deleted rows keep
-- their existing short_id — archive↔restore and deep links stay stable.
UPDATE "creations" SET "short_id" = NULL WHERE "status" IN ('pending', 'rejected');--> statement-breakpoint
-- Re-anchor the sequence to MAX(short_id) so the next approval picks up
-- right after the highest currently-assigned number.
SELECT setval(
  pg_get_serial_sequence('creations', 'short_id'),
  GREATEST((SELECT COALESCE(MAX(short_id), 0) FROM creations), 1)
);
