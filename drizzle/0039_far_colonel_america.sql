CREATE TABLE "game_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"steam_app_id" integer,
	"thumbnail_url" text,
	"score" integer,
	"body" text DEFAULT '' NOT NULL,
	"pros" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_user_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "game_reviews_slug_unique" UNIQUE("slug"),
	CONSTRAINT "game_reviews_score_range" CHECK ("game_reviews"."score" IS NULL OR ("game_reviews"."score" >= 0 AND "game_reviews"."score" <= 100))
);
--> statement-breakpoint
ALTER TABLE "game_reviews" ADD CONSTRAINT "game_reviews_author_user_id_users_steamid_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_reviews_published_at_idx" ON "game_reviews" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "game_reviews_slug_idx" ON "game_reviews" USING btree ("slug");