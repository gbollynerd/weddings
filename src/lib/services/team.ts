import "server-only";
import { sql, num } from "@/lib/db";
import { notify } from "./notifications";
import { distanceTo, mileagePay, type Distance } from "@/lib/geo";
import { activeTemplate, contractContext, recordSignature, voidContracts, normName, fillTemplate } from "./contracts";
import { standardsAcceptance, STANDARDS_REQUIRED_MESSAGE } from "./standards";

export type Member = {
  id: string; user_id: string; discipline: "photo" | "video"; bio: string | null; home_market_id: string | null;
  service_radius: number; specialties: string[]; years_experience: number; languages: string[]; portfolio_url: string | null;
  instagram: string | null; website: string | null; rating: number; payout_method: string | null; payout_last4: string | null;
  city: string | null; state: string | null; market_slug: string | null;
  full_name: string; email: string; phone: string | null; avatar_url: string | null;
  status: "applicant" | "active" | "rejected" | "inactive"; home_address: string | null; lat: number | null; lng: number | null;
  equipment: string | null; decision_note: string | null; applied_at: Date | null;
};

export async function getMember(userId: string): Promise<Member | null> {
  const [m] = await sql`
    select tm.*, m.city, m.state, m.slug as market_slug, u.full_name, u.email, u.phone, u.avatar_url
    from team_members tm join users u on u.id = tm.user_id left join markets m on m.id = tm.home_market_id
    where tm.user_id = ${userId}`;
  return m ? ({ ...m, rating: num(m.rating), lat: m.lat == null ? null : num(m.lat), lng: m.lng == null ? null : num(m.lng) } as Member) : null;
}

export const ROLE_PREFIX = (d: "photo" | "video") => (d === "photo" ? ["lead_photo", "second_photo"] : ["lead_video", "second_video"]);

/* ───────────── Assignments / weddings ───────────── */
export type AssignmentRow = {
  id: string; wedding_id: string; role: string; status: string; compensation: number; coverage_hours: number; call_time: string | null;
  requirements: string[]; notes: string | null; travel_miles: number | null; expires_at: string | null; accepted_at: string | null;
  prep_confirmed_at: string | null; requires_approval: boolean;
  couple: string; wedding_date: string; start_time: string; venue_name: string; venue_address: string | null; reception_venue_name: string | null; guest_count: number | null;
  wedding_type: string | null; wedding_status: string; city: string; state: string; package_name: string | null; service_slug: string | null;
  market_slug: string; venue_lat: number | null; venue_lng: number | null; offered_at: string | null;
};

/** Where a member travels from: their geocoded home base, else their home market's city centre. */
export const originOf = (m: Pick<Member, "lat" | "lng" | "market_slug">) => ({ lat: m.lat, lng: m.lng, market_slug: m.market_slug });
export const venueOf = (r: { venue_lat: unknown; venue_lng: unknown; market_slug: string }) => ({ lat: r.venue_lat, lng: r.venue_lng, market_slug: r.market_slug });

const assignmentSelect = sql`
  a.id, a.wedding_id, a.role, a.status, a.compensation, a.coverage_hours, a.call_time::text, a.requirements, a.notes, a.travel_miles,
  a.expires_at, a.accepted_at, a.prep_confirmed_at, a.requires_approval, a.offered_at,
  w.couple, w.wedding_date::text, w.start_time::text, w.venue_name, w.venue_address, w.reception_venue_name, w.guest_count, w.wedding_type, w.status as wedding_status,
  m.city, m.state, m.slug as market_slug, w.venue_lat, w.venue_lng, p.name as package_name, b.service_slug`;
const assignmentJoins = sql`
  from wedding_assignments a
  join weddings w on w.id = a.wedding_id
  join markets m on m.id = w.market_id
  left join bookings b on b.wedding_id = w.id
  left join packages p on p.id = b.package_id`;

export async function myAssignments(memberId: string, tab: "upcoming" | "completed" | "cancelled" | "all" = "all") {
  const where =
    tab === "upcoming" ? sql`and a.status in ('accepted','pending') and w.wedding_date >= current_date and w.status <> 'cancelled'`
    : tab === "completed" ? sql`and (a.status = 'completed' or (a.status = 'accepted' and w.wedding_date < current_date))`
    : tab === "cancelled" ? sql`and (a.status = 'cancelled' or w.status = 'cancelled')`
    : sql``;
  const order = tab === "upcoming" ? sql`order by w.wedding_date asc` : sql`order by w.wedding_date desc`;
  return sql<AssignmentRow[]>`select ${assignmentSelect} ${assignmentJoins} where a.team_member_id = ${memberId} ${where} ${order}`;
}

export async function weddingCounts(memberId: string) {
  const [r] = await sql`
    select
      count(*) filter (where a.status in ('accepted','pending') and w.wedding_date >= current_date and w.status <> 'cancelled')::int as upcoming,
      count(*) filter (where a.status = 'completed' or (a.status = 'accepted' and w.wedding_date < current_date))::int as completed,
      count(*) filter (where a.status = 'cancelled' or w.status = 'cancelled')::int as cancelled
    from wedding_assignments a join weddings w on w.id = a.wedding_id where a.team_member_id = ${memberId}`;
  return r as { upcoming: number; completed: number; cancelled: number };
}

export async function weddingForMember(memberId: string, weddingId: string) {
  const [assignment] = await sql<AssignmentRow[]>`select ${assignmentSelect} ${assignmentJoins} where a.wedding_id = ${weddingId} and a.team_member_id = ${memberId} order by a.created_at limit 1`;
  if (!assignment) return null;
  const [timeline, team, documents, questionnaire, uploads, conversation, client] = await Promise.all([
    sql`select id, time::text, title, detail from wedding_timeline_items where wedding_id = ${weddingId} order by sort`,
    sql`select a.role, a.status, a.call_time::text, u.full_name, u.avatar_url, u.phone, tm.discipline, a.team_member_id = ${memberId} as is_me
        from wedding_assignments a left join team_members tm on tm.id = a.team_member_id left join users u on u.id = tm.user_id
        where a.wedding_id = ${weddingId} and a.status not in ('cancelled','expired','filled') order by a.role`,
    sql`select id, type, title, content, created_at from documents where wedding_id = ${weddingId} and visibility in ('all','team') order by created_at`,
    sql`select answers, status, submitted_at from client_questionnaires where wedding_id = ${weddingId}`,
    sql`select id, kind, category, filename, size_bytes, status, created_at, duration_seconds from uploads where wedding_id = ${weddingId} and uploader_id = (select user_id from team_members where id = ${memberId}) order by created_at desc`,
    sql`select c.id from conversations c join conversation_participants cp on cp.conversation_id = c.id
        where c.wedding_id = ${weddingId} and cp.user_id = (select user_id from team_members where id = ${memberId}) order by c.last_message_at desc limit 1`,
    // Team only sees what they need: names, planner, VIP notes. No client email/phone/payment info.
    sql`select c.partner_one, c.partner_two from weddings w join clients c on c.id = w.client_id where w.id = ${weddingId}`,
  ]);
  const [[w], [cancellation], [contract]] = await Promise.all([
    sql`select ceremony_location, reception_location, reception_venue_name, reception_venue_address, special_requests, notes from weddings where id = ${weddingId}`,
    sql`select id, reason, late, days_before, status, requested_at, decided_at, decision_note from assignment_cancellations
        where assignment_id = ${assignment.id} and team_member_id = ${memberId} order by requested_at desc limit 1`,
    sql`select id, signed_at, template_version from assignment_contracts where assignment_id = ${assignment.id} and team_member_id = ${memberId} and status = 'active' order by signed_at desc limit 1`,
  ]);
  return { assignment, wedding: w, timeline, team, documents, questionnaire: questionnaire[0] ?? null, uploads, conversationId: conversation[0]?.id ?? null, client: client[0] ?? null,
    cancellation: cancellation ?? null, contract: contract ?? null };
}

export async function confirmPrep(memberId: string, assignmentId: string) {
  const r = await sql`update wedding_assignments set prep_confirmed_at = now() where id = ${assignmentId} and team_member_id = ${memberId} returning id`;
  return r.length > 0;
}

/* ───────────── Open weddings marketplace ───────────── */
export type Opportunity = AssignmentRow & {
  view_status: "available" | "offered" | "pending" | "accepted" | "expired" | "filled" | "declined"; conflict: boolean; calendar: string | null; hourly: number; eligible: boolean;
  team: { role: string; name: string | null }[]; distance: Distance | null; mileage: number;
};

export async function opportunities(member: Member) {
  const roles = ROLE_PREFIX(member.discipline);
  const rows = await sql<(AssignmentRow & { declined: boolean; mine: boolean; conflict: boolean; calendar: string | null })[]>`
    select ${assignmentSelect},
      exists(select 1 from assignment_declines d where d.assignment_id = a.id and d.team_member_id = ${member.id}) as declined,
      a.team_member_id = ${member.id} as mine,
      exists(select 1 from wedding_assignments x join weddings xw on xw.id = x.wedding_id
             where x.team_member_id = ${member.id} and x.status in ('accepted','pending') and xw.wedding_date = w.wedding_date and x.id <> a.id) as conflict,
      (select status from availability av where av.team_member_id = ${member.id} and av.date = w.wedding_date) as calendar,
      (select json_agg(json_build_object('role', x.role, 'name', u.full_name)) from wedding_assignments x left join team_members t on t.id = x.team_member_id left join users u on u.id = t.user_id
         where x.wedding_id = w.id and x.id <> a.id and x.status in ('accepted','pending','filled')) as team
    ${assignmentJoins}
    where w.status <> 'cancelled'
      and (a.status in ('open','expired','filled') or (a.team_member_id = ${member.id} and a.status in ('pending','accepted') and a.accepted_at > now() - interval '30 days') or (a.team_member_id = ${member.id} and a.status in ('pending','offered')))
      and w.wedding_date >= current_date - 3
    order by w.wedding_date asc`;
  return rows.map((r) => {
    const expired = r.status === "expired" || (r.status === "open" && r.expires_at && new Date(r.expires_at) < new Date());
    const view_status: Opportunity["view_status"] =
      r.mine && r.status === "offered" ? "offered"
      : r.mine && r.status === "pending" ? "pending"
      : r.mine && r.status === "accepted" ? "accepted"
      : r.status === "filled" ? "filled"
      : expired ? "expired"
      : r.declined ? "declined"
      : "available";
    const distance = distanceTo(originOf(member), venueOf(r));
    // Once someone holds the slot, show the distance that was locked in for them
    const miles = r.mine && r.travel_miles != null ? r.travel_miles : distance?.miles ?? null;
    return {
      ...r, team: (r as unknown as { team: Opportunity["team"] | null }).team ?? [], eligible: roles.includes(r.role), view_status, hourly: Math.round(r.compensation / r.coverage_hours),
      distance: distance && miles != null ? { ...distance, miles } : distance, mileage: mileagePay(miles),
    } as Opportunity;
  });
}

export type Signature = { name: string; agree: boolean; version: number; ip: string | null; userAgent: string | null };

/**
 * Accept an open wedding (→ pending until a coordinator approves) or an offer a coordinator made (→ accepted).
 * Either way the member signs the contractor agreement first; the signed copy is stored with the wedding.
 */
export async function acceptOpportunity(member: Member, assignmentId: string, sig: Signature) {
  if (member.status !== "active") return { ok: false as const, message: "Your account needs to be approved before you can take weddings." };
  if (!(await standardsAcceptance(member.id))) return { ok: false as const, message: STANDARDS_REQUIRED_MESSAGE, needsStandards: true };
  if (!sig.agree) return { ok: false as const, message: "Please confirm you agree to the terms." };
  if (normName(sig.name) !== normName(member.full_name)) return { ok: false as const, message: `Type your full name exactly as it appears on your profile (${member.full_name}).`, field: "name" };
  return sql.begin(async (tx) => {
    const db = tx as unknown as typeof sql;
    const [a] = await db`
      select a.*, w.wedding_date::text as date, w.couple, w.id as wid, w.status as wstatus, w.venue_lat, w.venue_lng, m.slug as market_slug
      from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id
      where a.id = ${assignmentId} for update of a`;
    if (!a || a.wstatus === "cancelled") return { ok: false as const, message: "This wedding is no longer available." };
    if (!ROLE_PREFIX(member.discipline).includes(a.role)) return { ok: false as const, message: "This role isn't open to your discipline." };
    const offer = a.status === "offered" && a.team_member_id === member.id;
    if (!offer) {
      if (a.status !== "open") return { ok: false as const, message: a.status === "filled" || a.team_member_id ? "Sorry — someone else just took this wedding." : "This opportunity is no longer available." };
      if (a.expires_at && new Date(a.expires_at) < new Date()) return { ok: false as const, message: "This opportunity has expired." };
    }
    if (a.date < new Date().toISOString().slice(0, 10)) return { ok: false as const, message: "This wedding has already taken place." };
    const [conflict] = await db`select w.couple from wedding_assignments x join weddings w on w.id = x.wedding_id
      where x.team_member_id = ${member.id} and x.status in ('accepted','pending') and w.wedding_date = ${a.date} and w.status <> 'cancelled' and x.id <> ${assignmentId}`;
    if (conflict) return { ok: false as const, message: `You're already booked on this date (${conflict.couple}).` };
    const [cal] = await db`select status from availability where team_member_id = ${member.id} and date = ${a.date}`;
    if (cal && cal.status !== "available") return { ok: false as const, message: "You're marked unavailable on this date. Update your calendar first." };
    const template = await activeTemplate(db);
    if (template.version !== sig.version) return { ok: false as const, message: "Our terms were just updated. Please review the new version before signing.", stale: true };

    const miles = distanceTo(originOf(member), venueOf(a as never))?.miles ?? null;
    const ctx = await contractContext(db, assignmentId, member, miles);
    if (!ctx) return { ok: false as const, message: "This wedding is no longer available." };
    await voidContracts(db, { assignmentId }, "Superseded by a new signature");
    await recordSignature(db, { assignmentId, teamMemberId: member.id, template, ctx, signerName: sig.name.trim().replace(/\s+/g, " "), signerEmail: member.email, ip: sig.ip, userAgent: sig.userAgent });

    const status = offer ? "accepted" : "pending";
    await db`update wedding_assignments set team_member_id = ${member.id}, status = ${status}, accepted_at = now(), travel_miles = ${miles},
        approved_at = ${offer ? new Date() : null}, approved_by = ${offer ? a.offered_by : null}
      where id = ${assignmentId}`;
    await db`insert into availability (team_member_id, date, status, note) values (${member.id}, ${a.date}, 'available', ${"Booked: " + a.couple})
             on conflict (team_member_id, date) do update set status = 'available'`;
    await db`delete from assignment_declines where assignment_id = ${assignmentId} and team_member_id = ${member.id}`;
    if (offer) await joinWeddingThreads(db, a.wid, member.user_id);
    return { ok: true as const, status, couple: a.couple as string, weddingId: a.wid as string, offeredBy: a.offered_by as string | null };
  }).then(async (r) => {
    if (r.ok) {
      await notify(member.user_id, "booking", r.status === "pending" ? "Request sent" : "Wedding confirmed",
        r.status === "pending" ? `Your request for ${r.couple} is awaiting coordinator approval. Your signed agreement is saved with the wedding.` : `You're confirmed for ${r.couple}.`,
        r.status === "pending" ? `/team/open` : `/team/weddings/${r.weddingId}`);
      for (const c of await sql`select id from users where role in ('coordinator','admin') and status = 'active'`)
        await notify(c.id, "booking", r.status === "pending" ? `${member.full_name} requested ${r.couple}` : `${member.full_name} accepted your offer for ${r.couple}`,
          r.status === "pending" ? "Contract signed — review and approve." : "Contract signed — they're confirmed.", `/admin/weddings/${r.weddingId}`);
    }
    return r;
  });
}

/** Add someone to a wedding's team message threads (not the couple's private thread). */
export async function joinWeddingThreads(db: typeof sql, weddingId: string, userId: string) {
  // Team threads only — never a conversation the couple is part of
  const convs = await db`select c.id from conversations c where c.wedding_id = ${weddingId} and c.kind = 'wedding'
    and not exists (select 1 from conversation_participants p join users u on u.id = p.user_id where p.conversation_id = c.id and u.role = 'client')`;
  for (const c of convs) await db`insert into conversation_participants (conversation_id, user_id) values (${c.id}, ${userId}) on conflict do nothing`;
}
export async function leaveWeddingThreads(db: typeof sql, weddingId: string, userId: string) {
  await db`delete from conversation_participants where user_id = ${userId} and conversation_id in (select id from conversations where wedding_id = ${weddingId} and kind = 'wedding')`;
}

/** Turn down an offer a coordinator made: the slot goes back to Open Weddings. */
export async function declineOffer(member: Member, assignmentId: string, reason: string) {
  const [a] = await sql`update wedding_assignments a set status = 'open', team_member_id = null, offered_at = null, offered_by = null
    from weddings w where a.id = ${assignmentId} and w.id = a.wedding_id and a.team_member_id = ${member.id} and a.status = 'offered'
    returning a.wedding_id, a.role, w.couple`;
  if (!a) return false;
  await sql`insert into assignment_declines (assignment_id, team_member_id, reason) values (${assignmentId}, ${member.id}, ${reason}) on conflict do nothing`;
  for (const c of await sql`select id from users where role in ('coordinator','admin') and status = 'active'`)
    await notify(c.id, "booking", `${member.full_name} declined ${a.couple}`, `${reason}. The slot is open on Open Weddings again.`, `/admin/weddings/${a.wedding_id}`);
  return true;
}

export async function declineOpportunity(member: Member, assignmentId: string, reason?: string) {
  await sql`insert into assignment_declines (assignment_id, team_member_id, reason) values (${assignmentId}, ${member.id}, ${reason ?? null}) on conflict do nothing`;
}
export async function undoDecline(member: Member, assignmentId: string) {
  await sql`delete from assignment_declines where assignment_id = ${assignmentId} and team_member_id = ${member.id}`;
}
export async function withdrawRequest(member: Member, assignmentId: string) {
  return sql.begin(async (tx) => {
    const db = tx as unknown as typeof sql;
    const r = await db`update wedding_assignments set team_member_id = null, status = 'open', accepted_at = null, travel_miles = null
      where id = ${assignmentId} and team_member_id = ${member.id} and status = 'pending' returning id`;
    if (r.length) await voidContracts(db, { assignmentId, teamMemberId: member.id }, "Request withdrawn by the team member");
    return r.length > 0;
  });
}

/* ───────────── Cancellation requests (member stays on the wedding until a coordinator acts) ───────────── */
export const LATE_CANCEL_DAYS = 14;

export async function requestCancellation(member: Member, assignmentId: string, reason: string) {
  const [a] = await sql`select a.id, a.role, a.wedding_id, w.couple, w.wedding_date::text as date, (w.wedding_date - current_date)::int as days
    from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.id = ${assignmentId} and a.team_member_id = ${member.id} and a.status = 'accepted' and w.status <> 'cancelled'`;
  if (!a) return { ok: false as const, message: "Only confirmed weddings can be cancelled. For a pending request, withdraw it instead." };
  if (a.days < 0) return { ok: false as const, message: "This wedding has already taken place." };
  const late = a.days < LATE_CANCEL_DAYS;
  try {
    await sql`insert into assignment_cancellations (assignment_id, wedding_id, team_member_id, role, reason, late, days_before)
      values (${assignmentId}, ${a.wedding_id}, ${member.id}, ${a.role}, ${reason}, ${late}, ${a.days})`;
  } catch {
    return { ok: false as const, message: "You already have a cancellation request for this wedding." };
  }
  for (const c of await sql`select id from users where role in ('coordinator','admin') and status = 'active'`)
    await notify(c.id, "booking", `${late ? "Late cancellation" : "Cancellation request"}: ${a.couple}`, `${member.full_name} asked to be released (${a.days} days out). ${reason}`, `/admin/weddings/${a.wedding_id}`);
  return { ok: true as const, late, days: a.days as number };
}

export async function withdrawCancellation(member: Member, assignmentId: string) {
  const r = await sql`update assignment_cancellations set status = 'withdrawn', decided_at = now()
    where assignment_id = ${assignmentId} and team_member_id = ${member.id} and status = 'pending' returning id`;
  return r.length > 0;
}

/* ───────────── Availability ───────────── */
export async function availabilityRange(memberId: string, from: string, to: string) {
  const [days, bookings, rules] = await Promise.all([
    sql`select date::text, status, note, source from availability where team_member_id = ${memberId} and date between ${from} and ${to} order by date`,
    sql`select w.wedding_date::text as date, w.couple, a.role, a.status, w.id as wedding_id, m.city, w.start_time::text
        from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id
        where a.team_member_id = ${memberId} and a.status in ('accepted','pending','completed') and w.status <> 'cancelled' and w.wedding_date between ${from} and ${to}`,
    sql`select id, weekdays, status, start_date::text, end_date::text, note from availability_rules where team_member_id = ${memberId} order by created_at desc`,
  ]);
  return { days, bookings, rules };
}

export async function setAvailability(memberId: string, dates: string[], status: "available" | "unavailable" | "personal" | "clear", note?: string) {
  // Never allow marking a booked date unavailable
  const booked = await sql`select w.wedding_date::text as date, w.couple from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${memberId} and a.status in ('accepted','pending') and w.status <> 'cancelled' and w.wedding_date in ${sql(dates)}`;
  const blocked = new Set(booked.map((b) => b.date as string));
  const allowed = status === "available" ? dates : dates.filter((d) => !blocked.has(d));
  if (allowed.length) {
    if (status === "clear") await sql`delete from availability where team_member_id = ${memberId} and date in ${sql(allowed)}`;
    else
      for (const d of allowed)
        await sql`insert into availability (team_member_id, date, status, note, source) values (${memberId}, ${d}, ${status}, ${note || null}, 'manual')
                  on conflict (team_member_id, date) do update set status = excluded.status, note = coalesce(excluded.note, availability.note), source = 'manual'`;
  }
  return { updated: allowed.length, conflicts: booked.filter((b) => status !== "available").map((b) => `${b.couple} (${b.date})`) };
}

export async function addRecurringRule(memberId: string, weekdays: number[], status: "available" | "unavailable", start: string, end: string, note?: string) {
  await sql`insert into availability_rules (team_member_id, weekdays, status, start_date, end_date, note) values (${memberId}, ${weekdays}, ${status}, ${start}, ${end}, ${note || null})`;
  const dates: string[] = [];
  const d = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  while (d <= e && dates.length < 400) {
    if (weekdays.includes(d.getDay())) dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  if (!dates.length) return { updated: 0, conflicts: [] as string[] };
  // Recurring rules don't overwrite manual entries
  const existing = await sql`select date::text from availability where team_member_id = ${memberId} and source = 'manual' and date in ${sql(dates)}`;
  const skip = new Set(existing.map((r) => r.date as string));
  const todo = dates.filter((x) => !skip.has(x));
  return todo.length ? setAvailabilityRecurring(memberId, todo, status, note) : { updated: 0, conflicts: [] as string[] };
}
async function setAvailabilityRecurring(memberId: string, dates: string[], status: string, note?: string) {
  const r = await setAvailability(memberId, dates, status as "available", note);
  await sql`update availability set source = 'recurring' where team_member_id = ${memberId} and date in ${sql(dates)}`;
  return r;
}
export async function deleteRule(memberId: string, ruleId: string) {
  await sql`delete from availability_rules where id = ${ruleId} and team_member_id = ${memberId}`;
}

/* ───────────── Money ───────────── */
export async function earnings(memberId: string) {
  const [p] = await sql`
    select
      coalesce(sum(amount + mileage + bonus) filter (where status = 'paid'), 0)::int as paid_total,
      coalesce(sum(amount + mileage + bonus) filter (where status = 'paid' and date_trunc('month', paid_at) = date_trunc('month', now())), 0)::int as paid_month,
      coalesce(sum(amount + mileage + bonus) filter (where status in ('pending','processing','on_hold')), 0)::int as pending,
      coalesce(sum(amount + mileage + bonus) filter (where status = 'processing'), 0)::int as processing,
      coalesce(sum(amount + mileage + bonus) filter (where status = 'on_hold'), 0)::int as on_hold
    from payouts where team_member_id = ${memberId}`;
  const [u] = await sql`select coalesce(sum(a.compensation), 0)::int as upcoming, count(*)::int as n
    from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${memberId} and a.status = 'accepted' and w.wedding_date >= current_date and w.status <> 'cancelled'`;
  const monthly = await sql`
    select to_char(date_trunc('month', paid_at), 'Mon') as month, date_trunc('month', paid_at) as m, sum(amount + mileage + bonus)::int as total
    from payouts where team_member_id = ${memberId} and status = 'paid' and paid_at > now() - interval '12 months'
    group by 1, 2 order by 2`;
  return {
    total: p.paid_total + p.pending, paid: p.paid_total, paidMonth: p.paid_month, pending: p.pending, processing: p.processing, onHold: p.on_hold,
    upcoming: u.upcoming, upcomingCount: u.n, monthly: monthly.map((r) => ({ month: r.month as string, total: r.total as number })),
  };
}

export async function payouts(memberId: string) {
  return sql`
    select p.id, p.amount, p.mileage, p.bonus, p.status, p.requested_at, p.scheduled_for::text, p.paid_at, p.method, p.reference, p.hold_reason, p.created_at,
      w.couple, w.wedding_date::text, a.role, a.coverage_hours, w.id as wedding_id, m.city, m.state
    from payouts p left join wedding_assignments a on a.id = p.assignment_id left join weddings w on w.id = a.wedding_id left join markets m on m.id = w.market_id
    where p.team_member_id = ${memberId} order by coalesce(p.paid_at, p.requested_at, p.created_at) desc`;
}

export async function payableAssignments(memberId: string) {
  return sql`select a.id, a.compensation, a.role, w.couple, w.wedding_date::text, a.travel_miles,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status <> 'failed')::int as uploads
    from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${memberId} and (a.status = 'completed' or (a.status = 'accepted' and w.wedding_date < current_date))
      and not exists (select 1 from payouts p where p.assignment_id = a.id) order by w.wedding_date desc`;
}

export async function requestPayout(member: Member, assignmentId: string) {
  const [a] = await sql`select a.*, w.couple, w.wedding_date from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.id = ${assignmentId} and a.team_member_id = ${member.id}`;
  if (!a) return { ok: false, message: "Assignment not found." };
  if (new Date(a.wedding_date) > new Date()) return { ok: false, message: "You can request payment after the wedding." };
  const [exists] = await sql`select 1 from payouts where assignment_id = ${assignmentId}`;
  if (exists) return { ok: false, message: "Payment was already requested for this wedding." };
  const [{ n }] = await sql`select count(*)::int as n from uploads where assignment_id = ${assignmentId} and status <> 'failed'`;
  if (!n) return { ok: false, message: "Upload your files for this wedding before requesting payment." };
  const mileage = mileagePay(a.travel_miles);
  await sql`insert into payouts (team_member_id, assignment_id, amount, mileage, bonus, status, requested_at, method)
            values (${member.id}, ${assignmentId}, ${a.compensation}, ${mileage}, 50, 'pending', now(), ${member.payout_method ?? "Direct deposit"})`;
  await sql`update wedding_assignments set status = 'completed' where id = ${assignmentId}`;
  await notify(member.user_id, "payment", "Payment requested", `We received your payment request for ${a.couple}.`, "/team/payments");
  return { ok: true };
}

/* ───────────── Licenses ───────────── */
export const REQUIRED_DOCS = [
  { type: "drivers_license", label: "Driver's license", required: true },
  { type: "insurance", label: "Liability insurance", required: true },
  { type: "w9", label: "W-9 tax form", required: true },
  { type: "business_license", label: "Business license", required: false },
  { type: "other", label: "Other certification", required: false },
] as const;

export function effectiveLicenseStatus(l: { status: string; expires_on: string | null }) {
  if (l.status !== "verified" || !l.expires_on) return l.status;
  const days = (new Date(l.expires_on + "T12:00:00").getTime() - Date.now()) / 86400000;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "verified";
}

export type LicenseRow = { id: string; doc_type: string; label: string | null; file_name: string; status: string; expires_on: string | null; uploaded_at: Date; reviewed_at: Date | null; rejection_reason: string | null };
export async function licenses(memberId: string) {
  const rows = await sql<LicenseRow[]>`select id, doc_type, label, file_name, status, expires_on::text, uploaded_at, reviewed_at, rejection_reason
    from licenses where team_member_id = ${memberId} order by uploaded_at desc`;
  return rows.map((r) => ({ ...r, effective: effectiveLicenseStatus(r) }));
}

export async function submitLicense(member: Member, input: { docType: string; label?: string; fileName: string; storageKey: string | null; expiresOn: string | null }) {
  const [r] = await sql`insert into licenses (team_member_id, doc_type, label, file_name, storage_key, status, expires_on)
    values (${member.id}, ${input.docType}, ${input.label || null}, ${input.fileName}, ${input.storageKey}, 'pending_review', ${input.expiresOn}) returning id`;
  const staff = await sql`select id from users where role in ('coordinator','admin')`;
  for (const s of staff) await notify(s.id, "license", "License pending review", `${member.full_name} submitted ${input.fileName}.`, "/admin");
  return r.id as string;
}

/* ───────────── Overview / action items ───────────── */
const fmtShort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
export async function actionItems(member: Member) {
  const items: { id: string; title: string; detail: string; href: string; tone: "danger" | "warning" | "info" | "blush"; cta: string; assignmentId?: string }[] = [];
  if (!(await standardsAcceptance(member.id)))
    items.push({ id: "standards", title: "Accept the team standards", detail: "Shooting standard, footage tagging, backups, insurance and liability — required before you can take weddings.", href: "/team/standards", tone: "danger", cta: "Review" });
  const lic = await licenses(member.id);
  for (const d of REQUIRED_DOCS.filter((x) => x.required)) {
    const docs = lic.filter((l) => l.doc_type === d.type);
    const best = docs.find((l) => l.effective === "verified") ?? docs.find((l) => l.effective === "pending_review") ?? docs[0];
    if (!best) items.push({ id: "lic-" + d.type, title: `Upload ${d.label.toLowerCase()}`, detail: "Required before you can be staffed.", href: "/team/licenses", tone: "danger", cta: "Upload" });
    else if (best.effective === "expired") items.push({ id: "lic-" + d.type, title: `${d.label} expired`, detail: "Upload a renewed document to stay eligible.", href: "/team/licenses", tone: "danger", cta: "Renew" });
    else if (best.effective === "rejected") items.push({ id: "lic-" + d.type, title: `${d.label} was rejected`, detail: best.rejection_reason ?? "Please re-upload.", href: "/team/licenses", tone: "danger", cta: "Fix" });
    else if (best.effective === "expiring_soon") items.push({ id: "lic-" + d.type, title: `${d.label} expiring soon`, detail: `Expires ${best.expires_on}.`, href: "/team/licenses", tone: "warning", cta: "Renew" });
  }
  const [{ n }] = await sql`select count(*)::int as n from availability where team_member_id = ${member.id} and date between current_date and current_date + 45`;
  if (n < 4) items.push({ id: "avail", title: "Confirm your availability", detail: "Mark the next six weeks so coordinators can staff you.", href: "/team/availability", tone: "warning", cta: "Update" });
  const offers = await sql`select a.id, a.role, w.couple, w.wedding_date::text from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${member.id} and a.status = 'offered' and w.wedding_date >= current_date order by w.wedding_date`;
  for (const o of offers) items.push({ id: "offer-" + o.id, title: `Offered: ${o.couple}`, detail: `A coordinator picked you for ${fmtShort(o.wedding_date)}. Review and sign to confirm.`, href: `/team/open?id=${o.id}`, tone: "blush", cta: "Review" });
  const unsigned = await sql`select a.id, w.couple, w.id as wid from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${member.id} and a.status = 'accepted' and w.wedding_date >= current_date and w.status <> 'cancelled'
      and not exists (select 1 from assignment_contracts c where c.assignment_id = a.id and c.team_member_id = ${member.id} and c.status = 'active') order by w.wedding_date`;
  for (const u of unsigned) items.push({ id: "sign-" + u.id, title: `Sign your agreement: ${u.couple}`, detail: "We now keep a signed contractor agreement for every wedding.", href: `/team/weddings/${u.wid}`, tone: "warning", cta: "Sign" });
  const prep = await sql`select a.id, w.couple, w.wedding_date::text, w.id as wid from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${member.id} and a.status = 'accepted' and a.prep_confirmed_at is null and w.wedding_date between current_date and current_date + 45 order by w.wedding_date`;
  for (const p of prep) items.push({ id: "prep-" + p.id, title: `Review timeline: ${p.couple}`, detail: "Confirm you've read the timeline, shot list and venue notes.", href: `/team/weddings/${p.wid}`, tone: "info", cta: "Review", assignmentId: p.id });
  const toUpload = await sql`select a.id, w.couple, w.id as wid,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status = 'failed')::int as failed,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status <> 'failed')::int as ok
    from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${member.id} and a.status in ('accepted','completed') and w.wedding_date between current_date - 14 and current_date - 1`;
  for (const u of toUpload) {
    if (u.ok === 0) items.push({ id: "up-" + u.id, title: `Upload files: ${u.couple}`, detail: "The 48-hour upload window has started.", href: `/team/uploads?wedding=${u.wid}`, tone: "danger", cta: "Upload" });
    else if (u.failed > 0) items.push({ id: "upf-" + u.id, title: `${u.failed} failed upload${u.failed > 1 ? "s" : ""}: ${u.couple}`, detail: "Retry failed files to complete delivery.", href: `/team/${member.discipline === "video" ? "uploads/video" : "uploads"}?wedding=${u.wid}`, tone: "warning", cta: "Retry" });
  }
  const payable = await payableAssignments(member.id);
  for (const p of payable.filter((x) => x.uploads > 0)) items.push({ id: "pay-" + p.id, title: `Request payment: ${p.couple}`, detail: "Your uploads are in — request your payout.", href: "/team/payments", tone: "blush", cta: "Request" });
  const completion = profileCompletion(member, lic.length);
  if (completion.percent < 100) items.push({ id: "profile", title: "Complete your profile", detail: `${completion.percent}% complete — ${completion.missing[0]}.`, href: "/team/profile", tone: "info", cta: "Finish" });
  return items;
}

export function profileCompletion(m: Member, licenseCount = 1) {
  const checks: [boolean, string][] = [
    [!!m.avatar_url, "Add a profile photo"],
    [!!m.bio && m.bio.length > 40, "Write a short bio"],
    [!!m.phone, "Add a phone number"],
    [m.specialties.length > 0, "Add your specialties"],
    [!!m.portfolio_url, "Link your portfolio"],
    [!!m.instagram || !!m.website, "Add a social link"],
    [m.languages.length > 0, "Add languages"],
    [!!m.payout_last4, "Add payout details"],
    [licenseCount > 0, "Upload compliance documents"],
    [!!m.home_market_id, "Set your home market"],
  ];
  const done = checks.filter((c) => c[0]).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter((c) => !c[0]).map((c) => c[1]) };
}

export async function updateProfile(member: Member, p: Partial<{ full_name: string; phone: string; bio: string; home_market_id: string; service_radius: number; specialties: string[]; years_experience: number; languages: string[]; portfolio_url: string; instagram: string; website: string; avatar_url: string | null; home_address: string; equipment: string }>) {
  await sql.begin(async (tx) => {
    await tx`update users set full_name = coalesce(${p.full_name ?? null}, full_name), phone = ${p.phone ?? member.phone}, avatar_url = ${p.avatar_url === undefined ? member.avatar_url : p.avatar_url} where id = ${member.user_id}`;
    await tx`update team_members set
      bio = ${p.bio ?? member.bio}, home_market_id = ${p.home_market_id ?? member.home_market_id}, service_radius = ${p.service_radius ?? member.service_radius},
      specialties = ${p.specialties ?? member.specialties}, years_experience = ${p.years_experience ?? member.years_experience}, languages = ${p.languages ?? member.languages},
      portfolio_url = ${p.portfolio_url ?? member.portfolio_url}, instagram = ${p.instagram ?? member.instagram}, website = ${p.website ?? member.website},
      home_address = ${p.home_address === undefined ? member.home_address : p.home_address || null}, equipment = ${p.equipment === undefined ? member.equipment : p.equipment || null}
      where id = ${member.id}`;
  });
}

/** Sign the agreement for a wedding you were confirmed on before contracts were required. */
export async function signExisting(member: Member, assignmentId: string, sig: Signature) {
  if (!sig.agree) return { ok: false as const, message: "Please confirm you agree to the terms." };
  if (normName(sig.name) !== normName(member.full_name)) return { ok: false as const, message: `Type your full name exactly as it appears on your profile (${member.full_name}).` };
  return sql.begin(async (tx) => {
    const db = tx as unknown as typeof sql;
    const [a] = await db`select a.id, a.travel_miles from wedding_assignments a where a.id = ${assignmentId} and a.team_member_id = ${member.id} and a.status in ('accepted','pending') for update`;
    if (!a) return { ok: false as const, message: "This wedding isn't assigned to you." };
    const [has] = await db`select 1 from assignment_contracts where assignment_id = ${assignmentId} and team_member_id = ${member.id} and status = 'active'`;
    if (has) return { ok: false as const, message: "You've already signed the agreement for this wedding." };
    const template = await activeTemplate(db);
    if (template.version !== sig.version) return { ok: false as const, message: "Our terms were just updated. Please review the new version before signing.", stale: true };
    const ctx = await contractContext(db, assignmentId, member, a.travel_miles);
    if (!ctx) return { ok: false as const, message: "Wedding not found." };
    await recordSignature(db, { assignmentId, teamMemberId: member.id, template, ctx, signerName: sig.name.trim().replace(/\s+/g, " "), signerEmail: member.email, ip: sig.ip, userAgent: sig.userAgent });
    return { ok: true as const };
  });
}

/** The agreement text a member is about to sign for a slot (filled in, not yet saved). */
export async function contractPreview(member: Member, assignmentId: string) {
  const [a] = await sql`select a.id, a.role, a.status, a.team_member_id, a.travel_miles, w.venue_lat, w.venue_lng, m.slug as market_slug
    from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id where a.id = ${assignmentId}`;
  if (!a || !ROLE_PREFIX(member.discipline).includes(a.role)) return null;
  const visible = a.status === "open" || a.team_member_id === member.id;
  if (!visible) return null;
  const miles = a.team_member_id === member.id && a.travel_miles != null ? a.travel_miles : distanceTo(originOf(member), venueOf(a as never))?.miles ?? null;
  const template = await activeTemplate();
  const ctx = await contractContext(sql, assignmentId, member, miles);
  if (!ctx) return null;
  return { version: template.version, title: fillTemplate(template.title, ctx), body: fillTemplate(template.body, ctx) };
}
