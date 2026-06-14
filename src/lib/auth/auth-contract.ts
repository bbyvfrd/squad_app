import { describe, it, expect } from "vitest";
import type { AuthProvider } from "./types";

// Shared across the in-memory unit run (auth.contract.test.ts) and the real-adapter
// integration run (supabase.contract.integration.test.ts, Task 12). `make` returns a
// fresh provider; `emailBase` lets the integration run pass a unique base so reruns
// don't collide on the already-registered check. Each case that signs up derives its
// OWN address from the base (the local part is suffixed per case) so the cases never
// collide against a real Supabase project that persists users across providers.
//
// This module is NOT a test file and does NOT self-run — callers invoke `runContract`.
// Authored once here; Task 12 imports it from `./auth-contract`, never redefines it.
export function runContract(name: string, make: () => AuthProvider, emailBase = "a@example.com") {
  // "a@example.com" + "+meta" → "a+meta@example.com" (RFC 5233 sub-addressing).
  const emailFor = (tag: string) => emailBase.replace("@", `+${tag}@`);

  describe(name, () => {
    it("signs up with metadata, signs in, and verifies the issued token", async () => {
      const auth = make();
      const email = emailFor("meta");
      const created = await auth.signUp(email, "password1", {
        fullName: "Ada Lovelace",
        displayName: "ada",
      });
      expect(created.email).toBe(email);

      const { user, token } = await auth.signIn(email, "password1");
      expect(user.id).toBe(created.id);

      const verified = await auth.verify(token);
      expect(verified?.id).toBe(created.id);
    });

    it("signs up with only the required fullName (displayName omitted)", async () => {
      const auth = make();
      const email = emailFor("nodisplay");
      const created = await auth.signUp(email, "password1", { fullName: "Grace Hopper" });
      expect(created.email).toBe(email);
    });

    it("returns null when verifying an unknown token", async () => {
      const auth = make();
      expect(await auth.verify("bogus")).toBeNull();
    });

    it("signOut resolves (revocation is bounded by token TTL, not asserted here)", async () => {
      const auth = make();
      const email = emailFor("signout");
      await auth.signUp(email, "password1", { fullName: "Alan Turing" });
      const { token } = await auth.signIn(email, "password1");
      // No "verify is null right after signOut" assertion: local JWKS verification
      // cannot honor immediate revocation (see design spec §9). signOut must resolve.
      await expect(auth.signOut(token)).resolves.toBeUndefined();
    });
  });
}
