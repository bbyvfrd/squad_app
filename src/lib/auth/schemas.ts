import { z } from "zod";

// Request bodies for the cookie-auth mutation endpoints. The app guarantees the
// name (`fullName` required, trimmed) so the trigger's '' fallback never ships a
// nameless profile (§3). `displayName` is optional/nullable per the open vault
// question — treated as a nullable optional handle here.
export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1),
  displayName: z.string().trim().min(1).optional().nullable(),
});

export const signinSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  remember: z.boolean().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
