import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

// ── Enums ────────────────────────────────────────────────────────────────────
export const participationStatus = pgEnum("participation_status", [
  "requested",
  "approved",
  "declined",
  "cancelled",
]);

// 'completed' is deferred (spec §3).
export const gameStatus = pgEnum("game_status", ["open", "cancelled"]);

// Ordered low→high so app code can compute "below required" (advisory only).
export const skillLevel = pgEnum("skill_level", [
  "beginner",
  "intermediate",
  "amateur",
  "advanced",
  "professional",
]);

// ── Identity: shared account + split surface profiles ─────────────────────────
// profiles.id === auth.users.id. Row is created by the handle_new_user trigger
// (Task 3), so there is NO INSERT policy here.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().notNull(),
    fullName: text("full_name").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    cityId: smallint("city_id").references(() => cities.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_auth_users_fk",
    }).onDelete("cascade"),
    // Holds only display fields, so a broad SELECT to all signed-in users is safe.
    pgPolicy("profiles_select", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("profiles_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = id`,
      withCheck: sql`(select auth.uid()) = id`,
    }),
  ],
);

// One client identity per profile. Player vs organizer is a per-GAME role
// (games.organizer_id / participations.player_id), NOT a per-user type: any
// client user can both create and join games. This row only marks "this profile
// uses the client app" — it gates client writes (see the games/participations
// insert policies) and keeps the client surface distinct from venue owners.
export const clientProfiles = pgTable(
  "client_profiles",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => [
    // Self-only. A SELECT path is required for UPDATE to work, hence FOR ALL.
    pgPolicy("client_self", {
      for: "all",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = profile_id`,
      withCheck: sql`(select auth.uid()) = profile_id`,
    }),
  ],
);

// A client's declared level per sport. Advisory: nothing here gates joining a
// game — the value drives the organizer's "below required" indicator only.
export const clientSportSkills = pgTable(
  "client_sport_skills",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => clientProfiles.profileId, { onDelete: "cascade" }),
    sportId: smallint("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    skillLevel: skillLevel("skill_level").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.sportId] }),
    index("client_sport_skills_sport_idx").on(t.sportId),
    pgPolicy("csk_select", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("csk_write", {
      for: "all",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = profile_id`,
      withCheck: sql`(select auth.uid()) = profile_id`,
    }),
  ],
);

export const venueOwnerProfiles = pgTable(
  "venue_owner_profiles",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    businessName: text("business_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    pgPolicy("venue_owner_self", {
      for: "all",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = profile_id`,
      withCheck: sql`(select auth.uid()) = profile_id`,
    }),
  ],
);

// ── Reference: cities lookup (lookup table, not an enum, so it can grow) ───────
export const cities = pgTable(
  "cities",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    displayOrder: smallint("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  () => [
    // Public reference; writes are service-role only (no write policy → denied).
    pgPolicy("cities_read", { for: "select", to: authenticatedRole, using: sql`true` }),
  ],
);

// ── Reference: sports lookup (lookup table, not an enum, so it can grow) ───────
export const sports = pgTable(
  "sports",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    displayOrder: smallint("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  () => [
    // Public reference; writes are service-role only (no write policy → denied).
    pgPolicy("sports_read", { for: "select", to: authenticatedRole, using: sql`true` }),
  ],
);

// ── Venues (defined before games: games.venue_id references it) ───────────────
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().notNull(), // app-supplied UUIDv7 (newId)
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    contactInfo: text("contact_info"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("venues_owner_active_idx").on(t.ownerId).where(sql`deleted_at is null`),
    pgPolicy("venues_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`deleted_at is null or owner_id = (select auth.uid())`,
    }),
    pgPolicy("venues_write", {
      for: "all",
      to: authenticatedRole,
      using: sql`owner_id = (select auth.uid())`,
      withCheck: sql`owner_id = (select auth.uid()) and exists (select 1 from venue_owner_profiles v where v.profile_id = (select auth.uid()))`,
    }),
  ],
);

// ── Core coordination loop ────────────────────────────────────────────────────
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().notNull(), // app-supplied UUIDv7 (newId)
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sportId: smallint("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    skillLevel: skillLevel("skill_level"), // null = all levels
    endsAt: timestamp("ends_at", { withTimezone: true }),
    cityId: smallint("city_id").references(() => cities.id, { onDelete: "set null" }),
    capacity: smallint("capacity").notNull(),
    locationText: text("location_text"), // nullable in v1 (validation later)
    notes: text("notes"),
    status: gameStatus("status").notNull().default("open"),
    shareToken: text("share_token"), // invite/share seam
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete
  },
  (t) => [
    check("chk_games_capacity", sql`capacity > 0`),
    check("chk_games_ends_after_starts", sql`ends_at is null or ends_at > starts_at`),
    index("games_sport_starts_idx").on(t.sportId, t.startsAt),
    index("games_city_starts_idx").on(t.cityId, t.startsAt).where(sql`deleted_at is null`),
    index("games_open_upcoming_idx")
      .on(t.startsAt)
      .where(sql`status = 'open' and deleted_at is null`),
    index("games_organizer_idx").on(t.organizerId).where(sql`deleted_at is null`),
    index("games_venue_idx").on(t.venueId).where(sql`venue_id is not null`),
    uniqueIndex("games_share_token_uq").on(t.shareToken).where(sql`share_token is not null`),
    pgPolicy("games_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`deleted_at is null or organizer_id = (select auth.uid())`,
    }),
    pgPolicy("games_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`organizer_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid()))`,
    }),
    pgPolicy("games_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`organizer_id = (select auth.uid())`,
      withCheck: sql`organizer_id = (select auth.uid())`,
    }),
  ],
);

export const participations = pgTable(
  "participations",
  {
    id: uuid("id").primaryKey().notNull(), // app-supplied UUIDv7 (newId)
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: participationStatus("status").notNull().default("requested"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("uq_participation").on(t.gameId, t.playerId), // one request per player
    index("participations_game_status_idx").on(t.gameId, t.status),
    index("participations_player_idx").on(t.playerId),
    pgPolicy("part_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid()))`,
    }),
    pgPolicy("part_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`player_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid())) and exists (select 1 from games g where g.id = game_id and g.status = 'open' and g.deleted_at is null)`,
    }),
    pgPolicy("part_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid()))`,
      withCheck: sql`player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid()))`,
    }),
  ],
);

export const venueSports = pgTable(
  "venue_sports",
  {
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    sportId: smallint("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.venueId, t.sportId] }),
    index("venue_sports_sport_idx").on(t.sportId),
    pgPolicy("vsports_read", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("vsports_write", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from venues v where v.id = venue_id and v.owner_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from venues v where v.id = venue_id and v.owner_id = (select auth.uid()))`,
    }),
  ],
);
