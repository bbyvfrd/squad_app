-- Player/organizer are now per-GAME roles, not per-user flags: any client user
-- can create and join games. Drop the capability flags + CHECK, and loosen the
-- two RLS insert policies to gate on client-profile existence only.
--
-- Statement order matters and is hand-corrected: the games_insert / part_insert
-- policies (migration 0000) reference client_profiles.is_organizer / is_player,
-- so those policies must drop the references BEFORE the columns can be dropped.
-- drizzle-kit generated the column drops first, which fails on the policy
-- dependency and rolls back the whole migration.
ALTER POLICY "games_insert" ON "games" TO authenticated WITH CHECK (organizer_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid())));--> statement-breakpoint
ALTER POLICY "part_insert" ON "participations" TO authenticated WITH CHECK (player_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid())) and exists (select 1 from games g where g.id = game_id and g.status = 'open' and g.deleted_at is null));--> statement-breakpoint
ALTER TABLE "client_profiles" DROP CONSTRAINT "chk_client_capability";--> statement-breakpoint
ALTER TABLE "client_profiles" DROP COLUMN "is_player";--> statement-breakpoint
ALTER TABLE "client_profiles" DROP COLUMN "is_organizer";
