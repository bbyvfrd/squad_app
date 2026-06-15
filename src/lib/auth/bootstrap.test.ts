import { describe, it, expect, vi, beforeEach } from "vitest";

// `import "server-only"` (the build-time guard at the top of bootstrap.ts) throws when
// loaded outside React's `react-server` export condition, which the vitest node env
// does not set. Stub it to a no-op so the module under test imports; the real guard
// stays in the source and still blocks client bundles. Mirrors session.test.ts.
vi.mock("server-only", () => ({}));

// vi.mock is hoisted above top-level consts, so the chain spies must be created in a
// hoisted block to be referenceable inside the factory.
const { insert, values, onConflictDoNothing } = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn();
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  return { insert, values, onConflictDoNothing };
});

vi.mock("@/lib/db/client", () => ({ db: { insert } }));
vi.mock("@/lib/db/schema", () => ({ clientProfiles: { __table: "client_profiles" } }));

import { ensureClientProfile } from "./bootstrap";
import { clientProfiles } from "@/lib/db/schema";

describe("ensureClientProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts the client-surface marker for the given profileId, idempotently", async () => {
    await ensureClientProfile("u_123");

    // insert(clientProfiles).values({ profileId }).onConflictDoNothing()
    expect(insert).toHaveBeenCalledWith(clientProfiles);
    expect(values).toHaveBeenCalledWith({ profileId: "u_123" });
    // onConflictDoNothing is what makes the write idempotent (PK + no-op on conflict).
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });
});
