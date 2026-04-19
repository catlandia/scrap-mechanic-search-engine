CREATE TABLE "changelog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier" text DEFAULT 'update' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"author_user_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "changelog_reads" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_seen_entry_id" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_author_user_id_users_steamid_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_reads" ADD CONSTRAINT "changelog_reads_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changelog_entries_published_at_idx" ON "changelog_entries" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "changelog_entries_tier_idx" ON "changelog_entries" USING btree ("tier");