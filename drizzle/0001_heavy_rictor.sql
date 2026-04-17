ALTER TABLE "creations" ADD COLUMN "short_id" serial NOT NULL;--> statement-breakpoint
CREATE INDEX "creations_author_idx" ON "creations" USING btree ("author_steamid");--> statement-breakpoint
ALTER TABLE "creations" ADD CONSTRAINT "creations_short_id_unique" UNIQUE("short_id");