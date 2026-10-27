import type { NextRequest } from "next/server";
import { DROPPED_SCOOP } from "@/features/scoops/config";
import { handleScoops } from "@/features/scoops/api/handle";
import { getScoopsRepository } from "@/features/scoops/data/serverRepository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Shelby's Scoops lives on this Next server, not the .NET score API.
 * `app/api/scoops` is a static segment, so the catch-all proxy does not take it.
 */
type RouteContext = { params: Promise<{ path?: string[] }> };

async function dispatch(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const { path = [] } = await ctx.params;
  let body: unknown;
  if (!["GET", "HEAD"].includes(req.method)) {
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch (err) {
        console.error("[scoops] unreadable save", err);
        return Response.json({ message: DROPPED_SCOOP }, { status: 400 });
      }
    }
  }
  const query: Record<string, string | undefined> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  const result = handleScoops(getScoopsRepository(), {
    method: req.method,
    path,
    player: req.headers.get("x-scoops-player"),
    body,
    query,
  });
  return Response.json(result.body, { status: result.status });
}

export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as DELETE };
