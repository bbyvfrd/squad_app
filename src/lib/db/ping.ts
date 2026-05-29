import { sql } from "drizzle-orm";
import { db } from "./client";

export async function pingDb(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
