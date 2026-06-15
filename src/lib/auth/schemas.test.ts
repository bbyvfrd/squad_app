import { describe, it, expect } from "vitest";
import { signupSchema, signinSchema } from "./schemas";

describe("signupSchema", () => {
  it("accepts a valid email-branch signup body", () => {
    const parsed = signupSchema.parse({
      email: "a@example.com",
      password: "longenough",
      fullName: "Ada Lovelace",
      displayName: null,
    });
    expect(parsed.email).toBe("a@example.com");
    expect(parsed.fullName).toBe("Ada Lovelace");
    expect(parsed.displayName).toBeNull();
  });

  it("trims fullName and treats displayName as optional", () => {
    const parsed = signupSchema.parse({
      email: "a@example.com",
      password: "longenough",
      fullName: "  Ada  ",
    });
    expect(parsed.fullName).toBe("Ada");
    expect(parsed.displayName).toBeUndefined();
  });

  it("rejects a password shorter than 8 chars", () => {
    expect(() =>
      signupSchema.parse({
        email: "a@example.com",
        password: "short",
        fullName: "Ada",
      }),
    ).toThrow();
  });

  it("rejects a blank (whitespace-only) fullName", () => {
    expect(() =>
      signupSchema.parse({
        email: "a@example.com",
        password: "longenough",
        fullName: "   ",
      }),
    ).toThrow();
  });

  it("rejects a malformed email", () => {
    expect(() =>
      signupSchema.parse({ email: "not-an-email", password: "longenough", fullName: "Ada" }),
    ).toThrow();
  });
});

describe("signinSchema", () => {
  it("accepts a valid signin body with remember", () => {
    const parsed = signinSchema.parse({
      email: "a@example.com",
      password: "longenough",
      remember: true,
    });
    expect(parsed.remember).toBe(true);
  });

  it("treats remember as optional", () => {
    const parsed = signinSchema.parse({ email: "a@example.com", password: "longenough" });
    expect(parsed.remember).toBeUndefined();
  });

  it("rejects a malformed email", () => {
    expect(() => signinSchema.parse({ email: "nope", password: "longenough" })).toThrow();
  });
});
