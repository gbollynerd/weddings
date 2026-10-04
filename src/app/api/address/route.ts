import { NextResponse } from "next/server";
import { searchAddresses } from "@/lib/geocode";

// Simple per-IP limit so the endpoint can't be used as a free geocoding proxy.
const WINDOW = 60_000, MAX = 40;
const hits = new Map<string, { start: number; n: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW) { hits.set(ip, { start: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  return ++h.n > MAX;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 4 || q.length > 200 || !/[a-z]/i.test(q)) return NextResponse.json({ ok: true, hits: [] });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const r = await searchAddresses(q);
  return NextResponse.json(r, { status: r.ok ? 200 : 503, headers: { "Cache-Control": r.ok ? "private, max-age=600" : "no-store" } });
}
