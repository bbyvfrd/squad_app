import type { AuthProvider, AuthUser, SignUpMeta } from "./types";

export class InMemoryAuthProvider implements AuthProvider {
  private users = new Map<string, { user: AuthUser; password: string; meta: SignUpMeta }>();
  private tokens = new Map<string, string>(); // token -> userId
  private seq = 0;

  async signUp(email: string, password: string, meta: SignUpMeta): Promise<AuthUser> {
    const id = `user_${++this.seq}`;
    const user: AuthUser = { id, email };
    this.users.set(email, { user, password, meta });
    return user;
  }

  async signIn(email: string, password: string) {
    const record = this.users.get(email);
    if (!record || record.password !== password) {
      throw new Error("Invalid credentials");
    }
    const token = `token_${record.user.id}_${++this.seq}`;
    this.tokens.set(token, record.user.id);
    return { user: record.user, token };
  }

  async verify(token: string): Promise<AuthUser | null> {
    const userId = this.tokens.get(token);
    if (!userId) return null;
    for (const { user } of this.users.values()) {
      if (user.id === userId) return user;
    }
    return null;
  }

  async signOut(token: string): Promise<void> {
    this.tokens.delete(token);
  }
}
