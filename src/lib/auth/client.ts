// Browser-safe auth client. The ONLY lib/auth module the browser imports.
// It speaks to OUR /api/v1/auth/* endpoints over fetch — never @supabase/*.
// Every mutation carries x-squad-csrf:"1" (the custom-header half of the CSRF
// gate, §7) and same-origin credentials so the httpOnly session cookie rides along.

export type AuthUser = { id: string; email: string };

export class AuthClientError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
    this.name = "AuthClientError";
  }
}

type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  displayName?: string | null;
};
type SignInInput = { email: string; password: string; remember: boolean };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-squad-csrf": "1" },
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (data as { error?: { code?: string } } | null)?.error?.code ?? "UNEXPECTED";
    throw new AuthClientError(code, res.status);
  }
  return data as T;
}

export const authClient = {
  async signUp(input: SignUpInput): Promise<AuthUser> {
    const { user } = await post<{ user: AuthUser }>("/api/v1/auth/signup", input);
    return user;
  },
  async signIn(input: SignInInput): Promise<AuthUser> {
    const { user } = await post<{ user: AuthUser }>("/api/v1/auth/signin", input);
    return user;
  },
  async signOut(): Promise<void> {
    await post<{ ok: true }>("/api/v1/auth/signout", {});
  },
  async session(): Promise<AuthUser | null> {
    const res = await fetch("/api/v1/auth/session", {
      method: "GET",
      credentials: "same-origin",
    });
    const { user } = await parse<{ user: AuthUser | null }>(res);
    return user;
  },
};
