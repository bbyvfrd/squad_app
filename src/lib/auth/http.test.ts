import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { AuthError } from "./errors";
import { errorResponse, toErrorResponse } from "./http";

describe("errorResponse", () => {
  it("wraps a code + message in the locked envelope at the given status", async () => {
    const res = errorResponse("INVALID_INPUT", "Check your details and try again.", 400);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: { code: "INVALID_INPUT", message: "Check your details and try again." },
    });
  });
});

describe("toErrorResponse", () => {
  it("maps an AuthError to its code + status with a safe message", async () => {
    const res = toErrorResponse(new AuthError("EMAIL_TAKEN", 409));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("EMAIL_TAKEN");
    expect(typeof body.error.message).toBe("string");
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("maps any non-AuthError to UNEXPECTED 500 without leaking the raw error", async () => {
    const res = toErrorResponse(new Error("postgres: connection refused at 10.0.0.1:5432"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("UNEXPECTED");
    expect(body.error.message).not.toContain("postgres");
    expect(body.error.message).not.toContain("10.0.0.1");
  });

  it("returns a NextResponse instance", () => {
    expect(toErrorResponse(new AuthError("CSRF", 403))).toBeInstanceOf(NextResponse);
  });
});
