import "server-only";
import { sql } from "@/lib/db";
import { STANDARDS_VERSION } from "@/content/standards";
import { normName } from "./contracts";

type Db = typeof sql;

export async function standardsAcceptance(memberId: string, db: Db = sql) {
  const [r] = await db`select version, signer_name, signed_at from standards_acknowledgments where team_member_id = ${memberId} and version = ${STANDARDS_VERSION}`;
  return r ? { version: r.version as number, signerName: r.signer_name as string, signedAt: r.signed_at as Date } : null;
}

export const STANDARDS_REQUIRED_MESSAGE = "Please read and accept the team standards (shooting, tagging, backups, insurance and liability) before taking weddings.";

export async function acceptStandards(member: { id: string; full_name: string }, sig: { name: string; agree: boolean; ip: string | null; userAgent: string | null }) {
  if (!sig.agree) return { ok: false as const, message: "Tick the box to confirm you'll follow the standards." };
  if (normName(sig.name) !== normName(member.full_name)) return { ok: false as const, message: `Type your full name exactly as it appears on your profile (${member.full_name}).` };
  await sql`insert into standards_acknowledgments (team_member_id, version, signer_name, ip, user_agent)
    values (${member.id}, ${STANDARDS_VERSION}, ${sig.name.trim().replace(/\s+/g, " ")}, ${sig.ip}, ${sig.userAgent})
    on conflict (team_member_id, version) do nothing`;
  return { ok: true as const };
}
