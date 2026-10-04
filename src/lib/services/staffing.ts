import "server-only";
import { sql, num } from "@/lib/db";
import { notify } from "./notifications";
import { distanceTo, mileagePay, type Distance } from "@/lib/geo";
import { ROLE_LABEL } from "@/lib/pricing";
import { fmtDate } from "@/lib/utils";
import { ROLE_PREFIX, joinWeddingThreads, leaveWeddingThreads, REQUIRED_DOCS, effectiveLicenseStatus } from "./team";
import { voidContracts } from "./contracts";

type Db = typeof sql;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const REQUIRED = REQUIRED_DOCS.filter((d) => d.required).map((d) => d.type as string);

/* ───────────── Wedding list ───────────── */
export async function adminWeddings(view: "upcoming" | "attention" | "past" | "all", q: string) {
  const where = view === "upcoming" || view === "attention" ? sql`and w.wedding_date >= current_date and w.status <> 'cancelled'`
    : view === "past" ? sql`and (w.wedding_date < current_date or w.status in ('completed','cancelled'))` : sql``;
  const search = q ? sql`and (w.couple ilike ${"%" + q + "%"} or w.venue_name ilike ${"%" + q + "%"} or m.city ilike ${"%" + q + "%"} or b.booking_number ilike ${"%" + q + "%"})` : sql``;
  const rows = await sql`
    select w.id, w.couple, w.wedding_date::text, w.status, w.venue_name, w.reception_venue_name, m.city, m.state, b.booking_number, p.name as package,
      count(a.id) filter (where a.status not in ('cancelled','filled'))::int as slots,
      count(a.id) filter (where a.status = 'accepted' or a.status = 'completed')::int as confirmed,
      count(a.id) filter (where a.status = 'pending')::int as pending,
      count(a.id) filter (where a.status = 'offered')::int as offered,
      count(a.id) filter (where a.status in ('open','expired'))::int as open,
      (select count(*) from assignment_cancellations c where c.wedding_id = w.id and c.status = 'pending')::int as cancellations,
      (select count(*) from wedding_change_requests r where r.wedding_id = w.id and r.status = 'pending')::int as changes
    from weddings w join markets m on m.id = w.market_id left join bookings b on b.wedding_id = w.id left join packages p on p.id = b.package_id
      left join wedding_assignments a on a.wedding_id = w.id
    where true ${where} ${search}
    group by w.id, m.city, m.state, b.booking_number, p.name
    order by ${view === "past" ? sql`w.wedding_date desc` : sql`w.wedding_date asc`} limit 300`;
  return view === "attention" ? rows.filter((r) => r.pending || r.open || r.cancellations || r.changes) : rows;
}

/* ───────────── One wedding ───────────── */
export type SlotRow = {
  id: string; role: string; status: string; compensation: number; coverage_hours: number; call_time: string | null; expires_at: Date | null;
  accepted_at: Date | null; approved_at: Date | null; offered_at: Date | null; travel_miles: number | null;
  member: null | { id: string; user_id: string; name: string; email: string; phone: string | null; avatar_url: string | null; rating: number; late_cancels: number; docs_ok: boolean; distance: Distance | null };
  contract: null | { id: string; signed_at: Date; template_version: number };
  cancellation: null | { id: string; reason: string; late: boolean; days_before: number; requested_at: Date };
  approved_by_name: string | null; offered_by_name: string | null;
};

export async function adminWedding(weddingId: string) {
  const [w] = await sql`select w.*, w.wedding_date::text as wedding_date, w.start_time::text as start_time, m.city, m.state, m.slug as market_slug,
      b.id as booking_id, b.booking_number, b.total, b.status as booking_status, b.service_slug, p.name as package, p.hours as package_hours,
      c.partner_one, c.partner_two, u.email as client_email, u.phone as client_phone
    from weddings w join markets m on m.id = w.market_id left join bookings b on b.wedding_id = w.id left join packages p on p.id = b.package_id
      left join clients c on c.id = w.client_id left join users u on u.id = c.user_id where w.id = ${weddingId}`;
  if (!w) return null;
  const slots = await sql`
    select a.id, a.role, a.status, a.compensation, a.coverage_hours, a.call_time::text, a.expires_at, a.accepted_at, a.approved_at, a.offered_at, a.travel_miles,
      t.id as tm_id, t.user_id as tm_user, t.rating, t.lat, t.lng, tm.slug as tm_market, u.full_name, u.email, u.phone, u.avatar_url,
      ua.full_name as approved_by_name, uo.full_name as offered_by_name,
      (select count(*) from assignment_cancellations x where x.team_member_id = t.id and x.late and x.status in ('reassigned','reopened'))::int as late_cancels,
      (select json_build_object('id', ac.id, 'signed_at', ac.signed_at, 'template_version', ac.template_version) from assignment_contracts ac
         where ac.assignment_id = a.id and ac.team_member_id = t.id and ac.status = 'active' order by ac.signed_at desc limit 1) as contract,
      (select json_build_object('id', x.id, 'reason', x.reason, 'late', x.late, 'days_before', x.days_before, 'requested_at', x.requested_at) from assignment_cancellations x
         where x.assignment_id = a.id and x.status = 'pending' limit 1) as cancellation,
      (select coalesce(json_agg(json_build_object('doc_type', l.doc_type, 'status', l.status, 'expires_on', l.expires_on)), '[]') from licenses l where l.team_member_id = t.id) as docs
    from wedding_assignments a left join team_members t on t.id = a.team_member_id left join users u on u.id = t.user_id left join markets tm on tm.id = t.home_market_id
      left join users ua on ua.id = a.approved_by left join users uo on uo.id = a.offered_by
    where a.wedding_id = ${weddingId} order by a.status in ('cancelled','filled'), a.role`;
  const venue = { lat: w.venue_lat, lng: w.venue_lng, market_slug: w.market_slug };
  const slotRows: SlotRow[] = slots.map((s) => ({
    id: s.id, role: s.role, status: s.status, compensation: s.compensation, coverage_hours: s.coverage_hours, call_time: s.call_time, expires_at: s.expires_at,
    accepted_at: s.accepted_at, approved_at: s.approved_at, offered_at: s.offered_at, travel_miles: s.travel_miles,
    approved_by_name: s.approved_by_name, offered_by_name: s.offered_by_name,
    member: s.tm_id ? {
      id: s.tm_id, user_id: s.tm_user, name: s.full_name, email: s.email, phone: s.phone, avatar_url: s.avatar_url, rating: num(s.rating), late_cancels: s.late_cancels,
      docs_ok: docsOk(s.docs), distance: s.travel_miles != null ? { miles: s.travel_miles, exact: true, from: "home" } : distanceTo({ lat: s.lat, lng: s.lng, market_slug: s.tm_market }, venue),
    } : null,
    contract: s.contract, cancellation: s.cancellation,
  }));
  const [changes, contracts, history] = await Promise.all([
    sql`select r.id, r.kind, r.status, r.note, r.decision_note, r.created_at, r.decided_at, r.from_date::text, r.to_date::text, r.total_before, r.total_after, r.removed_addons,
          r.payload, r.before, fp.name as from_package, tp.name as to_package, ud.full_name as decided_by_name
        from wedding_change_requests r left join packages fp on fp.id = r.from_package_id left join packages tp on tp.id = r.to_package_id left join users ud on ud.id = r.decided_by
        where r.wedding_id = ${weddingId} order by r.status = 'pending' desc, r.created_at desc`,
    sql`select c.id, c.role, c.signer_name, c.signed_at, c.template_version, c.status, c.void_reason, c.compensation from assignment_contracts c where c.wedding_id = ${weddingId} order by c.signed_at desc`,
    sql`select x.id, x.role, x.reason, x.late, x.days_before, x.status, x.requested_at, x.decided_at, x.decision_note, u.full_name, ur.full_name as replacement
        from assignment_cancellations x join team_members t on t.id = x.team_member_id join users u on u.id = t.user_id
        left join team_members tr on tr.id = x.replacement_member_id left join users ur on ur.id = tr.user_id
        where x.wedding_id = ${weddingId} order by x.requested_at desc`,
  ]);
  return { wedding: w, slots: slotRows, changes, contracts, cancellations: history };
}

function docsOk(docs: { doc_type: string; status: string; expires_on: string | null }[] | null) {
  const list = docs ?? [];
  return REQUIRED.every((t) => list.some((l) => l.doc_type === t && ["verified", "expiring_soon"].includes(effectiveLicenseStatus(l))));
}

/* ───────────── Candidates for a slot ───────────── */
export type Candidate = {
  id: string; name: string; avatar_url: string | null; city: string | null; rating: number; distance: Distance | null; mileage: number;
  calendar: "available" | "unavailable" | "personal" | null; booked: string | null; docs_ok: boolean; late_cancels: number; upcoming: number; declined: boolean;
  blocked: string | null;
};
export async function candidatesFor(assignmentId: string, db: Db = sql): Promise<Candidate[]> {
  const [a] = await db`select a.id, a.role, a.wedding_id, a.team_member_id, w.wedding_date::text as date, w.venue_lat, w.venue_lng, m.slug as market_slug
    from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id where a.id = ${assignmentId}`;
  if (!a) return [];
  const discipline = a.role.endsWith("photo") ? "photo" : "video";
  const rows = await db`
    select t.id, u.full_name, u.avatar_url, t.rating, t.lat, t.lng, mk.slug as market_slug, mk.city,
      (select status from availability av where av.team_member_id = t.id and av.date = ${a.date}) as calendar,
      (select w2.couple from wedding_assignments x join weddings w2 on w2.id = x.wedding_id
         where x.team_member_id = t.id and x.status in ('accepted','pending','offered') and w2.wedding_date = ${a.date} and w2.status <> 'cancelled' and x.id <> ${a.id} limit 1) as booked,
      exists(select 1 from wedding_assignments x where x.wedding_id = ${a.wedding_id} and x.team_member_id = t.id and x.status in ('accepted','pending','offered') and x.id <> ${a.id}) as on_wedding,
      exists(select 1 from assignment_declines d where d.assignment_id = ${a.id} and d.team_member_id = t.id) as declined,
      (select count(*) from assignment_cancellations x where x.team_member_id = t.id and x.late and x.status in ('reassigned','reopened'))::int as late_cancels,
      (select count(*) from wedding_assignments x join weddings w2 on w2.id = x.wedding_id where x.team_member_id = t.id and x.status = 'accepted' and w2.wedding_date >= current_date)::int as upcoming,
      (select coalesce(json_agg(json_build_object('doc_type', l.doc_type, 'status', l.status, 'expires_on', l.expires_on)), '[]') from licenses l where l.team_member_id = t.id) as docs
    from team_members t join users u on u.id = t.user_id left join markets mk on mk.id = t.home_market_id
    where t.discipline = ${discipline} and t.status = 'active' and u.status = 'active' and t.id is distinct from ${a.team_member_id}`;
  const venue = { lat: a.venue_lat, lng: a.venue_lng, market_slug: a.market_slug };
  return rows.map((r) => {
    const distance = distanceTo({ lat: r.lat, lng: r.lng, market_slug: r.market_slug }, venue);
    const blocked = r.on_wedding ? "Already on this wedding" : r.booked ? `Booked: ${r.booked}` : r.calendar && r.calendar !== "available" ? `Marked ${r.calendar}` : null;
    return {
      id: r.id, name: r.full_name, avatar_url: r.avatar_url, city: r.city, rating: num(r.rating), distance, mileage: mileagePay(distance?.miles),
      calendar: r.calendar, booked: r.booked, docs_ok: docsOk(r.docs), late_cancels: r.late_cancels, upcoming: r.upcoming, declined: r.declined, blocked,
    } as Candidate;
  }).sort((x, y) => Number(!!x.blocked) - Number(!!y.blocked) || (x.distance?.miles ?? 1e9) - (y.distance?.miles ?? 1e9));
}

/* ───────────── Decisions ───────────── */
const slotWithWedding = (db: Db, id: string) => db`select a.*, w.couple, w.wedding_date::text as date, w.id as wid, w.status as wstatus, t.user_id as member_user, u.full_name as member_name
  from wedding_assignments a join weddings w on w.id = a.wedding_id left join team_members t on t.id = a.team_member_id left join users u on u.id = t.user_id
  where a.id = ${id} for update of a`;

export async function approveRequest(staffId: string, assignmentId: string) {
  const r = await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    const [a] = await slotWithWedding(db, assignmentId);
    if (!a || a.status !== "pending") return { ok: false as const, message: "That request is no longer pending." };
    const [signed] = await db`select 1 from assignment_contracts where assignment_id = ${assignmentId} and team_member_id = ${a.team_member_id} and status = 'active'`;
    await db`update wedding_assignments set status = 'accepted', approved_at = now(), approved_by = ${staffId} where id = ${assignmentId}`;
    await joinWeddingThreads(db, a.wid, a.member_user);
    return { ok: true as const, a, signed: !!signed };
  });
  if (!r.ok) return r;
  await notify(r.a.member_user, "booking", "You're confirmed", `Your request for ${r.a.couple} on ${fmtDate(r.a.date)} was approved. Your countersigned agreement is ready to download.`, `/team/weddings/${r.a.wid}`);
  return { ok: true as const, message: `${r.a.member_name} confirmed for ${r.a.couple}` };
}

export async function declineRequest(staffId: string, assignmentId: string, note: string | null) {
  const r = await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    const [a] = await slotWithWedding(db, assignmentId);
    if (!a || a.status !== "pending") return { ok: false as const, message: "That request is no longer pending." };
    await db`update wedding_assignments set status = 'open', team_member_id = null, accepted_at = null, travel_miles = null where id = ${assignmentId}`;
    await db`insert into assignment_declines (assignment_id, team_member_id, reason) values (${assignmentId}, ${a.team_member_id}, 'Not approved by coordinator') on conflict do nothing`;
    await voidContracts(db, { assignmentId, teamMemberId: a.team_member_id }, "Request not approved");
    return { ok: true as const, a };
  });
  if (!r.ok) return r;
  await notify(r.a.member_user, "booking", "Request not approved", note || `${r.a.couple} was assigned to someone else this time.`, "/team/open");
  return { ok: true as const, message: "Declined — slot reopened" };
}

export async function offerSlot(staffId: string, assignmentId: string, memberId: string, note: string | null) {
  const r = await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    const [a] = await slotWithWedding(db, assignmentId);
    if (!a || a.wstatus === "cancelled") return { ok: false as const, message: "Wedding not found." };
    if (!["open", "expired"].includes(a.status)) return { ok: false as const, message: "This slot already has someone. Release them first." };
    const c = (await candidatesFor(assignmentId, db)).find((x) => x.id === memberId);
    if (!c) return { ok: false as const, message: "That person can't take this role." };
    if (c.blocked) return { ok: false as const, message: `${c.name} isn't free: ${c.blocked.toLowerCase()}.` };
    const [m] = await db`select user_id from team_members where id = ${memberId}`;
    await db`update wedding_assignments set status = 'offered', team_member_id = ${memberId}, offered_at = now(), offered_by = ${staffId}, accepted_at = null, approved_at = null,
        travel_miles = ${c.distance?.miles ?? null}, notes = coalesce(${note}, notes) where id = ${assignmentId}`;
    await db`delete from assignment_declines where assignment_id = ${assignmentId} and team_member_id = ${memberId}`;
    return { ok: true as const, a, c, userId: m.user_id as string };
  });
  if (!r.ok) return r;
  await notify(r.userId, "opportunity", `You've been offered ${r.a.couple}`, `${ROLE_LABEL[r.a.role]} on ${fmtDate(r.a.date)}. Review and sign to confirm.${note ? ` ${note}` : ""}`, `/team/open?id=${assignmentId}`);
  return { ok: true as const, message: `Offered to ${r.c.name} — they'll sign the agreement to confirm` };
}

export async function withdrawOffer(assignmentId: string) {
  const [a] = await sql`update wedding_assignments a set status = 'open', team_member_id = null, offered_at = null, offered_by = null, travel_miles = null
    from team_members t, weddings w where a.id = ${assignmentId} and a.status = 'offered' and t.id = a.team_member_id and w.id = a.wedding_id
    returning t.user_id, w.couple`;
  if (!a) return { ok: false as const, message: "That offer is no longer open." };
  await notify(a.user_id, "opportunity", `Offer withdrawn: ${a.couple}`, "The coordinator withdrew this offer. No action needed.", "/team/open");
  return { ok: true as const, message: "Offer withdrawn — slot is open again" };
}

/**
 * Take someone off a wedding (after a cancellation request, or the coordinator's call):
 * reopen the slot on Open Weddings, or offer it straight to a replacement.
 */
export async function releaseMember(staffId: string, assignmentId: string, opts: { replacementId?: string | null; note: string | null }) {
  const r = await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    const [a] = await slotWithWedding(db, assignmentId);
    if (!a || !a.team_member_id || !["accepted", "pending", "offered"].includes(a.status)) return { ok: false as const, message: "Nobody is assigned to this slot." };
    const [cancel] = await db`select id, late from assignment_cancellations where assignment_id = ${assignmentId} and status = 'pending'`;
    await voidContracts(db, { assignmentId, teamMemberId: a.team_member_id }, cancel ? "Released at the team member's request" : "Removed from the wedding by a coordinator");
    await leaveWeddingThreads(db, a.wid, a.member_user);
    await db`update availability set note = null where team_member_id = ${a.team_member_id} and date = ${a.date} and note = ${"Booked: " + a.couple}`;
    const expires = new Date(a.date + "T12:00:00"); expires.setDate(expires.getDate() - 3);
    await db`update wedding_assignments set status = 'open', team_member_id = null, accepted_at = null, approved_at = null, approved_by = null, prep_confirmed_at = null,
        offered_at = null, offered_by = null, travel_miles = null, expires_at = ${expires < new Date() ? null : expires.toISOString()} where id = ${assignmentId}`;
    if (cancel) await db`update assignment_cancellations set status = ${opts.replacementId ? "reassigned" : "reopened"}, decided_by = ${staffId}, decided_at = now(),
        decision_note = ${opts.note}, replacement_member_id = ${opts.replacementId ?? null} where id = ${cancel.id}`;
    return { ok: true as const, a, cancel: cancel ?? null };
  });
  if (!r.ok) return r;
  const { a, cancel } = r;
  await notify(a.member_user, "booking", cancel ? "Cancellation approved" : `Removed from ${a.couple}`,
    cancel ? `You've been released from ${a.couple} on ${fmtDate(a.date)}.${cancel.late ? " Because this was within 14 days of the wedding, it's noted on your record." : ""}${opts.note ? ` ${opts.note}` : ""}`
      : `A coordinator removed you from ${a.couple} on ${fmtDate(a.date)}.${opts.note ? ` ${opts.note}` : ""}`, "/team/weddings");
  if (opts.replacementId) {
    const o = await offerSlot(staffId, assignmentId, opts.replacementId, null);
    if (!o.ok) return { ok: true as const, message: `${a.member_name} released, but the offer failed: ${o.message} The slot is open on Open Weddings.` };
    return { ok: true as const, message: `${a.member_name} released — ${o.message.replace(/^Offered/, "offered")}` };
  }
  return { ok: true as const, message: `${a.member_name} released — slot reopened on Open Weddings` };
}

export async function keepMember(staffId: string, assignmentId: string, note: string) {
  const [c] = await sql`update assignment_cancellations x set status = 'kept', decided_by = ${staffId}, decided_at = now(), decision_note = ${note}
    from team_members t, weddings w where x.assignment_id = ${assignmentId} and x.status = 'pending' and t.id = x.team_member_id and w.id = x.wedding_id
    returning t.user_id, w.couple, w.id as wid`;
  if (!c) return { ok: false as const, message: "There's no pending cancellation for this slot." };
  await notify(c.user_id, "booking", `Still on ${c.couple}`, `Your coordinator couldn't release you from this wedding: ${note}`, `/team/weddings/${c.wid}`);
  return { ok: true as const, message: "Kept on the wedding — team member notified" };
}

export const ACTIVE_SLOT = (s: Row) => !["cancelled", "expired", "filled"].includes(s.status);
export { ROLE_PREFIX };
