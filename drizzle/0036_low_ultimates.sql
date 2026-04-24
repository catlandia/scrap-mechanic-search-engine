ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_refreshed_at" timestamp with time zone;
