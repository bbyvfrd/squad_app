import { describe, it, expect } from "vitest";
import { InMemoryAuthProvider } from "./fake";
import type { AuthProvider } from "./types";

function runContract(name: string, make: () => AuthProvider) {
  describe(name, () => {
    it("signs up, signs in, and verifies the issued token", async () => {
      const auth = make();
      const created = await auth.signUp("a@example.com", "pw");
      expect(created.email).toBe("a@example.com");

      const { user, token } = await auth.signIn("a@example.com", "pw");
      expect(user.id).toBe(created.id);

      const verified = await auth.verify(token);
      expect(verified?.id).toBe(created.id);
    });

    it("returns null when verifying an unknown token", async () => {
      const auth = make();
      expect(await auth.verify("bogus")).toBeNull();
    });
  });
}

runContract("InMemoryAuthProvider", () => new InMemoryAuthProvider());
