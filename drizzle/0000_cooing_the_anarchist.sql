CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "creation_categories" (
	"creation_id" text NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "creation_categories_creation_id_category_id_pk" PRIMARY KEY("creation_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "creation_tags" (
	"creation_id" text NOT NULL,
	"tag_id" integer NOT NULL,
	"source" text NOT NULL,
	"confidence" real,
	"confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "creation_tags_creation_id_tag_id_pk" PRIMARY KEY("creation_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "creations" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description_raw" text DEFAULT '' NOT NULL,
	"description_clean" text DEFAULT '' NOT NULL,
	"author_steamid" text,
	"author_name" text,
	"thumbnail_url" text,
	"steam_url" text NOT NULL,
	"file_size_bytes" bigint,
	"time_created" timestamp with time zone,
	"time_updated" timestamp with time zone,
	"vote_score" real,
	"votes_up" integer,
	"votes_down" integer,
	"subscriptions" integer DEFAULT 0 NOT NULL,
	"favorites" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"steam_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"fetched" integer DEFAULT 0 NOT NULL,
	"new_items" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_id" integer,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "creation_categories" ADD CONSTRAINT "creation_categories_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_categories" ADD CONSTRAINT "creation_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_tags" ADD CONSTRAINT "creation_tags_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_tags" ADD CONSTRAINT "creation_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creation_tags_tag_creation_idx" ON "creation_tags" USING btree ("tag_id","creation_id");--> statement-breakpoint
CREATE INDEX "creations_status_idx" ON "creations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "creations_kind_idx" ON "creations" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "creations_approved_at_idx" ON "creations" USING btree ("approved_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "creations_time_updated_idx" ON "creations" USING btree ("time_updated");--> statement-breakpoint
CREATE INDEX "tags_category_idx" ON "tags" USING btree ("category_id");