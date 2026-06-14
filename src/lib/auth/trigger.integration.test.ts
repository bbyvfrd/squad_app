import { afterAll, describe, expect, it } from "vitest";
import { client } from "@/lib/db/client";
import { newId } from "@/lib/db/id";

afterAll(async () => {
  await client.end();
});

// Insert an auth user (fires on_auth_user_created → private.handle_new_user).
async function insertAuthUser(id: string, fullName: string): Promise<void> {
  const email = `trig-${id}@example.com`;
  await client`
    insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated',
            ${email}, ${JSON.stringify({ full_name: fullName, display_name: fullName })}::jsonb, now(), now())
  `;
}

describe("private.handle_new_user is idempotent on re-fire", () => {
  it("a re-fire WITHOUT on-conflict would 500 (the conflict is real)", async () => {
    const id = newId();
    await insertAuthUser(id, "Conflict Proof");

    // Replay the trigger body's insert verbatim but WITHOUT ON CONFLICT — this is
    // exactly what the pre-0005 function did on a re-fire. It must raise a
    // duplicate-key error, proving the idempotency clause is load-bearing.
    await expect(
      client`
        insert into public.profiles (id, full_name, display_name)
        select u.id,
               coalesce(u.raw_user_meta_data ->> 'full_name', ''),
               nullif(u.raw_user_meta_data ->> 'display_name', '')
        from auth.users u
        where u.id = ${id}
      `,
    ).rejects.toThrow();
  });

  it("a re-fire WITH on-conflict leaves exactly one profile, name preserved", async () => {
    const id = newId();
    await insertAuthUser(id, "Trigger Tester");

    // Replay the EXACT statement the 0005 function body runs (ON CONFLICT (id) DO
    // NOTHING) for the same row — the identity-link re-fire path (§13). It must be a
    // no-op that preserves the original profile.
    await client`
      insert into public.profiles (id, full_name, display_name)
      select u.id,
             coalesce(u.raw_user_meta_data ->> 'full_name', ''),
             nullif(u.raw_user_meta_data ->> 'display_name', '')
      from auth.users u
      where u.id = ${id}
      on conflict (id) do nothing
    `;

    const rows = await client<{ id: string; full_name: string }[]>`
      select id, full_name from public.profiles where id = ${id}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].full_name).toBe("Trigger Tester");
  });
});
