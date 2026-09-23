import type { NextRequest } from "next/server";

/**
 * Same-origin proxy for the .NET API.
 *
 * The browser only ever talks to /api/* on the Next.js origin (no CORS), and
 * this handler forwards to API_URL, which Aspire injects in development and
 * docker-compose sets in containers. Reading the env var per request (rather
 * than in next.config rewrites) keeps the standalone build environment-agnostic.
 */
export const dynamic = "force-dynamic";

const HOP_BY_HOP = ["connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "host"];

type RouteParams = { params: Promise<{ path: string[] }> };

function apiBase(): string {
  return (process.env.API_URL ?? "http://localhost:5080").replace(/\/$/, "");
}

async function proxy(req: NextRequest, ctx: RouteParams): Promise<Response> {
  const { path } = await ctx.params;
  const target = new URL(`${apiBase()}/api/${path.map(encodeURIComponent).join("/")}`);
  target.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  for (const h of HOP_BY_HOP) headers.delete(h);
  headers.delete("content-length");

  const hasBody = !["GET", "HEAD"].includes(req.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[api-proxy] ${req.method} ${target} failed:`, err);
    return Response.json(
      { title: "The game server is unreachable right now.", status: 502 },
      { status: 502 },
    );
  }

  const out = new Headers(upstream.headers);
  // fetch() already decoded the body; drop encoding/length so the browser doesn't double-decode.
  out.delete("content-encoding");
  out.delete("content-length");
  for (const h of HOP_BY_HOP) out.delete(h);

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
