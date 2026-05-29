import { describe, it, expect, afterAll } from "vitest";
import { db, client } from "./client";
import { users } from "./schema";
import { eq, like } from "drizzle-orm";

describe("database integration", () => {
  // Remove any test rows even if an assertion above throws, then close the pool.
  // (Inline cleanup would be skipped on failure, leaking rows into CI re-runs.)
  afterAll(async () => {
    await db.delete(users).where(like(users.email, "it-%@example.com"));
    await client.end();
  });

  it("inserts and reads back a user", async () => {
    const email = `it-${Date.now()}@example.com`;
    const [created] = await db
      .insert(users)
      .values({ name: "Integration User", email })
      .returning();
    expect(created.id).toBeTruthy();

    const [found] = await db.select().from(users).where(eq(users.email, email));
    expect(found.name).toBe("Integration User");
  });
});
