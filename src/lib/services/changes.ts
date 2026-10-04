import "server-only";
import { sql, num } from "@/lib/db";
import { marketPrice, compensationFor } from "@/lib/pricing";

type Tx = typeof sql;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Days before the wedding inside which date changes may carry a fee (booking policy). */
export const FREE_DATE_CHANGE_DAYS = 90;
/** New wedding dates must be at least this far out (same rule as new bookings). */
export const MIN_LEAD_DAYS = 14;

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(toIso + "T12:00:00").getTime() - new Date(fromIso + "T12:00:00").getTime()) / 86400000);
}

/** Team slots a package needs (mirrors booking creation). */
export function slotsFor(pkg: Row, addonSlugs: string[]) {
  const slots: string[] = [];
  if (pkg.photographers >= 1) slots.push("lead_photo");
  if (pkg.photographers >= 2 || addonSlugs.includes("second-photographer")) slots.push("second_photo");
  if (pkg.videographers >= 1 || addonSlugs.includes("highlight-video")) slots.push("lead_video");
  if (pkg.videographers >= 2) slots.push("second_video");
  return slots;
}
export function coverageHours(pkgHours: number, addons: { slug: string; quantity: number }[]) {
  const extra = addons.find((a) => a.slug === "additional-hour")?.quantity ?? 0;
  return pkgHours + extra + (addons.some((a) => a.slug === "reception-coverage") ? 2 : 0);
}

/** Load a booking with everything needed to price a package change. */
export async function bookingForChange(db: Tx, bookingId: string) {
  const [b] = await db`select b.id, b.booking_number, b.wedding_id, b.package_id, b.service_slug, b.package_price, b.addons_total, b.total, b.status,
      w.couple, w.wedding_date::text, w.status as wedding_status, m.price_multiplier, m.slug as market, p.name as package_name
    from bookings b join weddings w on w.id = b.wedding_id join markets m on m.id = w.market_id join packages p on p.id = b.package_id where b.id = ${bookingId}`;
  if (!b) return null;
  const addons = await db`select a.id, a.slug, a.name, a.applies_to, ba.quantity, ba.unit_price from booking_addons ba join addons a on a.id = ba.addon_id where ba.booking_id = ${bookingId}`;
  return { ...b, price_multiplier: num(b.price_multiplier), addons } as Row & { addons: Row[] };
}

/** Price a move to another package: add-ons that don't apply to the new service are dropped. */
export function pricePackageChange(b: Row & { addons: Row[] }, pkg: Row) {
  const packagePrice = marketPrice(pkg.base_price, b.price_multiplier);
  const kept = b.addons.filter((a) => (a.applies_to as string[]).includes(pkg.service_slug));
  const removed = b.addons.filter((a) => !(a.applies_to as string[]).includes(pkg.service_slug));
  const addonsTotal = kept.reduce((s, a) => s + a.unit_price * Math.max(1, a.quantity), 0);
  const total = packagePrice + addonsTotal;
  return { packagePrice, kept, removed, addonsTotal, total, diff: total - b.total };
}

/**
 * Re-balance the payment schedule after the booking total changes by `diff`.
 * Increases go on the last scheduled payment (or a new balance payment); decreases come off
 * scheduled payments first, and anything already overpaid is recorded as a refund.
 */
export async function applyTotalChange(db: Tx, bookingId: string, weddingDate: string, diff: number) {
  if (diff === 0) return { refund: 0 };
  const scheduled = await db`select id, amount from client_payments where booking_id = ${bookingId} and status = 'scheduled' order by due_date desc, id`;
  if (diff > 0) {
    if (scheduled.length) await db`update client_payments set amount = amount + ${diff} where id = ${scheduled[0].id}`;
    else {
      const due = new Date(weddingDate + "T12:00:00"); due.setDate(due.getDate() - 30);
      await db`insert into client_payments (booking_id, kind, amount, due_date, status) values (${bookingId}, 'balance', ${diff}, ${isoDay(due < new Date() ? new Date() : due)}, 'scheduled')`;
    }
    return { refund: 0 };
  }
  let credit = -diff;
  for (const p of scheduled) {
    if (credit <= 0) break;
    const take = Math.min(p.amount, credit);
    if (take === p.amount) await db`delete from client_payments where id = ${p.id}`;
    else await db`update client_payments set amount = amount - ${take} where id = ${p.id}`;
    credit -= take;
  }
  if (credit > 0) {
    const [last] = await db`select method_brand, method_last4 from client_payments where booking_id = ${bookingId} and status = 'paid' order by paid_at desc nulls last limit 1`;
    await db`insert into client_payments (booking_id, kind, amount, due_date, status, paid_at, method_brand, method_last4)
      values (${bookingId}, 'refund', ${credit}, current_date, 'refunded', now(), ${last?.method_brand ?? null}, ${last?.method_last4 ?? null})`;
  }
  return { refund: credit };
}

/** Bring the wedding's team slots in line with a (new) package. Returns members whose slot changed. */
export async function syncTeamSlots(db: Tx, weddingId: string, weddingDate: string, pkg: Row, addons: { slug: string; quantity: number }[]) {
  const hours = coverageHours(pkg.hours, addons);
  const need = slotsFor(pkg, addons.map((a) => a.slug));
  const active = await db`select a.id, a.role, a.status, a.coverage_hours, tm.user_id from wedding_assignments a left join team_members tm on tm.id = a.team_member_id
    where a.wedding_id = ${weddingId} and a.status in ('open','pending','accepted')`;
  const [{ start }] = await db`select start_time::text as start from weddings where id = ${weddingId}`;
  const [h, m] = String(start).split(":").map(Number);
  const at = (dm: number) => { const t = h * 60 + m + dm; return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
  const expires = new Date(weddingDate + "T12:00:00"); expires.setDate(expires.getDate() - 10);
  const released: Row[] = [], changed: Row[] = [];
  let added = 0;
  for (const a of active) {
    if (!need.includes(a.role)) {
      await db`update wedding_assignments set status = 'cancelled' where id = ${a.id}`;
      if (a.user_id) released.push(a);
    } else if (a.coverage_hours !== hours) {
      await db`update wedding_assignments set coverage_hours = ${hours}, compensation = ${compensationFor(a.role, hours)} where id = ${a.id}`;
      if (a.user_id && a.status === "accepted") changed.push(a);
    }
  }
  for (const role of need.filter((r) => !active.some((a) => a.role === r))) {
    await db`insert into wedding_assignments (wedding_id, role, status, compensation, coverage_hours, call_time, requirements, expires_at)
      values (${weddingId}, ${role}, 'open', ${compensationFor(role, hours)}, ${hours}, ${role.startsWith("second") ? at(30) : at(0)},
              ${role.startsWith("lead") ? ["Lead experience", "Two camera bodies", "Black attire"] : ["Second-shooter experience", "Black attire"]}, ${expires.toISOString()})`;
    added++;
  }
  return { hours, released, changed, added };
}

/** Change requests for a wedding, newest first, with package names resolved. */
export async function changeRequestsFor(weddingId: string) {
  return sql`select r.id, r.kind, r.status, r.note, r.decision_note, r.created_at, r.decided_at, r.from_date::text, r.to_date::text,
      r.total_before, r.total_after, r.removed_addons, fp.name as from_package, tp.name as to_package
    from wedding_change_requests r left join packages fp on fp.id = r.from_package_id left join packages tp on tp.id = r.to_package_id
    where r.wedding_id = ${weddingId} order by r.created_at desc limit 10`;
}
