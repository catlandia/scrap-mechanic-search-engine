ALTER TABLE "users" ADD COLUMN "banned_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "muted_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mute_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "warnings_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "warning_note" text;--> statement-breakpoint
CREATE INDEX "users_banned_idx" ON "users" USING btree ("banned_until");