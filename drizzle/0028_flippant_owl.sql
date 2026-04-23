CREATE TABLE "blockdle_daily_results" (
	"user_id" text NOT NULL,
	"date_iso_utc" text NOT NULL,
	"guesses_used" integer NOT NULL,
	"won" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blockdle_daily_results_user_id_date_iso_utc_pk" PRIMARY KEY("user_id","date_iso_utc")
);
--> statement-breakpoint
ALTER TABLE "blockdle_daily_results" ADD CONSTRAINT "blockdle_daily_results_user_id_users_steamid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steamid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blockdle_daily_results_date_idx" ON "blockdle_daily_results" USING btree ("date_iso_utc");