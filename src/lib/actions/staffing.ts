"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import * as staffing from "@/lib/services/staffing";
import type { Candidate } from "@/lib/services/staffing";
import type { ActionResult } from "./types";

const refresh = () => { revalidatePath("/admin", "layout"); revalidatePath("/team", "layout"); };
const done = (r: { ok: boolean; message: string }): ActionResult => { refresh(); return { ok: r.ok, message: r.message }; };
const clean = (s: string | null | undefined, max = 1000) => s?.trim().slice(0, max) || null;

export async function approveRequestAction(assignmentId: string): Promise<ActionResult> {
  const u = await requirePermission("team:assign");
  return done(await staffing.approveRequest(u.id, assignmentId));
}
export async function declineRequestAction(assignmentId: string, note?: string): Promise<ActionResult> {
  const u = await requirePermission("team:assign");
  return done(await staffing.declineRequest(u.id, assignmentId, clean(note)));
}
export async function candidatesAction(assignmentId: string): Promise<ActionResult<Candidate[]>> {
  await requirePermission("team:assign");
  return { ok: true, data: await staffing.candidatesFor(assignmentId) };
}
export async function offerSlotAction(assignmentId: string, memberId: string, note?: string): Promise<ActionResult> {
  const u = await requirePermission("team:assign");
  return done(await staffing.offerSlot(u.id, assignmentId, memberId, clean(note, 300)));
}
export async function withdrawOfferAction(assignmentId: string): Promise<ActionResult> {
  await requirePermission("team:assign");
  return done(await staffing.withdrawOffer(assignmentId));
}
export async function releaseMemberAction(assignmentId: string, replacementId: string | null, note?: string): Promise<ActionResult> {
  const u = await requirePermission("team:assign");
  return done(await staffing.releaseMember(u.id, assignmentId, { replacementId, note: clean(note) }));
}
export async function keepMemberAction(assignmentId: string, note: string): Promise<ActionResult> {
  const u = await requirePermission("team:assign");
  if (!note.trim()) return { ok: false, message: "Tell them why they need to stay on." };
  return done(await staffing.keepMember(u.id, assignmentId, note.trim().slice(0, 1000)));
}
