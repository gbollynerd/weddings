import "server-only";
import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { DEFAULT_CONTRACT, LEGACY_CONTRACT_SHA, STANDARDS_ADDENDUM } from "@/content/contract";
import { weddingPlaces, placeLine } from "@/lib/venues";
import { skillForRole } from "@/lib/skills";

type Db = typeof sql;
export { COMPANY } from "@/lib/contract-fill";

export type Template = { id: string; version: number; title: string; body: string; change_note: string | null; created_at: Date; created_by_name: string | null };

const UPGRADE_FLAG = "contract_standards_v2";
let upgradeChecked = false;

/**
 * One-time upgrade that adds the shooting standard, backup, insurance and liability terms. If the live agreement
 * is still the original built-in text it's replaced with the new default; if a coordinator edited it, the new
 * terms are appended as an addendum so their wording is kept. Either way it's a new version, so earlier
 * signatures stay exactly as signed and everyone signs the new terms on their next wedding.
 */
async function upgradeTemplate(db: Db, cur: Template) {
  if (upgradeChecked) return null;
  const claimed = await db`insert into app_flags (key) values (${UPGRADE_FLAG}) on conflict do nothing returning key`;
  upgradeChecked = true;
  if (!claimed.length) return null;
  if (cur.body.includes("## Addendum — shooting standard") || cur.body.includes("## 10. Equipment, damage and liability")) return null;
  const legacy = createHash("sha256").update(cur.body).digest("hex") === LEGACY_CONTRACT_SHA;
  const body = legacy ? DEFAULT_CONTRACT.body : `${cur.body.trimEnd()}\n\n${STANDARDS_ADDENDUM}`;
  const note = legacy ? "Added shooting standard, backups, insurance and liability terms" : "Added addendum: shooting standard, backups, insurance and liability";
  await db`insert into contract_templates (version, title, body, change_note) values (${cur.version + 1}, ${cur.title}, ${body}, ${note}) on conflict (version) do nothing`;
  const [t] = await db<Template[]>`select t.*, u.full_name as created_by_name from contract_templates t left join users u on u.id = t.created_by order by version desc limit 1`;
  return t;
}

/** Current contract version; creates version 1 from the built-in draft the first time. */
export async function activeTemplate(db: Db = sql): Promise<Template> {
  const [t] = await db<Template[]>`select t.*, u.full_name as created_by_name from contract_templates t left join users u on u.id = t.created_by order by version desc limit 1`;
  if (t) return (await upgradeTemplate(db, t)) ?? t;
  await db`insert into contract_templates (version, title, body, change_note) values (1, ${DEFAULT_CONTRACT.title}, ${DEFAULT_CONTRACT.body}, 'Initial version') on conflict (version) do nothing`;
  await db`insert into app_flags (key) values (${UPGRADE_FLAG}) on conflict do nothing`;
  upgradeChecked = true;
  const [t1] = await db<Template[]>`select t.*, null as created_by_name from contract_templates t order by version desc limit 1`;
  return t1;
}

export async function templateHistory() {
  return sql`select t.id, t.version, t.title, t.change_note, t.created_at, u.full_name as created_by_name,
      (select count(*) from assignment_contracts c where c.template_id = t.id)::int as signed
    from contract_templates t left join users u on u.id = t.created_by order by t.version desc`;
}

export async function publishTemplate(userId: string, title: string, body: string, note: string | null) {
  const cur = await activeTemplate();
  if (cur.title === title && cur.body === body) return { ok: false as const, message: "Nothing changed." };
  const [t] = await sql`insert into contract_templates (version, title, body, change_note, created_by) values (${cur.version + 1}, ${title}, ${body}, ${note}, ${userId}) returning version`;
  return { ok: true as const, version: t.version as number };
}

export { fillTemplate, mileageText, type ContractContext } from "@/lib/contract-fill";
import { fillTemplate, type ContractContext } from "@/lib/contract-fill";

/** Everything about a slot + member needed to fill the agreement. */
export async function contractContext(db: Db, assignmentId: string, member: { full_name: string; email: string }, miles: number | null): Promise<ContractContext & { wedding_id: string } | null> {
  const [a] = await db`select a.role, a.call_time::text, a.coverage_hours, a.compensation, w.id as wedding_id, w.couple, w.wedding_date::text,
      w.venue_name, w.venue_address, w.ceremony_location, w.reception_location, w.reception_venue_name, w.reception_venue_address, m.city, m.state
    from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id where a.id = ${assignmentId}`;
  if (!a) return null;
  const p = weddingPlaces(a as never);
  const venue = p.same
    ? `${placeLine({ ...p.ceremony, area: null })}${p.ceremony.address ? `, ${p.ceremony.address}` : ""}`
    : `Ceremony at ${p.ceremony.venue}${p.ceremony.address ? `, ${p.ceremony.address}` : ""}; reception at ${p.reception.venue}${p.reception.address ? `, ${p.reception.address}` : ""}`;
  return {
    wedding_id: a.wedding_id, contractor_name: member.full_name, contractor_email: member.email, discipline: skillForRole(a.role),
    role: a.role, couple: a.couple, wedding_date: a.wedding_date, venue, city: `${a.city}, ${a.state}`, call_time: a.call_time,
    coverage_hours: a.coverage_hours, compensation: a.compensation, miles,
  };
}

export const normName = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Freeze the filled agreement as a signed record. Call inside the accept transaction. */
export async function recordSignature(db: Db, input: {
  assignmentId: string; teamMemberId: string; template: Template; ctx: ContractContext & { wedding_id: string };
  signerName: string; signerEmail: string; ip: string | null; userAgent: string | null;
}) {
  const body = fillTemplate(input.template.body, input.ctx);
  const title = fillTemplate(input.template.title, input.ctx);
  const signedAt = new Date();
  // Hash covers the exact text plus who signed and when, so the PDF can be checked against the record
  const sha = createHash("sha256").update([title, body, input.signerName, input.signerEmail, signedAt.toISOString()].join("\n")).digest("hex");
  const [c] = await db`insert into assignment_contracts (assignment_id, wedding_id, team_member_id, template_id, template_version, title, body, body_sha256, role, compensation, wedding_date,
      signer_name, signer_email, signed_at, ip, user_agent)
    values (${input.assignmentId}, ${input.ctx.wedding_id}, ${input.teamMemberId}, ${input.template.id}, ${input.template.version}, ${title}, ${body}, ${sha}, ${input.ctx.role},
      ${input.ctx.compensation}, ${input.ctx.wedding_date}, ${input.signerName}, ${input.signerEmail}, ${signedAt}, ${input.ip}, ${input.userAgent}) returning id`;
  return c.id as string;
}

/** Void the active agreement(s) on a slot (withdrawn, declined, released, date moved…). Signed copies are kept. */
export async function voidContracts(db: Db, where: { assignmentId?: string; weddingId?: string; teamMemberId?: string }, reason: string) {
  if (where.assignmentId) {
    await db`update assignment_contracts set status = 'void', voided_at = now(), void_reason = ${reason}
      where assignment_id = ${where.assignmentId} and status = 'active' ${where.teamMemberId ? db`and team_member_id = ${where.teamMemberId}` : db``}`;
  } else if (where.weddingId) {
    await db`update assignment_contracts set status = 'void', voided_at = now(), void_reason = ${reason} where wedding_id = ${where.weddingId} and status = 'active'`;
  }
}

export type ContractRow = {
  id: string; assignment_id: string | null; wedding_id: string; team_member_id: string; template_version: number; title: string; role: string; compensation: number;
  wedding_date: string; signer_name: string; signer_email: string; signed_at: Date; status: "active" | "void"; voided_at: Date | null; void_reason: string | null;
  couple: string; member_user_id: string;
};

export async function contractsForWedding(weddingId: string) {
  return sql<ContractRow[]>`select c.id, c.assignment_id, c.wedding_id, c.team_member_id, c.template_version, c.title, c.role, c.compensation, c.wedding_date::text,
      c.signer_name, c.signer_email, c.signed_at, c.status, c.voided_at, c.void_reason, w.couple, t.user_id as member_user_id
    from assignment_contracts c join weddings w on w.id = c.wedding_id join team_members t on t.id = c.team_member_id
    where c.wedding_id = ${weddingId} order by c.signed_at desc`;
}

export async function contractsForMember(memberId: string) {
  return sql<ContractRow[]>`select c.id, c.assignment_id, c.wedding_id, c.team_member_id, c.template_version, c.title, c.role, c.compensation, c.wedding_date::text,
      c.signer_name, c.signer_email, c.signed_at, c.status, c.voided_at, c.void_reason, w.couple, t.user_id as member_user_id
    from assignment_contracts c join weddings w on w.id = c.wedding_id join team_members t on t.id = c.team_member_id
    where c.team_member_id = ${memberId} order by c.signed_at desc`;
}

/** Full record for the PDF, if this user may see it (staff, or the team member who signed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function contractForDownload(id: string, user: { id: string; role: string }): Promise<Record<string, any> | null> {
  const [c] = await sql`select c.*, c.wedding_date::text as wedding_date_s, w.couple, t.user_id as member_user_id, a.status as slot_status,
      a.approved_at, ua.full_name as approved_by_name, m.city, m.state
    from assignment_contracts c join weddings w on w.id = c.wedding_id join markets m on m.id = w.market_id
    join team_members t on t.id = c.team_member_id left join wedding_assignments a on a.id = c.assignment_id left join users ua on ua.id = a.approved_by
    where c.id = ${id}`;
  if (!c) return null;
  const staff = user.role === "coordinator" || user.role === "admin";
  if (!staff && c.member_user_id !== user.id) return null;
  // Company approval only belongs on this signature if the slot was approved while this signature was active
  const approved = c.status === "active" && c.assignment_id && ["accepted", "completed"].includes(c.slot_status) && c.approved_at && new Date(c.approved_at) >= new Date(c.signed_at);
  return { ...c, approved_at: approved ? c.approved_at : null, approved_by_name: approved ? c.approved_by_name : null };
}
