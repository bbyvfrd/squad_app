CREATE TYPE "public"."game_status" AS ENUM('open', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."participation_status" AS ENUM('requested', 'approved', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"is_player" boolean DEFAULT false NOT NULL,
	"is_organizer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_client_capability" CHECK (is_player or is_organizer)
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organizer_id" uuid NOT NULL,
	"sport_id" smallint NOT NULL,
	"venue_id" uuid,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"capacity" smallint NOT NULL,
	"location_text" text,
	"notes" text,
	"status" "game_status" DEFAULT 'open' NOT NULL,
	"share_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_games_capacity" CHECK (capacity > 0)
);
--> statement-breakpoint
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "participations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "participation_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_participation" UNIQUE("game_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "participations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sports" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"name" text NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "sports_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "sports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "venue_owner_profiles" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"business_name" text,
	"contact_phone" text,
	"contact_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "venue_owner_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "venue_sports" (
	"venue_id" uuid NOT NULL,
	"sport_id" smallint NOT NULL,
	CONSTRAINT "venue_sports_venue_id_sport_id_pk" PRIMARY KEY("venue_id","sport_id")
);
--> statement-breakpoint
ALTER TABLE "venue_sports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"contact_info" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_organizer_id_profiles_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_player_id_profiles_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_owner_profiles" ADD CONSTRAINT "venue_owner_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_sports" ADD CONSTRAINT "venue_sports_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_sports" ADD CONSTRAINT "venue_sports_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_sport_starts_idx" ON "games" USING btree ("sport_id","starts_at");--> statement-breakpoint
CREATE INDEX "games_open_upcoming_idx" ON "games" USING btree ("starts_at") WHERE status = 'open' and deleted_at is null;--> statement-breakpoint
CREATE INDEX "games_organizer_idx" ON "games" USING btree ("organizer_id") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "games_venue_idx" ON "games" USING btree ("venue_id") WHERE venue_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "games_share_token_uq" ON "games" USING btree ("share_token") WHERE share_token is not null;--> statement-breakpoint
CREATE INDEX "participations_game_status_idx" ON "participations" USING btree ("game_id","status");--> statement-breakpoint
CREATE INDEX "participations_player_idx" ON "participations" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "venue_sports_sport_idx" ON "venue_sports" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "venues_owner_active_idx" ON "venues" USING btree ("owner_id") WHERE deleted_at is null;--> statement-breakpoint
CREATE POLICY "client_self" ON "client_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = profile_id) WITH CHECK ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "games_select" ON "games" AS PERMISSIVE FOR SELECT TO "authenticated" USING (deleted_at is null or organizer_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "games_insert" ON "games" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organizer_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid()) and c.is_organizer));--> statement-breakpoint
CREATE POLICY "games_update" ON "games" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organizer_id = (select auth.uid())) WITH CHECK (organizer_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "part_select" ON "participations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "part_insert" ON "participations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (player_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid()) and c.is_player) and exists (select 1 from games g where g.id = game_id and g.status = 'open' and g.deleted_at is null));--> statement-breakpoint
CREATE POLICY "part_update" ON "participations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid()))) WITH CHECK (player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "profiles_select" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "profiles_update" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);--> statement-breakpoint
CREATE POLICY "sports_read" ON "sports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "venue_owner_self" ON "venue_owner_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = profile_id) WITH CHECK ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "vsports_read" ON "venue_sports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "vsports_write" ON "venue_sports" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from venues v where v.id = venue_id and v.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from venues v where v.id = venue_id and v.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "venues_select" ON "venues" AS PERMISSIVE FOR SELECT TO "authenticated" USING (deleted_at is null or owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "venues_write" ON "venues" AS PERMISSIVE FOR ALL TO "authenticated" USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()) and exists (select 1 from venue_owner_profiles v where v.profile_id = (select auth.uid())));