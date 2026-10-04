"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import * as people from "@/lib/services/people";
import type { ActionResult } from "./types";

const done = <T,>(r: { ok: boolean; message: string } & T): ActionResult => { revalidatePath("/admin", "layout"); return { ok: r.ok, message: r.message }; };

export async function approveApplicantAction(userId: string): Promise<ActionResult> {
  const u = await requirePermission("people:manage");
  return done(await people.approveApplicant(u, userId));
}
export async function rejectApplicantAction(userId: string, note: string): Promise<ActionResult> {
  const u = await requirePermission("people:manage");
  if (note.trim().length < 5) return { ok: false, message: "Add a short note for the applicant." };
  return done(await people.rejectApplicant(u, userId, note.trim().slice(0, 1000)));
}
export async function suspendUserAction(userId: string, reason: string): Promise<ActionResult> {
  const u = await requirePermission("people:manage");
  if (reason.trim().length < 3) return { ok: false, message: "Add a reason (kept on their record)." };
  return done(await people.suspendUser(u, userId, reason.trim().slice(0, 500)));
}
export async function reactivateUserAction(userId: string): Promise<ActionResult> {
  const u = await requirePermission("people:manage");
  return done(await people.reactivateUser(u, userId));
}
export async function changeRoleAction(userId: string, role: string): Promise<ActionResult> {
  const u = await requirePermission("people:manage");
  if (!["photographer", "videographer", "coordinator", "admin"].includes(role)) return { ok: false, message: "Choose a role." };
  return done(await people.changeRole(u, userId, role));
}
export async function resetPasswordAction(userId: string): Promise<ActionResult<{ temp: string }>> {
  const u = await requirePermission("people:manage");
  const r = await people.resetPassword(u, userId);
  revalidatePath("/admin/people");
  return r.ok ? { ok: true, message: r.message, data: { temp: r.temp } } : { ok: false, message: r.message };
}
