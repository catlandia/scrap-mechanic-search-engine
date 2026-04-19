ALTER TABLE "comments" ALTER COLUMN "creation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "creation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "profile_steamid" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "comment_id" integer;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_profile_steamid_users_steamid_fk" FOREIGN KEY ("profile_steamid") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_profile_idx" ON "comments" USING btree ("profile_steamid");--> statement-breakpoint
CREATE INDEX "reports_comment_idx" ON "reports" USING btree ("comment_id");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_target_xor" CHECK (("comments"."creation_id" IS NOT NULL AND "comments"."profile_steamid" IS NULL) OR ("comments"."creation_id" IS NULL AND "comments"."profile_steamid" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_xor" CHECK (("reports"."creation_id" IS NOT NULL AND "reports"."comment_id" IS NULL) OR ("reports"."creation_id" IS NULL AND "reports"."comment_id" IS NOT NULL));