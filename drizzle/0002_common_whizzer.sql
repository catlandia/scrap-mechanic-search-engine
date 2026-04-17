CREATE TABLE "creation_votes" (
	"user_id" text NOT NULL,
	"creation_id" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creation_votes_user_id_creation_id_pk" PRIMARY KEY("user_id","creation_id")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text NOT NULL,
	"creation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_creation_id_pk" PRIMARY KEY("user_id","creation_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"creation_id" text NOT NULL,
	"reporter_user_id" text,
	"reason" text NOT NULL,
	"custom_text" text,
	"source" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolver_user_id" text,
	"resolver_note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_votes" (
	"user_id" text NOT NULL,
	"creation_id" text NOT NULL,
	"tag_id" integer NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_votes_user_id_creation_id_tag_id_pk" PRIMARY KEY("user_id","creation_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"steamid" text PRIMARY KEY NOT NULL,
	"persona_name" text NOT NULL,
	"avatar_url" text,
	"profile_url" text,
	"steam_created_at" timestamp with time zone,
	"sm_playtime_minutes" integer,
	"site_joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creation_tags" ADD COLUMN "rejected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creations" ADD COLUMN "uploaded_by_user_id" text;--> statement-breakpoint
ALTER TABLE "creations" ADD COLUMN "reviewed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "creation_votes" ADD CONSTRAINT "creation_votes_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_votes" ADD CONSTRAINT "creation_votes_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_users_steamid_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolver_user_id_users_steamid_fk" FOREIGN KEY ("resolver_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_votes" ADD CONSTRAINT "tag_votes_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_votes" ADD CONSTRAINT "tag_votes_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_votes" ADD CONSTRAINT "tag_votes_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creation_votes_creation_idx" ON "creation_votes" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_creation_status_idx" ON "reports" USING btree ("creation_id","status");--> statement-breakpoint
CREATE INDEX "tag_votes_creation_tag_idx" ON "tag_votes" USING btree ("creation_id","tag_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");