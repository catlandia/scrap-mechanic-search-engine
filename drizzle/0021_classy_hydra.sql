CREATE TABLE "badge_autogrants" (
	"slug" text NOT NULL,
	"steamid" text NOT NULL,
	"label" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by_user_id" text,
	CONSTRAINT "badge_autogrants_slug_steamid_pk" PRIMARY KEY("slug","steamid")
);
--> statement-breakpoint
ALTER TABLE "badge_autogrants" ADD CONSTRAINT "badge_autogrants_added_by_user_id_users_steamid_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "badge_autogrants_steamid_idx" ON "badge_autogrants" USING btree ("steamid");