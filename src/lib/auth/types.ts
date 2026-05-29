export type AuthUser = {
  id: string;
  email: string;
};

export interface AuthProvider {
  signUp(email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  verify(token: string): Promise<AuthUser | null>;
}
