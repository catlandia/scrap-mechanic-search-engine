ALTER TABLE "users" ADD COLUMN "short_id" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_short_id_unique" UNIQUE("short_id");