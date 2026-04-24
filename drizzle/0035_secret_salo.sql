ALTER TABLE "deploy_announcements" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
