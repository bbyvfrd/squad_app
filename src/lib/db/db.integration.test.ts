import { describe, it, expect, afterAll } from "vitest";
import { db, client } from "./client";
import { users } from "./schema";
import { eq } from "drizzle-orm";

describe("database integration", () => {
  afterAll(async () => {
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

    await db.delete(users).where(eq(users.id, created.id));
  });
});
