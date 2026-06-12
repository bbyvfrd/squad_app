// Deploy guard: `drizzle-kit migrate` can roll back a failed batch and still
// exit 0 (no error output, nothing applied). Compare the committed journal
// against the DB's drizzle migrations table so a deploy never proceeds on an
// un-migrated schema. Run with DATABASE_URL set, after `drizzle-kit migrate`.
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("verify-migrations: DATABASE_URL is not set");
  process.exit(1);
}

const journal = JSON.parse(readFileSync("migrations/meta/_journal.json", "utf8"));
const expected = journal.entries.length;

const sql = postgres(url, { max: 1, prepare: false });
try {
  const [{ count }] = await sql`select count(*)::int as count from drizzle.__drizzle_migrations`;
  // "<" not "!==": a DB ahead of the journal (e.g. after a squash) is safe.
  if (count < expected) {
    console.error(
      `verify-migrations: FAILED — journal has ${expected} entries, database has ${count}`,
    );
    process.exit(1);
  }
  console.log(`verify-migrations: ok (${count} applied, ${expected} expected)`);
} finally {
  await sql.end();
}
