"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth";
import { notify } from "@/lib/services/notifications";
import { money } from "@/lib/pricing";
import { fmtDate } from "@/lib/utils";
import {
  bookingForChange, pricePackageChange, applyTotalChange, syncTeamSlots, isoDay, daysBetween, MIN_LEAD_DAYS,
} from "@/lib/services/changes";
import { weddingPlaces, placeLine, type Place } from "@/lib/venues";
import { geocodeWedding } from "@/lib/services/geo";
import { voidContracts } from "@/lib/services/contracts";
import { distanceTo } from "@/lib/geo";
import type { ActionResult } from "./types";

type Db = typeof sql;

/** The signed-in client's booking for a wedding, if it's still changeable. */
async function ownedBooking(userId: string, weddingId: string) {
  const [b] = await sql`select b.id, b.booking_number, b.package_id, b.status, w.id as wedding_id, w.couple, w.wedding_date::text, w.status as wedding_status, w.market_id,
      w.venue_name, w.venue_address, w.ceremony_location, w.reception_location, w.reception_venue_name, w.reception_venue_address,
      w.guest_count, w.wedding_type, w.start_time::text as start_time
    from bookings b join weddings w on w.id = b.wedding_id join clients c on c.id = b.client_id
    where w.id = ${weddingId} and c.user_id = ${userId} and b.status <> 'cancelled' limit 1`;
  if (!b) return { error: "We couldn't find that booking." } as const;
  if (b.wedding_status === "cancelled") return { error: "This booking was cancelled." } as const;
  if (b.wedding_date < isoDay(new Date())) return { error: "This wedding has already taken place." } as const;
  return { b } as const;
}

const teamOnWedding = (weddingId: string) => sql`select distinct t.user_id from wedding_assignments a join team_members t on t.id = a.team_member_id
  where a.wedding_id = ${weddingId} and a.status in ('accepted','pending','offered')`;
const coordinators = () => sql`select id from users where role in ('coordinator','admin') and status = 'active'`;

/* ───────────── Venues: request ───────────── */
const Venue = z.object({
  ceremonyVenue: z.string().trim().min(2, "Enter the ceremony venue").max(120),
  ceremonyAddress: z.string().trim().max(200).optional().default(""),
  ceremonyArea: z.string().trim().max(120).optional().default(""),
  receptionSame: z.boolean().default(true),
  receptionVenue: z.string().trim().max(120).optional().default(""),
  receptionAddress: z.string().trim().max(200).optional().default(""),
  receptionArea: z.string().trim().max(120).optional().default(""),
  note: z.string().trim().max(1000).optional().default(""),
}).superRefine((v, ctx) => {
  if (!v.receptionSame && v.receptionVenue.length < 2) ctx.addIssue({ code: "custom", path: ["receptionVenue"], message: "Enter the reception venue" });
});
export type VenueInput = z.input<typeof Venue>;
type VenueRow = { venue_name: string; venue_id: string | null; venue_address: string | null; ceremony_location: string | null; reception_location: string | null; reception_venue_name: string | null; reception_venue_address: string | null };
const venueFields = (b: Record<string, unknown>) => ({
  venue_name: b.venue_name, venue_address: b.venue_address ?? null, ceremony_location: b.ceremony_location ?? null, reception_location: b.reception_location ?? null,
  reception_venue_name: b.reception_venue_name ?? null, reception_venue_address: b.reception_venue_address ?? null,
}) as Omit<VenueRow, "venue_id">;

const pendingOf = async (weddingId: string, kind: string) => (await sql`select id from wedding_change_requests where wedding_id = ${weddingId} and kind = ${kind} and status = 'pending'`)[0];

export async function requestVenueChangeAction(weddingId: string, input: VenueInput): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const own = await ownedBooking(u.id, weddingId);
  if ("error" in own) return { ok: false, message: own.error };
  const parsed = Venue.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, message: parsed.error.issues[0].message, fieldErrors };
  }
  const v = parsed.data;
  const { b } = own;
  if (await pendingOf(weddingId, "venue")) return { ok: false, message: "You already have a venue change waiting for review. Cancel it first to make another change." };
  const lookup = async (name: string) => (await sql`select id, address from venues where market_id = ${b.market_id} and lower(name) = lower(${name})`)[0] ?? null;
  const known = await lookup(v.ceremonyVenue);
  // A "different" reception venue with the same name and address as the ceremony is the same venue.
  const separate = !v.receptionSame && !(v.receptionVenue.toLowerCase() === v.ceremonyVenue.toLowerCase() && (!v.receptionAddress || v.receptionAddress === v.ceremonyAddress));
  const rKnown = separate ? await lookup(v.receptionVenue) : null;
  const next: VenueRow = {
    venue_name: v.ceremonyVenue, venue_id: known?.id ?? null, venue_address: v.ceremonyAddress || known?.address || null, ceremony_location: v.ceremonyArea || null,
    reception_venue_name: separate ? v.receptionVenue : null, reception_venue_address: separate ? v.receptionAddress || rKnown?.address || null : null,
    reception_location: v.receptionArea || null,
  };
  const before = venueFields(b);
  if (JSON.stringify(weddingPlaces(before as never)) === JSON.stringify(weddingPlaces(next))) return { ok: true, message: "No changes to send" };
  await sql`insert into wedding_change_requests (wedding_id, booking_id, requested_by, kind, payload, before, note)
    values (${weddingId}, ${b.id}, ${u.id}, 'venue', ${sql.json(next)}, ${sql.json(before)}, ${v.note || null})`;
  const p = weddingPlaces(next);
  for (const c of await coordinators()) await notify(c.id, "change", `Venue change request: ${b.couple}`, p.same ? `Ceremony & reception at ${placeLine(p.ceremony)}.` : `Ceremony at ${placeLine(p.ceremony)}; reception at ${placeLine(p.reception)}.`, `/admin/weddings/${weddingId}`);
  revalidatePath("/client", "layout"); revalidatePath("/admin", "layout");
  return { ok: true, message: "Request sent — your coordinator will confirm the new venue details" };
}

/** Apply an approved venue change: update the wedding, the team's venue sheet, and notify the team. */
async function applyVenue(weddingId: string, next: VenueRow, couple: string, weddingDate: string) {
  const before = (await sql`select venue_name, venue_address, ceremony_location, reception_location, reception_venue_name, reception_venue_address from weddings where id = ${weddingId}`)[0];
  await sql`update weddings set venue_name = ${next.venue_name}, venue_id = ${next.venue_id}, venue_address = ${next.venue_address},
      ceremony_location = ${next.ceremony_location}, reception_location = ${next.reception_location},
      reception_venue_name = ${next.reception_venue_name}, reception_venue_address = ${next.reception_venue_address}
    where id = ${weddingId}`;
  const after = weddingPlaces(next);
  const block = (label: string, p: Place) => `**${label}:** ${placeLine(p)}${p.address ? `\n${p.address}` : ""}`;
  const info = after.same
    ? `${block("Ceremony & reception", { ...after.ceremony, area: null })}${after.ceremony.area ? `\n\nCeremony: ${after.ceremony.area}` : ""}${after.reception.area ? `\nReception: ${after.reception.area}` : ""}`
    : `${block("Ceremony", after.ceremony)}\n\n${block("Reception", after.reception)}`;
  const [doc] = await sql`update documents set content = ${info} where wedding_id = ${weddingId} and type = 'venue_info' returning id`;
  if (!doc) await sql`insert into documents (wedding_id, type, title, content, visibility) values (${weddingId}, 'venue_info', 'Venue information', ${info}, 'team')`;

  const prev = weddingPlaces(before as never);
  const moved = (x: Place, y: Place) => x.venue !== y.venue || (x.address ?? "") !== (y.address ?? "");
  const venueChanged = moved(prev.ceremony, after.ceremony) || moved(prev.reception, after.reception);
  if ((before.venue_address ?? "") !== (next.venue_address ?? "") || (before.reception_venue_address ?? "") !== (next.reception_venue_address ?? "")) {
    await geocodeWedding(weddingId);
    await refreshTravelMiles(weddingId);
  }
  const title = venueChanged ? `Venue changed: ${couple}` : `Location details updated: ${couple}`;
  const body = after.same
    ? `Ceremony & reception at ${after.ceremony.venue}${after.ceremony.address ? ` · ${after.ceremony.address}` : ""} on ${fmtDate(weddingDate)}.`
    : `Ceremony at ${placeLine(after.ceremony)}; reception at ${placeLine(after.reception)} on ${fmtDate(weddingDate)}.`;
  for (const r of await teamOnWedding(weddingId)) await notify(r.user_id, "change", title, body, `/team/weddings/${weddingId}`);
  return venueChanged;
}

/** Re-measure the distance for everyone on a wedding after the venue moves (affects mileage pay). */
async function refreshTravelMiles(weddingId: string) {
  const rows = await sql`select a.id, t.lat, t.lng, tm.slug as tm_market, w.venue_lat, w.venue_lng, m.slug as market_slug
    from wedding_assignments a join team_members t on t.id = a.team_member_id left join markets tm on tm.id = t.home_market_id
    join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id
    where a.wedding_id = ${weddingId} and a.status in ('offered','pending','accepted')`;
  for (const r of rows) {
    const d = distanceTo({ lat: r.lat, lng: r.lng, market_slug: r.tm_market }, { lat: r.venue_lat, lng: r.venue_lng, market_slug: r.market_slug });
    await sql`update wedding_assignments set travel_miles = ${d?.miles ?? null} where id = ${r.id}`;
  }
}

/* ───────────── Guest count, style, start time: request ───────────── */
const Details = z.object({
  guestCount: z.coerce.number().int("Whole numbers only").min(2, "At least 2 guests").max(2000, "Contact us for weddings over 2,000 guests"),
  weddingType: z.string().trim().min(2, "Choose a style").max(80),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a start time"),
  note: z.string().trim().max(1000).optional().default(""),
});
export type DetailsInput = z.input<typeof Details>;
const hhmm = (t: string | null | undefined) => (t ?? "").slice(0, 5);

export async function requestDetailsChangeAction(weddingId: string, input: DetailsInput): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const own = await ownedBooking(u.id, weddingId);
  if ("error" in own) return { ok: false, message: own.error };
  const parsed = Details.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, message: parsed.error.issues[0].message, fieldErrors };
  }
  const v = parsed.data;
  const { b } = own;
  const [h, m] = v.startTime.split(":").map(Number);
  if (h < 6 || h > 22) return { ok: false, message: "Coverage can start between 6:00 AM and 10:00 PM.", fieldErrors: { startTime: "Between 6:00 AM and 10:00 PM" } };
  if (await pendingOf(weddingId, "details")) return { ok: false, message: "You already have a details change waiting for review. Cancel it first to make another change." };
  const payload: Record<string, string | number> = {}, before: Record<string, string | number | null> = {};
  if (v.guestCount !== b.guest_count) { payload.guest_count = v.guestCount; before.guest_count = b.guest_count; }
  if (v.weddingType !== (b.wedding_type ?? "")) { payload.wedding_type = v.weddingType; before.wedding_type = b.wedding_type; }
  if (v.startTime !== hhmm(b.start_time)) { payload.start_time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; before.start_time = hhmm(b.start_time); }
  if (!Object.keys(payload).length) return { ok: true, message: "No changes to send" };
  await sql`insert into wedding_change_requests (wedding_id, booking_id, requested_by, kind, payload, before, note)
    values (${weddingId}, ${b.id}, ${u.id}, 'details', ${sql.json(payload)}, ${sql.json(before)}, ${v.note || null})`;
  for (const c of await coordinators()) await notify(c.id, "change", `Details change request: ${b.couple}`, describeDetails(payload, before), `/admin/weddings/${weddingId}`);
  revalidatePath("/client", "layout"); revalidatePath("/admin", "layout");
  return { ok: true, message: "Request sent — your coordinator will confirm shortly" };
}

function describeDetails(p: Record<string, unknown>, before: Record<string, unknown>) {
  const t = (x: unknown) => { const [hh, mm] = String(x).split(":").map(Number); return new Date(2000, 0, 1, hh, mm).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
  const out: string[] = [];
  if (p.guest_count != null) out.push(`Guests ${before.guest_count ?? "—"} → ${p.guest_count}`);
  if (p.wedding_type != null) out.push(`Style ${before.wedding_type ?? "—"} → ${p.wedding_type}`);
  if (p.start_time != null) out.push(`Start ${before.start_time ? t(before.start_time) : "—"} → ${t(p.start_time)}`);
  return out.join(" · ");
}

/** Shift a HH:MM[:SS] time by minutes, wrapping within the day. */
const shift = (t: string, mins: number) => {
  const [h, m] = t.split(":").map(Number);
  const x = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/* ───────────── Package: request ───────────── */
export async function requestPackageChangeAction(weddingId: string, toPackageSlug: string, note?: string): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const own = await ownedBooking(u.id, weddingId);
  if ("error" in own) return { ok: false, message: own.error };
  const { b } = own;
  const [pkg] = await sql`select * from packages where slug = ${toPackageSlug} and active`;
  if (!pkg) return { ok: false, message: "That package isn't available." };
  if (pkg.id === b.package_id) return { ok: false, message: "That's already your package." };
  const [pending] = await sql`select id from wedding_change_requests where wedding_id = ${weddingId} and kind = 'package' and status = 'pending'`;
  if (pending) return { ok: false, message: "You already have a package change waiting for review. Cancel it first to choose a different package." };
  const full = await bookingForChange(sql, b.id);
  if (!full) return { ok: false, message: "We couldn't find that booking." };
  const q = pricePackageChange(full, pkg);
  await sql`insert into wedding_change_requests (wedding_id, booking_id, requested_by, kind, from_package_id, to_package_id, total_before, total_after, removed_addons, note)
    values (${weddingId}, ${b.id}, ${u.id}, 'package', ${b.package_id}, ${pkg.id}, ${full.total}, ${q.total}, ${q.removed.map((a) => a.name as string)}, ${note?.trim().slice(0, 1000) || null})`;
  const delta = q.diff === 0 ? "no price change" : `${q.diff > 0 ? "+" : "−"}${money(Math.abs(q.diff))}`;
  for (const c of await coordinators()) await notify(c.id, "change", `Package change request: ${b.couple}`, `${full.package_name} → ${pkg.name} (${delta}).`, `/admin/weddings/${weddingId}`);
  revalidatePath("/client", "layout"); revalidatePath("/admin", "layout");
  return { ok: true, message: "Request sent — your coordinator will confirm shortly" };
}

/* ───────────── Date: request ───────────── */
export async function requestDateChangeAction(weddingId: string, toDate: string, note?: string): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const own = await ownedBooking(u.id, weddingId);
  if ("error" in own) return { ok: false, message: own.error };
  const { b } = own;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate) || Number.isNaN(new Date(toDate + "T12:00:00").getTime())) return { ok: false, message: "Choose a valid date.", fieldErrors: { date: "Choose a valid date" } };
  if (toDate === b.wedding_date) return { ok: false, message: "That's your current date.", fieldErrors: { date: "That's your current date" } };
  if (daysBetween(isoDay(new Date()), toDate) < MIN_LEAD_DAYS) return { ok: false, message: `New dates need to be at least ${MIN_LEAD_DAYS} days away.`, fieldErrors: { date: `At least ${MIN_LEAD_DAYS} days from today` } };
  const [pending] = await sql`select id from wedding_change_requests where wedding_id = ${weddingId} and kind = 'date' and status = 'pending'`;
  if (pending) return { ok: false, message: "You already have a date change waiting for review. Cancel it first to pick another date." };
  await sql`insert into wedding_change_requests (wedding_id, booking_id, requested_by, kind, from_date, to_date, note)
    values (${weddingId}, ${b.id}, ${u.id}, 'date', ${b.wedding_date}, ${toDate}, ${note?.trim().slice(0, 1000) || null})`;
  for (const c of await coordinators()) await notify(c.id, "change", `Date change request: ${b.couple}`, `${fmtDate(b.wedding_date)} → ${fmtDate(toDate)}.`, `/admin/weddings/${weddingId}`);
  revalidatePath("/client", "layout"); revalidatePath("/admin", "layout");
  return { ok: true, message: "Request sent — we'll check team availability and confirm" };
}

export async function cancelChangeRequestAction(id: string): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const [r] = await sql`update wedding_change_requests r set status = 'cancelled', decided_at = now()
    from bookings b join clients c on c.id = b.client_id
    where r.id = ${id} and r.booking_id = b.id and c.user_id = ${u.id} and r.status = 'pending' returning r.kind`;
  if (!r) return { ok: false, message: "That request is no longer pending." };
  revalidatePath("/client", "layout"); revalidatePath("/admin", "layout");
  return { ok: true, message: "Request cancelled" };
}

/* ───────────── Coordinator decision ───────────── */
export async function decideChangeRequestAction(id: string, approve: boolean, note?: string): Promise<ActionResult> {
  const staff = await requirePermission("booking:manage");
  const [r] = await sql`select r.*, r.to_date::text as to_date_s, r.from_date::text as from_date_s, w.couple, w.wedding_date::text as wedding_date
    from wedding_change_requests r join weddings w on w.id = r.wedding_id where r.id = ${id} and r.status = 'pending'`;
  if (!r) return { ok: false, message: "That request is no longer pending." };
  const clientId = r.requested_by as string | null;
  const what = ({ package: "package change", date: "date change", venue: "venue change", details: "wedding details change" } as Record<string, string>)[r.kind];

  if (!approve) {
    if (!note?.trim()) return { ok: false, message: "Add a short reason so the couple knows why." };
    await sql`update wedding_change_requests set status = 'declined', decision_note = ${note.trim().slice(0, 1000)}, decided_by = ${staff.id}, decided_at = now() where id = ${id}`;
    if (clientId) await notify(clientId, "change", `Your ${what} wasn't approved`, note.trim(), "/client");
    revalidatePath("/", "layout");
    return { ok: true, message: "Declined — the couple has been notified" };
  }

  if (r.kind === "venue") {
    const changed = await applyVenue(r.wedding_id, r.payload as VenueRow, r.couple, r.wedding_date);
    await sql`update wedding_change_requests set status = 'approved', decision_note = ${note?.trim() || null}, decided_by = ${staff.id}, decided_at = now() where id = ${id}`;
    if (clientId) await notify(clientId, "change", "Venue change approved", `${changed ? "Your new venue details are confirmed" : "Your location details are updated"} and your team has been notified.${note?.trim() ? ` ${note.trim()}` : ""}`, "/client");
    revalidatePath("/", "layout");
    return { ok: true, message: "Approved — venue updated and the team notified" };
  }

  if (r.kind === "details") {
    const p = r.payload as { guest_count?: number; wedding_type?: string; start_time?: string };
    const [w] = await sql`select start_time::text as start_time from weddings where id = ${r.wedding_id}`;
    const delta = p.start_time ? (() => { const [a, b] = p.start_time!.split(":").map(Number); const [c, d] = String(w.start_time).split(":").map(Number); return a * 60 + b - (c * 60 + d); })() : 0;
    await sql.begin(async (tx) => {
      const db = tx as unknown as Db;
      if (p.guest_count != null) await db`update weddings set guest_count = ${p.guest_count} where id = ${r.wedding_id}`;
      if (p.wedding_type != null) await db`update weddings set wedding_type = ${p.wedding_type} where id = ${r.wedding_id}`;
      if (p.start_time && delta) {
        await db`update weddings set start_time = ${p.start_time} where id = ${r.wedding_id}`;
        // Move the whole day with the new start: timeline items and team call times
        for (const t of await db`select id, time::text from wedding_timeline_items where wedding_id = ${r.wedding_id}`)
          await db`update wedding_timeline_items set time = ${shift(t.time, delta)} where id = ${t.id}`;
        for (const a of await db`select id, call_time::text from wedding_assignments where wedding_id = ${r.wedding_id} and call_time is not null`)
          await db`update wedding_assignments set call_time = ${shift(a.call_time, delta)} where id = ${a.id}`;
      }
      await db`update wedding_change_requests set status = 'approved', decision_note = ${note?.trim() || null}, decided_by = ${staff.id}, decided_at = now() where id = ${id}`;
    });
    const summary = describeDetails(p, (r.before ?? {}) as Record<string, unknown>);
    if (clientId) await notify(clientId, "change", "Wedding details updated", `${summary}.${note?.trim() ? ` ${note.trim()}` : ""}`, "/client");
    for (const t of await teamOnWedding(r.wedding_id))
      await notify(t.user_id, "change", `Details changed: ${r.couple}`, `${summary}.${delta ? " Your call time and the timeline moved to match." : ""}`, `/team/weddings/${r.wedding_id}`);
    revalidatePath("/", "layout");
    return { ok: true, message: `Approved — ${summary}${delta ? "; timeline and call times shifted" : ""}` };
  }

  if (r.kind === "package") {
    const out = await sql.begin(async (tx) => {
      const db = tx as unknown as Db;
      await db`select id from bookings where id = ${r.booking_id} for update`;
      const b = await bookingForChange(db, r.booking_id);
      const [pkg] = await db`select * from packages where id = ${r.to_package_id}`;
      if (!b || !pkg) throw new Error("Booking or package not found");
      const q = pricePackageChange(b, pkg);
      await db`update bookings set package_id = ${pkg.id}, service_slug = ${pkg.service_slug}, package_price = ${q.packagePrice}, addons_total = ${q.addonsTotal}, total = ${q.total} where id = ${b.id}`;
      for (const a of q.removed) await db`delete from booking_addons where booking_id = ${b.id} and addon_id = ${a.id}`;
      const pay = await applyTotalChange(db, b.id, b.wedding_date, q.diff);
      const team = await syncTeamSlots(db, b.wedding_id, b.wedding_date, pkg, q.kept.map((a) => ({ slug: a.slug, quantity: a.quantity })));
      const lines = [`Package changed from ${b.package_name} to ${pkg.name} (${team.hours} hours of coverage).`, `New total ${money(q.total)} (was ${money(b.total)}).`];
      if (q.removed.length) lines.push(`Removed add-ons that don't apply to the new package: ${q.removed.map((a) => a.name).join(", ")}.`);
      if (pay.refund) lines.push(`${money(pay.refund)} refunded to the card on file.`);
      await db`insert into documents (wedding_id, type, title, content, visibility) values (${b.wedding_id}, 'contract', ${`Amendment — ${pkg.name} package`}, ${lines.join("\n\n")}, 'client')`;
      await db`update wedding_change_requests set status = 'approved', total_before = ${b.total}, total_after = ${q.total}, removed_addons = ${q.removed.map((a) => a.name as string)},
        decision_note = ${note?.trim() || null}, decided_by = ${staff.id}, decided_at = now() where id = ${id}`;
      return { b, pkg, q, pay, team };
    });
    const { b, pkg, q, pay, team } = out;
    const money_ = q.diff > 0 ? `${money(q.diff)} has been added to your remaining balance.` : q.diff < 0 ? (pay.refund ? `Your balance went down and ${money(pay.refund)} is being refunded.` : `Your remaining balance went down by ${money(-q.diff)}.`) : "Your total is unchanged.";
    if (clientId) await notify(clientId, "booking", "Package change approved", `You're now on ${pkg.name}. ${money_}`, "/client");
    for (const m of team.released) await notify(m.user_id, "booking", `Role no longer needed: ${b.couple}`, `The couple changed packages, so this role was removed. You're free on ${fmtDate(b.wedding_date)}.`, "/team/weddings");
    for (const m of team.changed) await notify(m.user_id, "booking", `Coverage updated: ${b.couple}`, `Coverage is now ${team.hours} hours. Pay has been updated to match.`, `/team/weddings/${b.wedding_id}`);
    revalidatePath("/", "layout");
    return { ok: true, message: `Approved — ${b.couple} moved to ${pkg.name}${team.added ? `, ${team.added} new team slot${team.added > 1 ? "s" : ""} opened` : ""}` };
  }

  // Date change
  const toDate = r.to_date_s as string;
  if (daysBetween(isoDay(new Date()), toDate) < 1) return { ok: false, message: "That date has already passed — decline the request instead." };
  const released = await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    await db`update weddings set wedding_date = ${toDate} where id = ${r.wedding_id}`;
    const balanceDue = new Date(toDate + "T12:00:00"); balanceDue.setDate(balanceDue.getDate() - 30);
    const due = isoDay(balanceDue < new Date() ? new Date() : balanceDue);
    await db`update client_payments set due_date = ${due} where booking_id = ${r.booking_id} and status = 'scheduled' and kind = 'balance'`;
    await db`update client_payments set due_date = least(due_date, ${due}::date) where booking_id = ${r.booking_id} and status = 'scheduled' and kind <> 'balance'`;
    const expires = new Date(toDate + "T12:00:00"); expires.setDate(expires.getDate() - 10);
    const members = await db`select a.id, tm.user_id from wedding_assignments a join team_members tm on tm.id = a.team_member_id
      where a.wedding_id = ${r.wedding_id} and a.status in ('accepted','pending','offered')`;
    await db`update wedding_assignments set status = 'open', team_member_id = null, accepted_at = null, approved_at = null, approved_by = null, offered_at = null, offered_by = null,
        prep_confirmed_at = null, travel_miles = null, expires_at = ${expires.toISOString()}
      where wedding_id = ${r.wedding_id} and status in ('open','accepted','pending','offered')`;
    // Agreements were for the old date; team members re-sign if they take the new one
    await voidContracts(db, { weddingId: r.wedding_id }, `Wedding moved to ${fmtDate(toDate)}`);
    await db`update assignment_cancellations set status = 'withdrawn', decided_at = now(), decision_note = 'Released when the wedding date changed' where wedding_id = ${r.wedding_id} and status = 'pending'`;
    for (const m of members) await db`delete from conversation_participants where user_id = ${m.user_id} and conversation_id in (select id from conversations where wedding_id = ${r.wedding_id} and kind = 'wedding')`;
    await db`insert into documents (wedding_id, type, title, content, visibility) values (${r.wedding_id}, 'contract', ${`Amendment — new date ${fmtDate(toDate)}`},
      ${`Wedding date moved from ${fmtDate(r.from_date_s)} to ${fmtDate(toDate)}. Payment due dates were updated to match.`}, 'client')`;
    await db`update wedding_change_requests set status = 'approved', decision_note = ${note?.trim() || null}, decided_by = ${staff.id}, decided_at = now() where id = ${id}`;
    return members;
  });
  if (clientId) await notify(clientId, "booking", "New date confirmed", `Your wedding is now on ${fmtDate(toDate)}. We're confirming your team for the new date.`, "/client");
  for (const m of released) await notify(m.user_id, "booking", `Date changed: ${r.couple}`, `This wedding moved to ${fmtDate(toDate)} and your agreement for the old date was voided. If you're free, accept it again from Open Weddings.`, "/team/open");
  revalidatePath("/", "layout");
  return { ok: true, message: `Approved — ${r.couple} moved to ${fmtDate(toDate)}${released.length ? `; ${released.length} team member${released.length > 1 ? "s" : ""} asked to re-confirm` : ""}` };
}

