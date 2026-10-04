import "server-only";
import { sql } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";

/**
 * Geocode a wedding's ceremony and reception addresses into lat/lng so distances are exact.
 * Safe to call any time: failures leave the old coordinates and the market-centre fallback applies.
 */
export async function geocodeWedding(weddingId: string) {
  const [w] = await sql`select venue_address, reception_venue_address from weddings where id = ${weddingId}`;
  if (!w) return;
  const [c, r] = await Promise.all([geocodeAddress(w.venue_address), geocodeAddress(w.reception_venue_address)]);
  if (c === "unavailable" || r === "unavailable") return; // try again later
  await sql`update weddings set venue_lat = ${c?.lat ?? null}, venue_lng = ${c?.lng ?? null},
      reception_lat = ${r?.lat ?? null}, reception_lng = ${r?.lng ?? null}, geocoded_at = now() where id = ${weddingId}`;
}

/** Background backfill for weddings saved before geocoding existed (a few per call, at most once a day each). */
export async function backfillWeddingCoords(limit = 4) {
  const rows = await sql`select id from weddings
    where venue_address is not null and venue_lat is null and wedding_date >= current_date
      and (geocoded_at is null or geocoded_at < now() - interval '1 day')
    order by wedding_date limit ${limit}`;
  for (const r of rows) {
    await sql`update weddings set geocoded_at = now() where id = ${r.id}`; // don't retry failures on every request
    await geocodeWedding(r.id);
  }
}

/** Geocode a team member's home base. Returns false if the address couldn't be found. */
export async function geocodeMemberHome(memberId: string, address: string | null) {
  const p = await geocodeAddress(address);
  const at = p === "unavailable" || !p ? null : p;
  // Never keep coordinates from an old address; distances fall back to the home market until this succeeds
  await sql`update team_members set lat = ${at?.lat ?? null}, lng = ${at?.lng ?? null} where id = ${memberId}`;
  return p === "unavailable" ? ("unavailable" as const) : !!p;
}
