CREATE TABLE "creation_views" (
	"user_id" text NOT NULL,
	"creation_id" text NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creation_views_user_id_creation_id_pk" PRIMARY KEY("user_id","creation_id")
);
--> statement-breakpoint
ALTER TABLE "creation_views" ADD CONSTRAINT "creation_views_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation_views" ADD CONSTRAINT "creation_views_creation_id_creations_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creation_views_creation_idx" ON "creation_views" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX "favorites_creation_idx" ON "favorites" USING btree ("creation_id");