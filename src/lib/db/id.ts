import { uuidv7 } from "uuidv7";

/**
 * App-generated, time-ordered primary key for venues, games, and participations.
 *
 * UUIDv7 is time-ordered, so new rows append to the right edge of the primary-key
 * B-tree instead of fragmenting it the way random UUIDv4 would (schema spec §3).
 * PK columns therefore carry NO database default — the app always supplies the id
 * via this helper. `lib/booking` (Plan 06) generates ids through here.
 *
 * Placement note: the spec says ids are "generated app-side in lib/booking". The
 * generator lives here in `lib/db` because it is a database-identity concern and
 * the data-layer tests/seed need it before `lib/booking` exists; Plan 06 imports
 * `newId` from here rather than re-implementing it.
 */
export function newId(): string {
  return uuidv7();
}
