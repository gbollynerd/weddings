"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { notify } from "@/lib/services/notifications";
import type { ActionResult } from "./types";

export async function reviewLicenseAction(id: string, decision: "verified" | "rejected", reason?: string): Promise<ActionResult> {
  const u = await requirePermission("license:review");
  if (decision === "rejected" && !reason?.trim()) return { ok: false, message: "Add a reason so the team member knows what to fix." };
  const [l] = await sql`update licenses set status = ${decision}, reviewed_by = ${u.id}, reviewed_at = now(), rejection_reason = ${decision === "rejected" ? reason!.trim() : null}
    where id = ${id} returning team_member_id, file_name`;
  if (!l) return { ok: false, message: "Document not found." };
  const [m] = await sql`select user_id from team_members where id = ${l.team_member_id}`;
  await notify(m.user_id, "license", decision === "verified" ? "Document verified" : "Document rejected", decision === "verified" ? `${l.file_name} was verified.` : reason!, "/team/licenses");
  revalidatePath("/admin");
  return { ok: true, message: decision === "verified" ? "Marked verified" : "Rejected — team member notified" };
}

export async function decideRequestAction(assignmentId: string, approve: boolean): Promise<ActionResult> {
  await requirePermission("team:assign");
  const [a] = await sql`select a.team_member_id, w.couple, w.id as wid from wedding_assignments a join weddings w on w.id = a.wedding_id where a.id = ${assignmentId} and a.status = 'pending'`;
  if (!a) return { ok: false, message: "That request is no longer pending." };
  const [m] = await sql`select user_id from team_members where id = ${a.team_member_id}`;
  if (approve) await sql`update wedding_assignments set status = 'accepted', accepted_at = now() where id = ${assignmentId}`;
  else await sql`update wedding_assignments set status = 'open', team_member_id = null, accepted_at = null where id = ${assignmentId}`;
  await notify(m.user_id, "booking", approve ? "Request approved" : "Request not approved", approve ? `You're confirmed for ${a.couple}.` : `${a.couple} was assigned to someone else this time.`, approve ? `/team/weddings/${a.wid}` : "/team/open");
  revalidatePath("/admin");
  return { ok: true, message: approve ? "Approved — team member notified" : "Declined — slot reopened" };
}

export async function markPayoutAction(id: string, status: "processing" | "paid" | "on_hold", note?: string): Promise<ActionResult> {
  await requirePermission("payout:manage");
  const [p] = await sql`update payouts set status = ${status}, paid_at = ${status === "paid" ? new Date() : null}, scheduled_for = coalesce(scheduled_for, current_date + 3),
    reference = ${status === "paid" ? "ACH-" + Math.floor(100000 + Math.random() * 899999) : null}, hold_reason = ${status === "on_hold" ? note ?? "Under review" : null}
    where id = ${id} returning team_member_id, amount + mileage + bonus as total`;
  if (!p) return { ok: false, message: "Payout not found" };
  const [m] = await sql`select user_id from team_members where id = ${p.team_member_id}`;
  await notify(m.user_id, "payment", status === "paid" ? "Payment processed" : status === "processing" ? "Payment processing" : "Payment on hold", `$${p.total} — ${status.replace("_", " ")}`, "/team/payments");
  revalidatePath("/admin");
  return { ok: true, message: `Payout marked ${status.replace("_", " ")}` };
}
