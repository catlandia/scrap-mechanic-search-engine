CREATE TABLE "feature_suggestion_votes" (
	"user_id" text NOT NULL,
	"suggestion_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_suggestion_votes_user_id_suggestion_id_pk" PRIMARY KEY("user_id","suggestion_id")
);
--> statement-breakpoint
CREATE TABLE "feature_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submitter_user_id" text,
	"title" text NOT NULL,
	"body" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"implemented_at" timestamp with time zone,
	"creator_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_suggestion_votes" ADD CONSTRAINT "feature_suggestion_votes_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_suggestion_votes" ADD CONSTRAINT "feature_suggestion_votes_suggestion_id_feature_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."feature_suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_suggestions" ADD CONSTRAINT "feature_suggestions_submitter_user_id_users_steamid_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_suggestions" ADD CONSTRAINT "feature_suggestions_approved_by_user_id_users_steamid_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("steamid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_suggestion_votes_suggestion_idx" ON "feature_suggestion_votes" USING btree ("suggestion_id");--> statement-breakpoint
CREATE INDEX "feature_suggestions_status_idx" ON "feature_suggestions" USING btree ("status");