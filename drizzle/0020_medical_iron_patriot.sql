CREATE TABLE "user_badges" (
	"user_id" text NOT NULL,
	"badge_slug" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by_user_id" text,
	"note" text,
	CONSTRAINT "user_badges_user_id_badge_slug_pk" PRIMARY KEY("user_id","badge_slug")
);
--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_granted_by_user_id_users_steamid_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_badges_badge_idx" ON "user_badges" USING btree ("badge_slug");