export type AuthUser = {
  id: string;
  email: string;
};

export type SignUpMeta = {
  fullName: string;
  displayName?: string | null;
};

export interface AuthProvider {
  signUp(email: string, password: string, meta: SignUpMeta): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  // verify === getClaims(token): LOCAL JWKS verification, no network. A server-side
  // revocation is not seen until the short-lived access token expires (design spec §9).
  verify(token: string): Promise<AuthUser | null>;
  signOut(token: string): Promise<void>;
}
