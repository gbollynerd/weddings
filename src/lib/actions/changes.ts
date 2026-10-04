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
import type { ActionResult } from "./types";

type Db = typeof sql;

/** The signed-in client's booking for a wedding, if it's still changeable. */
async function ownedBooking(userId: string, weddingId: string) {
  const [b] = await sql`select b.id, b.booking_number, b.package_id, b.status, w.id as wedding_id, w.couple, w.wedding_date::text, w.status as wedding_status, w.market_id,
      w.venue_name, w.venue_address, w.ceremony_location, w.reception_location
    from bookings b join weddings w on w.id = b.wedding_id join clients c on c.id = b.client_id
    where w.id = ${weddingId} and c.user_id = ${userId} and b.status <> 'cancelled' limit 1`;
  if (!b) return { error: "We couldn't find that booking." } as const;
  if (b.wedding_status === "cancelled") return { error: "This booking was cancelled." } as const;
  if (b.wedding_date < isoDay(new Date())) return { error: "This wedding has already taken place." } as const;
  return { b } as const;
}

async function teamAndCoordinators(weddingId: string) {
  return sql`select distinct t.user_id, 'team' as kind from wedding_assignments a join team_members t on t.id = a.team_member_id
      where a.wedding_id = ${weddingId} and a.status in ('accepted','pending')
    union select id as user_id, 'coordinator' as kind from users where role = 'coordinator'`;
}
const coordinators = () => sql`select id from users where role = 'coordinator'`;

/* ───────────── Venue: applies immediately ───────────── */
const Venue = z.object({
  venue: z.string().trim().min(2, "Enter the venue name").max(120),
  address: z.string().trim().max(200).optional().default(""),
  ceremony: z.string().trim().min(2, "Where is the ceremony?").max(160),
  reception: z.string().trim().max(160).optional().default(""),
});

export async function updateVenueAction(weddingId: string, input: z.input<typeof Venue>): Promise<ActionResult> {
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
  const [known] = await sql`select id, address from venues where market_id = ${b.market_id} and lower(name) = lower(${v.venue})`;
  const address = v.address || known?.address || null;
  const reception = v.reception || v.ceremony;
  const same = v.venue === b.venue_name && (address ?? "") === (b.venue_address ?? "") && v.ceremony === b.ceremony_location && reception === b.reception_location;
  if (same) return { ok: true, message: "No changes to save" };

  await sql`update weddings set venue_name = ${v.venue}, venue_id = ${known?.id ?? null}, venue_address = ${address}, ceremony_location = ${v.ceremony}, reception_location = ${reception}
    where id = ${weddingId}`;
  const info = `**${v.venue}**\n\n${address ?? ""}\n\nCeremony: ${v.ceremony}\nReception: ${reception}`;
  const [doc] = await sql`update documents set content = ${info} where wedding_id = ${weddingId} and type = 'venue_info' returning id`;
  if (!doc) await sql`insert into documents (wedding_id, type, title, content, visibility) values (${weddingId}, 'venue_info', 'Venue information', ${info}, 'team')`;

  const venueChanged = v.venue !== b.venue_name || (address ?? "") !== (b.venue_address ?? "");
  const title = venueChanged ? `Venue changed: ${b.couple}` : `Location details updated: ${b.couple}`;
  const body = venueChanged ? `Now at ${v.venue}${address ? ` · ${address}` : ""} on ${fmtDate(b.wedding_date)}.` : `Ceremony: ${v.ceremony} · Reception: ${reception}`;
  for (const r of await teamAndCoordinators(weddingId)) await notify(r.user_id, "change", title, body, r.kind === "team" ? `/team/weddings/${weddingId}` : "/admin");
  revalidatePath("/", "layout");
  return { ok: true, message: venueChanged ? "Venue updated — your team has been notified" : "Location details updated" };
}

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
  for (const c of await coordinators()) await notify(c.id, "change", `Package change request: ${b.couple}`, `${full.package_name} → ${pkg.name} (${delta}).`, "/admin");
  revalidatePath("/client", "layout"); revalidatePath("/admin");
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
  for (const c of await coordinators()) await notify(c.id, "change", `Date change request: ${b.couple}`, `${fmtDate(b.wedding_date)} → ${fmtDate(toDate)}.`, "/admin");
  revalidatePath("/client", "layout"); revalidatePath("/admin");
  return { ok: true, message: "Request sent — we'll check team availability and confirm" };
}

export async function cancelChangeRequestAction(id: string): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const [r] = await sql`update wedding_change_requests r set status = 'cancelled', decided_at = now()
    from bookings b join clients c on c.id = b.client_id
    where r.id = ${id} and r.booking_id = b.id and c.user_id = ${u.id} and r.status = 'pending' returning r.kind`;
  if (!r) return { ok: false, message: "That request is no longer pending." };
  revalidatePath("/client", "layout"); revalidatePath("/admin");
  return { ok: true, message: "Request cancelled" };
}

/* ───────────── Coordinator decision ───────────── */
export async function decideChangeRequestAction(id: string, approve: boolean, note?: string): Promise<ActionResult> {
  const staff = await requirePermission("booking:manage");
  const [r] = await sql`select r.*, r.to_date::text as to_date_s, r.from_date::text as from_date_s, w.couple, w.wedding_date::text as wedding_date
    from wedding_change_requests r join weddings w on w.id = r.wedding_id where r.id = ${id} and r.status = 'pending'`;
  if (!r) return { ok: false, message: "That request is no longer pending." };
  const clientId = r.requested_by as string | null;
  const what = r.kind === "package" ? "package change" : "date change";

  if (!approve) {
    if (!note?.trim()) return { ok: false, message: "Add a short reason so the couple knows why." };
    await sql`update wedding_change_requests set status = 'declined', decision_note = ${note.trim().slice(0, 1000)}, decided_by = ${staff.id}, decided_at = now() where id = ${id}`;
    if (clientId) await notify(clientId, "change", `Your ${what} wasn't approved`, note.trim(), "/client");
    revalidatePath("/", "layout");
    return { ok: true, message: "Declined — the couple has been notified" };
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
      where a.wedding_id = ${r.wedding_id} and a.status in ('accepted','pending')`;
    await db`update wedding_assignments set status = 'open', team_member_id = null, accepted_at = null, prep_confirmed_at = null, expires_at = ${expires.toISOString()}
      where wedding_id = ${r.wedding_id} and status in ('open','accepted','pending')`;
    await db`insert into documents (wedding_id, type, title, content, visibility) values (${r.wedding_id}, 'contract', ${`Amendment — new date ${fmtDate(toDate)}`},
      ${`Wedding date moved from ${fmtDate(r.from_date_s)} to ${fmtDate(toDate)}. Payment due dates were updated to match.`}, 'client')`;
    await db`update wedding_change_requests set status = 'approved', decision_note = ${note?.trim() || null}, decided_by = ${staff.id}, decided_at = now() where id = ${id}`;
    return members;
  });
  if (clientId) await notify(clientId, "booking", "New date confirmed", `Your wedding is now on ${fmtDate(toDate)}. We're confirming your team for the new date.`, "/client");
  for (const m of released) await notify(m.user_id, "booking", `Date changed: ${r.couple}`, `This wedding moved to ${fmtDate(toDate)}. If you're free, accept it again from Open Weddings.`, "/team/open");
  revalidatePath("/", "layout");
  return { ok: true, message: `Approved — ${r.couple} moved to ${fmtDate(toDate)}${released.length ? `; ${released.length} team member${released.length > 1 ? "s" : ""} asked to re-confirm` : ""}` };
}

