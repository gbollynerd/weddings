import "server-only";
import { isSkill, skillForRole, skillPerson, skillsLine } from "@/lib/skills";
import { randomInt } from "node:crypto";
import { sql, num } from "@/lib/db";
import { hashPassword, revokeAllSessions } from "@/lib/auth";
import { notify } from "./notifications";
import { voidContracts } from "./contracts";
import { REQUIRED_DOCS, effectiveLicenseStatus } from "./team";

type Db = typeof sql;
export type PeopleTab = "applicants" | "team" | "clients" | "staff";

export async function peopleCounts() {
  const [r] = await sql`select
      (select count(*) from team_members where status = 'applicant')::int as applicants,
      (select count(*) from team_members t join users u on u.id = t.user_id where t.status <> 'applicant')::int as team,
      (select count(*) from users where role = 'client')::int as clients,
      (select count(*) from users where role in ('coordinator','admin'))::int as staff`;
  return r as Record<PeopleTab, number>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listPeople(tab: PeopleTab, q: string): Promise<Record<string, any>[]> {
  const search = q ? sql`and (u.full_name ilike ${"%" + q + "%"} or u.email ilike ${"%" + q + "%"})` : sql``;
  const lastSeen = sql`(select max(s.last_seen) from sessions s where s.user_id = u.id)`;
  if (tab === "applicants" || tab === "team") {
    const rows = await sql`
      select u.id as user_id, u.full_name, u.email, u.phone, u.avatar_url, u.role, u.status as account_status, u.suspended_reason, u.created_at, ${lastSeen} as last_seen,
        t.id as member_id, t.status as member_status, t.skills, t.years_experience, t.portfolio_url, t.instagram, t.website, t.bio, t.equipment, t.home_address, t.rating,
        t.applied_at, t.decided_at, t.decision_note, m.city, m.state, ud.full_name as decided_by_name,
        (select count(*) from wedding_assignments a join weddings w on w.id = a.wedding_id where a.team_member_id = t.id and a.status in ('accepted','pending','offered') and w.wedding_date >= current_date)::int as upcoming,
        (select count(*) from wedding_assignments a where a.team_member_id = t.id and a.status = 'completed')::int as completed,
        (select count(*) from assignment_cancellations x where x.team_member_id = t.id and x.late and x.status in ('reassigned','reopened'))::int as late_cancels,
        (select count(*) from assignment_cancellations x where x.team_member_id = t.id and x.status in ('reassigned','reopened'))::int as cancels,
        (select coalesce(json_agg(json_build_object('doc_type', l.doc_type, 'status', l.status, 'expires_on', l.expires_on, 'file_name', l.file_name)), '[]') from licenses l where l.team_member_id = t.id) as docs
      from team_members t join users u on u.id = t.user_id left join markets m on m.id = t.home_market_id left join users ud on ud.id = t.decided_by
      where ${tab === "applicants" ? sql`t.status = 'applicant'` : sql`t.status <> 'applicant'`} ${search}
      order by ${tab === "applicants" ? sql`t.applied_at asc nulls last` : sql`u.status desc, u.full_name`}`;
    return rows.map((r) => {
      const docs = (r.docs ?? []) as { doc_type: string; status: string; expires_on: string | null }[];
      const required = REQUIRED_DOCS.filter((d) => d.required);
      const docsIn = required.filter((d) => docs.some((l) => l.doc_type === d.type && ["verified", "expiring_soon"].includes(effectiveLicenseStatus(l)))).length;
      const docsPending = required.filter((d) => docs.some((l) => l.doc_type === d.type && l.status === "pending_review")).length;
      return { ...r, rating: num(r.rating), docs_verified: docsIn, docs_pending: docsPending, docs_required: required.length };
    });
  }
  if (tab === "clients") {
    return sql`
      select u.id as user_id, u.full_name, u.email, u.phone, u.avatar_url, u.role, u.status as account_status, u.suspended_reason, u.created_at, ${lastSeen} as last_seen,
        c.partner_one, c.partner_two,
        (select count(*) from weddings w where w.client_id = c.id)::int as weddings,
        (select min(w.wedding_date)::text from weddings w where w.client_id = c.id and w.wedding_date >= current_date and w.status <> 'cancelled') as next_wedding,
        (select w.id from weddings w where w.client_id = c.id order by w.wedding_date desc limit 1) as wedding_id
      from users u left join clients c on c.user_id = u.id where u.role = 'client' ${search} order by u.created_at desc limit 300`;
  }
  return sql`select u.id as user_id, u.full_name, u.email, u.phone, u.avatar_url, u.role, u.status as account_status, u.suspended_reason, u.created_at, ${lastSeen} as last_seen
    from users u where u.role in ('coordinator','admin') ${search} order by u.role, u.full_name`;
}

/* ───────────── Decisions ───────────── */
type Actor = { id: string; role: string };
const isStaffRole = (r: string) => r === "coordinator" || r === "admin";

type Target = { id: string; role: string; full_name: string; status: string; member_id: string | null; member_status: string | null };
async function target(userId: string): Promise<Target | null> {
  const [u] = await sql<Target[]>`select u.id, u.role, u.full_name, u.status, t.id as member_id, t.status as member_status from users u left join team_members t on t.user_id = u.id where u.id = ${userId}`;
  return u ?? null;
}
function guard(actor: Actor, u: Target | null): string | null {
  if (!u) return "Account not found.";
  if (u.id === actor.id) return "You can't change your own account here.";
  if (isStaffRole(u.role) && actor.role !== "admin") return "Only an administrator can manage staff accounts.";
  return null;
}

export async function approveApplicant(actor: Actor, userId: string) {
  const u = await target(userId);
  const err = guard(actor, u); if (err || !u) return { ok: false as const, message: err ?? "Account not found." };
  if (u.member_status !== "applicant" && u.member_status !== "rejected") return { ok: false as const, message: "This person isn't waiting for approval." };
  await sql`update team_members set status = 'active', decided_at = now(), decided_by = ${actor.id}, decision_note = null where id = ${u.member_id}`;
  await notify(u.id, "booking", "You're approved!", "Welcome to the Visual Weddings team. You can now browse and accept open weddings.", "/team/open");
  return { ok: true as const, message: `${u.full_name} approved — they can now take weddings` };
}

export async function rejectApplicant(actor: Actor, userId: string, note: string) {
  const u = await target(userId);
  const err = guard(actor, u); if (err || !u) return { ok: false as const, message: err ?? "Account not found." };
  if (u.member_status !== "applicant") return { ok: false as const, message: "This person isn't waiting for approval." };
  await sql`update team_members set status = 'rejected', decided_at = now(), decided_by = ${actor.id}, decision_note = ${note} where id = ${u.member_id}`;
  await notify(u.id, "booking", "About your application", note, "/team");
  return { ok: true as const, message: `${u.full_name}'s application was declined` };
}

/** Block sign-in, end their sessions, and hand back any slots they hadn't been confirmed on yet. */
export async function suspendUser(actor: Actor, userId: string, reason: string) {
  const u = await target(userId);
  const err = guard(actor, u); if (err || !u) return { ok: false as const, message: err ?? "Account not found." };
  if (u.status === "suspended") return { ok: false as const, message: "Already suspended." };
  const confirmedUpcoming = await sql.begin(async (tx) => {
    const db = tx as unknown as Db;
    await db`update users set status = 'suspended', suspended_reason = ${reason} where id = ${userId}`;
    await db`update sessions set revoked_at = now() where user_id = ${userId} and revoked_at is null`;
    if (!u.member_id) return 0;
    const loose = await db`update wedding_assignments set status = 'open', team_member_id = null, accepted_at = null, offered_at = null, offered_by = null, travel_miles = null
      where team_member_id = ${u.member_id} and status in ('pending','offered') returning id`;
    for (const a of loose) await voidContracts(db, { assignmentId: a.id }, "Account suspended");
    const [{ n }] = await db`select count(*)::int as n from wedding_assignments a join weddings w on w.id = a.wedding_id
      where a.team_member_id = ${u.member_id} and a.status = 'accepted' and w.wedding_date >= current_date and w.status <> 'cancelled'`;
    return n as number;
  });
  return { ok: true as const, message: `${u.full_name} suspended and signed out${confirmedUpcoming ? ` — they're still on ${confirmedUpcoming} upcoming wedding${confirmedUpcoming > 1 ? "s" : ""}; replace them from Weddings` : ""}` };
}

export async function reactivateUser(actor: Actor, userId: string) {
  const u = await target(userId);
  const err = guard(actor, u); if (err || !u) return { ok: false as const, message: err ?? "Account not found." };
  await sql`update users set status = 'active', suspended_reason = null where id = ${userId}`;
  return { ok: true as const, message: `${u.full_name} can sign in again` };
}

/** Freelancer skills (photo / video / content). Approval is per person, so this just changes what they can request. */
export async function setSkills(actor: Actor, userId: string, skills: string[]) {
  const u = await target(userId);
  const err = guard(actor, u); if (err || !u) return { ok: false as const, message: err ?? "Account not found." };
  if (u.role !== "freelancer" || !u.member_id) return { ok: false as const, message: "Only freelancers have skills." };
  const next = [...new Set(skills.filter(isSkill))];
  if (!next.length) return { ok: false as const, message: "Keep at least one skill." };
  const rows = await sql`select distinct a.role from wedding_assignments a join weddings w on w.id = a.wedding_id
    where a.team_member_id = ${u.member_id} and a.status in ('accepted','pending','offered') and w.wedding_date >= current_date and w.status <> 'cancelled'`;
  const busy = [...new Set(rows.map((r) => skillForRole(r.role)))].filter((s) => !next.includes(s));
  if (busy.length) return { ok: false as const, message: `They have upcoming weddings as a ${busy.map(skillPerson).join(" and ").toLowerCase()}. Reassign those first.` };
  await sql`update team_members set skills = ${next} where id = ${u.member_id}`;
  return { ok: true as const, message: `${u.full_name}: ${skillsLine(next)}` };
}

export async function changeRole(actor: Actor, userId: string, role: string) {
  const u = await target(userId);
  const err = guard(actor, u); if (err || !u) return { ok: false as const, message: err ?? "Account not found." };
  if (u.role === role) return { ok: false as const, message: "That's already their role." };
  if (isStaffRole(u.role) && isStaffRole(role)) {
    if (actor.role !== "admin") return { ok: false as const, message: "Only an administrator can change staff roles." };
    await sql`update users set role = ${role} where id = ${userId}`;
  } else return { ok: false as const, message: "Staff roles change between coordinator and administrator. For freelancers, edit their skills instead." };
  await revokeAllSessions(userId); // pick up the new permissions on next sign-in
  return { ok: true as const, message: `${u.full_name} is now ${role === "admin" ? "an administrator" : `a ${role}`}` };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export async function resetPassword(actor: Actor, userId: string) {
  const u = await target(userId);
  const err = guard(actor, u); if (err || !u) return { ok: false as const, message: err ?? "Account not found." };
  const temp = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("").replace(/(.{4})(?!$)/g, "$1-");
  await sql`update users set password_hash = ${await hashPassword(temp)} where id = ${userId}`;
  await revokeAllSessions(userId);
  await notify(userId, "message", "Your password was reset", "A coordinator reset your password. Sign in with the temporary password they gave you, then change it in Settings.", null);
  return { ok: true as const, message: `Password reset for ${u.full_name}`, temp };
}
