import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db/ping";

// Never prerender/cache — this route checks live DB connectivity per request.
export const dynamic = "force-dynamic";

export async function GET() {
  const up = await pingDb();
  return NextResponse.json(
    up ? { status: "ok", db: "up" } : { status: "degraded", db: "down" },
    { status: up ? 200 : 503 },
  );
}
