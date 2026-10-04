"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { notify } from "@/lib/services/notifications";
import { approveRequest, declineRequest } from "@/lib/services/staffing";
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

export async function decideRequestAction(assignmentId: string, approve: boolean, note?: string): Promise<ActionResult> {
  const u = await requirePermission("team:assign");
  const r = approve ? await approveRequest(u.id, assignmentId) : await declineRequest(u.id, assignmentId, note?.trim() || null);
  revalidatePath("/admin", "layout"); revalidatePath("/team", "layout");
  return { ok: r.ok, message: r.message };
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
