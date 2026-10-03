"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import * as team from "@/lib/services/team";
import * as up from "@/lib/services/uploads";
import { markRead, markUnread } from "@/lib/services/notifications";
import { sendMessage, startConversation } from "@/lib/services/messages";
import type { ActionResult } from "./types";

async function me() {
  const user = await requireUser(["photographer", "videographer"]);
  const member = await team.getMember(user.id);
  if (!member) throw new Error("Team profile not found.");
  return { user, member };
}

/* Open weddings */
export async function acceptOpportunityAction(assignmentId: string): Promise<ActionResult<{ status: string; weddingId: string }>> {
  const { member } = await me();
  const r = await team.acceptOpportunity(member, assignmentId);
  revalidatePath("/team", "layout");
  if (!r.ok) return { ok: false, message: r.message };
  const rr = r as { status: string; weddingId: string; couple: string };
  return { ok: true, message: rr.status === "pending" ? "Request sent — awaiting coordinator approval" : `You're booked for ${rr.couple}!`, data: { status: rr.status, weddingId: rr.weddingId } };
}
export async function declineOpportunityAction(assignmentId: string, reason?: string): Promise<ActionResult> {
  const { member } = await me();
  await team.declineOpportunity(member, assignmentId, reason);
  revalidatePath("/team/open");
  return { ok: true, message: "Opportunity declined" };
}
export async function undoDeclineAction(assignmentId: string): Promise<ActionResult> {
  const { member } = await me();
  await team.undoDecline(member, assignmentId);
  revalidatePath("/team/open");
  return { ok: true, message: "Restored to your list" };
}
export async function withdrawRequestAction(assignmentId: string): Promise<ActionResult> {
  const { member } = await me();
  const ok = await team.withdrawRequest(member, assignmentId);
  revalidatePath("/team", "layout");
  return ok ? { ok: true, message: "Request withdrawn" } : { ok: false, message: "Only pending requests can be withdrawn." };
}
export async function confirmPrepAction(assignmentId: string): Promise<ActionResult> {
  const { member } = await me();
  const ok = await team.confirmPrep(member.id, assignmentId);
  revalidatePath("/team", "layout");
  return ok ? { ok: true, message: "Thanks — marked as reviewed" } : { ok: false, message: "Couldn't update this assignment." };
}

/* Availability */
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
export async function setAvailabilityAction(dates: string[], status: "available" | "unavailable" | "personal" | "clear", note?: string): Promise<ActionResult<{ conflicts: string[] }>> {
  const { member } = await me();
  const clean = [...new Set(dates)].filter((d) => dateRe.test(d));
  if (!clean.length) return { ok: false, message: "Select at least one date." };
  const today = new Date().toISOString().slice(0, 10);
  if (clean.some((d) => d < today)) return { ok: false, message: "You can't change availability for past dates." };
  const r = await team.setAvailability(member.id, clean, status, note);
  revalidatePath("/team/availability");
  if (r.conflicts.length) return { ok: true, message: `Updated ${r.updated} date(s). Booked dates were left unchanged.`, data: { conflicts: r.conflicts } };
  return { ok: true, message: `Updated ${r.updated} date${r.updated === 1 ? "" : "s"}`, data: { conflicts: [] } };
}
export async function addRecurringAction(input: { weekdays: number[]; status: "available" | "unavailable"; start: string; end: string; note?: string }): Promise<ActionResult> {
  const { member } = await me();
  if (!input.weekdays.length) return { ok: false, message: "Pick at least one day of the week." };
  if (!dateRe.test(input.start) || !dateRe.test(input.end) || input.end < input.start) return { ok: false, message: "Choose a valid date range." };
  const r = await team.addRecurringRule(member.id, input.weekdays, input.status, input.start, input.end, input.note);
  revalidatePath("/team/availability");
  return { ok: true, message: `Recurring rule added — ${r.updated} dates updated` };
}
export async function deleteRuleAction(id: string): Promise<ActionResult> {
  const { member } = await me();
  await team.deleteRule(member.id, id);
  revalidatePath("/team/availability");
  return { ok: true, message: "Rule removed (existing dates kept)" };
}

/* Payments */
export async function requestPayoutAction(assignmentId: string): Promise<ActionResult> {
  const { member } = await me();
  const r = await team.requestPayout(member, assignmentId);
  revalidatePath("/team", "layout");
  return r.ok ? { ok: true, message: "Payment requested" } : { ok: false, message: r.message };
}

/* Licenses */
export async function submitLicenseAction(input: { docType: string; label?: string; fileName: string; storageKey: string | null; expiresOn: string | null }): Promise<ActionResult> {
  const { member } = await me();
  if (!team.REQUIRED_DOCS.some((d) => d.type === input.docType)) return { ok: false, message: "Choose a document type." };
  if (!input.fileName) return { ok: false, message: "Attach a file." };
  if (["drivers_license", "insurance"].includes(input.docType) && !input.expiresOn) return { ok: false, message: "This document needs an expiration date." };
  if (input.expiresOn && input.expiresOn < new Date().toISOString().slice(0, 10)) return { ok: false, message: "That document has already expired." };
  await team.submitLicense(member, input);
  revalidatePath("/team", "layout");
  return { ok: true, message: "Submitted for review" };
}

/* Uploads */
export async function beginUploadAction(input: { weddingId: string | null; assignmentId: string | null; kind: "photo" | "video" | "document"; category: string; filename: string; size: number; mime: string; retryOf?: string | null }) {
  const user = await requireUser();
  if (input.kind === "photo" && input.size > 200 * 1024 * 1024) return { ok: false as const, message: `${input.filename} is larger than 200 MB.` };
  if (input.kind === "video" && input.size > 100 * 1024 ** 3) return { ok: false as const, message: `${input.filename} is larger than 100 GB.` };
  const r = await up.beginUpload(user.id, input);
  return { ok: true as const, ...r };
}
export async function finishUploadAction(id: string, result: { ok: boolean; error?: string; durationSeconds?: number | null }) {
  const user = await requireUser();
  const status = await up.finishUpload(user.id, id, result);
  return { ok: true, status };
}
export async function uploadBatchDoneAction(weddingId: string | null, okCount: number, failCount: number, kind: string) {
  const user = await requireUser();
  await up.batchSummary(user.id, weddingId, okCount, failCount, kind);
  revalidatePath("/team", "layout");
}
export async function deleteUploadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await up.deleteUpload(user.id, id);
  revalidatePath("/team/uploads");
  return { ok: true, message: "Removed" };
}

/* Profile */
const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  bio: z.string().trim().max(600, "Keep it under 600 characters").optional().or(z.literal("")),
  home_market_id: z.string().uuid().optional().or(z.literal("")),
  service_radius: z.coerce.number().int().min(10).max(500),
  years_experience: z.coerce.number().int().min(0).max(60),
  specialties: z.array(z.string().trim().min(1)).max(10),
  languages: z.array(z.string().trim().min(1)).max(10),
  portfolio_url: z.string().trim().url("Enter a full URL (https://…)").optional().or(z.literal("")),
  instagram: z.string().trim().max(60).optional().or(z.literal("")),
  website: z.string().trim().url("Enter a full URL (https://…)").optional().or(z.literal("")),
  avatar_url: z.string().optional(),
});
export async function updateProfileAction(input: z.input<typeof ProfileSchema>): Promise<ActionResult> {
  const { member } = await me();
  const p = ProfileSchema.safeParse(input);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const i of p.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  if (p.data.avatar_url && p.data.avatar_url.length > 400_000) return { ok: false, message: "That photo is too large." };
  await team.updateProfile(member, { ...p.data, home_market_id: p.data.home_market_id || undefined, avatar_url: p.data.avatar_url === "" ? null : p.data.avatar_url || undefined } as never);
  revalidatePath("/team", "layout");
  return { ok: true, message: "Profile saved" };
}

/* Notifications */
export async function markNotificationsAction(ids: string[] | "all"): Promise<ActionResult> {
  const user = await requireUser();
  await markRead(user.id, ids);
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function markUnreadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await markUnread(user.id, id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* Messaging (shared by all roles) */
export async function sendMessageAction(conversationId: string, body: string, attachment?: { name: string; size: number; key: string | null }): Promise<ActionResult> {
  const user = await requireUser();
  const text = body.trim();
  if (!text && !attachment) return { ok: false, message: "Write a message first." };
  if (text.length > 4000) return { ok: false, message: "Messages are limited to 4,000 characters." };
  await sendMessage(user.id, conversationId, text || `Shared a file: ${attachment!.name}`, attachment);
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function startConversationAction(input: { subject: string; body: string; weddingId?: string | null; to?: string[] }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  if (input.subject.trim().length < 3) return { ok: false, message: "Add a subject.", fieldErrors: { subject: "Required" } };
  if (input.body.trim().length < 2) return { ok: false, message: "Write a message.", fieldErrors: { body: "Required" } };
  if (input.weddingId) {
    const [ok] = await sql`select 1 from weddings w left join clients c on c.id = w.client_id
      where w.id = ${input.weddingId} and (c.user_id = ${user.id} or exists (select 1 from wedding_assignments a join team_members t on t.id = a.team_member_id where a.wedding_id = w.id and t.user_id = ${user.id}))`;
    if (!ok && user.role !== "coordinator" && user.role !== "admin") return { ok: false, message: "You can't message about that wedding." };
  }
  const id = await startConversation(user.id, input.subject.trim(), input.body.trim(), { weddingId: input.weddingId, includeUserIds: input.to });
  revalidatePath("/", "layout");
  return { ok: true, message: "Message sent", data: { id } };
}
