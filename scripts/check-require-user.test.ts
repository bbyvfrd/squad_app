// scripts/check-require-user.test.ts
import { describe, expect, it } from "vitest";
import { handlerViolations, routeUrl } from "./check-require-user.mjs";

const OK_TRY = `
import { requireUser } from "@/lib/auth/session";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json({ id: user.id });
  } catch (err) {
    return toApiErrorResponse(err, req);
  }
}`;

describe("handlerViolations", () => {
  it("accepts requireUser(req) as the first statement inside a leading try", () => {
    expect(handlerViolations(OK_TRY)).toEqual([]);
  });

  it("accepts a bare `await requireUser(req)` first statement", () => {
    const src = `export async function GET(request: Request) {
      await requireUser(request);
      return Response.json({});
    }`;
    expect(handlerViolations(src)).toEqual([]);
  });

  it("ignores non-handler exports such as route segment config", () => {
    expect(handlerViolations(`export const dynamic = "force-dynamic";`)).toEqual([]);
  });

  it("flags a handler that never calls requireUser", () => {
    const src = `export async function GET(req: Request) { return Response.json({ ok: true }); }`;
    expect(handlerViolations(src)).toEqual([expect.stringContaining("GET")]);
  });

  it("flags a handler that does work before requireUser", () => {
    const src = `export async function PATCH(req: Request) {
      try {
        const body = await req.json();
        const user = await requireUser(req);
        return Response.json({ body, user });
      } catch (err) { return toApiErrorResponse(err); }
    }`;
    expect(handlerViolations(src)).toEqual([expect.stringContaining("PATCH")]);
  });

  it("flags requireUser() without the handler's request (cookie-only: the Bearer is never read)", () => {
    const noArg = `export async function GET(req: Request) { const u = await requireUser(); return Response.json(u); }`;
    const otherArg = `export async function GET(req: Request) { const u = await requireUser(undefined); return Response.json(u); }`;
    expect(handlerViolations(noArg)).toEqual([expect.stringContaining("GET")]);
    expect(handlerViolations(otherArg)).toEqual([expect.stringContaining("GET")]);
  });

  it("checks handlers declared as exported consts too", () => {
    const src = `export const DELETE = async (req: Request) => { return new Response(null, { status: 204 }); };`;
    expect(handlerViolations(src)).toEqual([expect.stringContaining("DELETE")]);
  });

  it("flags re-exported handlers it cannot inspect (fail closed)", () => {
    expect(handlerViolations(`export { GET } from "./shared";`)).toEqual([
      expect.stringContaining("GET"),
    ]);
    expect(
      handlerViolations(`const h = async () => new Response(); export { h as POST };`),
    ).toEqual([expect.stringContaining("POST")]);
  });

  it("reports each offending handler in a file", () => {
    const src = `${OK_TRY}
      export async function GET(req: Request) { return Response.json({}); }
      export async function DELETE(req: Request) { return new Response(null); }`;
    expect(handlerViolations(src)).toEqual([
      expect.stringContaining("GET"),
      expect.stringContaining("DELETE"),
    ]);
  });
});

describe("routeUrl", () => {
  it("maps a route file under src/app to its URL path, dropping route groups", () => {
    expect(routeUrl("api/v1/games/[id]/route.ts")).toBe("/api/v1/games/[id]");
    expect(routeUrl("(client)/api/v1/me/games/route.ts")).toBe("/api/v1/me/games");
    expect(routeUrl("api/health/route.ts")).toBe("/api/health");
  });
});
