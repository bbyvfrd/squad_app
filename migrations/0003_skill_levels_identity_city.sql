CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'amateur', 'advanced', 'professional');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"name" text NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "cities_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "cities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "client_sport_skills" (
	"profile_id" uuid NOT NULL,
	"sport_id" smallint NOT NULL,
	"skill_level" "skill_level" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_sport_skills_profile_id_sport_id_pk" PRIMARY KEY("profile_id","sport_id")
);
--> statement-breakpoint
ALTER TABLE "client_sport_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "display_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "skill_level" "skill_level";--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "city_id" smallint;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "full_name" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "full_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "city_id" smallint;--> statement-breakpoint
ALTER TABLE "client_sport_skills" ADD CONSTRAINT "client_sport_skills_profile_id_client_profiles_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."client_profiles"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_sport_skills" ADD CONSTRAINT "client_sport_skills_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_sport_skills_sport_idx" ON "client_sport_skills" USING btree ("sport_id");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_city_starts_idx" ON "games" USING btree ("city_id","starts_at") WHERE deleted_at is null;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "chk_games_ends_after_starts" CHECK (ends_at is null or ends_at > starts_at);--> statement-breakpoint
CREATE POLICY "cities_read" ON "cities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "csk_select" ON "client_sport_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "csk_write" ON "client_sport_skills" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = profile_id) WITH CHECK ((select auth.uid()) = profile_id);