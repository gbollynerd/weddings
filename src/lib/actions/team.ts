"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import * as team from "@/lib/services/team";
import * as up from "@/lib/services/uploads";
import { markRead, markUnread } from "@/lib/services/notifications";
import { sendMessage, startConversation, addParticipants, removeParticipant, messageClient, joinClientThread } from "@/lib/services/messages";
import { geocodeMemberHome } from "@/lib/services/geo";
import { acceptStandards } from "@/lib/services/standards";
import type { ActionResult } from "./types";

async function me() {
  const user = await requireUser(["freelancer"]);
  const member = await team.getMember(user.id);
  if (!member) throw new Error("Team profile not found.");
  return { user, member };
}

/* Open weddings */
async function signatureMeta() {
  const h = await headers();
  return { ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local", userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}
export type SignInput = { name: string; agree: boolean; version: number };

/** The filled-in agreement for a slot, shown before signing. */
export async function contractPreviewAction(assignmentId: string): Promise<ActionResult<{ version: number; title: string; body: string }>> {
  const { member } = await me();
  const c = await team.contractPreview(member, assignmentId);
  return c ? { ok: true, data: c } : { ok: false, message: "This wedding is no longer available." };
}

export async function acceptOpportunityAction(assignmentId: string, sig: SignInput): Promise<ActionResult<{ status: string; weddingId: string; stale?: boolean; needsStandards?: boolean }>> {
  const { member } = await me();
  const r = await team.acceptOpportunity(member, assignmentId, { ...sig, ...(await signatureMeta()) });
  revalidatePath("/team", "layout"); revalidatePath("/admin", "layout");
  if (!r.ok) return { ok: false, message: r.message, fieldErrors: "field" in r && r.field ? { name: r.message } : undefined,
    data: "stale" in r ? { status: "", weddingId: "", stale: true } : "needsStandards" in r ? { status: "", weddingId: "", needsStandards: true } : undefined };
  return { ok: true, message: r.status === "pending" ? "Signed — awaiting coordinator approval" : `You're confirmed for ${r.couple}!`, data: { status: r.status, weddingId: r.weddingId } };
}
export async function signExistingAction(assignmentId: string, sig: SignInput): Promise<ActionResult> {
  const { member } = await me();
  const r = await team.signExisting(member, assignmentId, { ...sig, ...(await signatureMeta()) });
  revalidatePath("/team", "layout"); revalidatePath("/admin", "layout");
  return r.ok ? { ok: true, message: "Agreement signed — a copy is saved with the wedding" } : { ok: false, message: r.message };
}
export async function declineOfferAction(assignmentId: string, reason: string): Promise<ActionResult> {
  const { member } = await me();
  const ok = await team.declineOffer(member, assignmentId, reason.trim().slice(0, 300) || "Declined");
  revalidatePath("/team", "layout"); revalidatePath("/admin", "layout");
  return ok ? { ok: true, message: "Offer declined — we've let the coordinator know" } : { ok: false, message: "This offer is no longer open." };
}
export async function requestCancellationAction(assignmentId: string, reason: string): Promise<ActionResult<{ late: boolean }>> {
  const { member } = await me();
  const why = reason.trim();
  if (why.length < 10) return { ok: false, message: "Tell your coordinator why you need to cancel (a sentence or two).", fieldErrors: { reason: "Add a short reason" } };
  const r = await team.requestCancellation(member, assignmentId, why.slice(0, 1000));
  revalidatePath("/team", "layout"); revalidatePath("/admin", "layout");
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true, message: "Request sent — you're still on this wedding until your coordinator confirms", data: { late: r.late } };
}
export async function withdrawCancellationAction(assignmentId: string): Promise<ActionResult> {
  const { member } = await me();
  const ok = await team.withdrawCancellation(member, assignmentId);
  revalidatePath("/team", "layout"); revalidatePath("/admin", "layout");
  return ok ? { ok: true, message: "Cancellation request withdrawn" } : { ok: false, message: "There's no pending cancellation request." };
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
  revalidatePath("/team", "layout"); revalidatePath("/admin", "layout");
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

/* Team standards */
export async function acceptStandardsAction(input: { name: string; agree: boolean }): Promise<ActionResult> {
  const user = await requireUser(["freelancer"]);
  const member = await team.getMember(user.id);
  if (!member) return { ok: false, message: "Team profile not found." };
  const r = await acceptStandards(member, { ...input, ...(await signatureMeta()) });
  revalidatePath("/team", "layout");
  return r.ok ? { ok: true, message: "Thanks — you've accepted the team standards" } : { ok: false, message: r.message };
}

/* Uploads */
export async function beginUploadAction(input: up.BeginInput) {
  const user = await requireUser();
  if (input.kind === "photo" && input.size > 200 * 1024 * 1024) return { ok: false as const, message: `${input.filename} is larger than 200 MB.` };
  if (input.kind === "video" && input.size > 100 * 1024 ** 3) return { ok: false as const, message: `${input.filename} is larger than 100 GB.` };
  if (input.kind === "content" && input.size > 20 * 1024 ** 3) return { ok: false as const, message: `${input.filename} is larger than 20 GB.` };
  try {
    const r = await up.beginUpload(user.id, input);
    return { ok: true as const, ...r };
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Couldn't start the upload." };
  }
}
export async function finishUploadAction(id: string, result: { ok: boolean; error?: string; durationSeconds?: number | null }) {
  const user = await requireUser();
  const r = await up.finishUpload(user.id, id, result);
  return { ok: r.status !== "failed", status: r.status, error: r.error };
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
  home_address: z.string().trim().max(200).optional().or(z.literal("")),
  equipment: z.string().trim().max(600).optional().or(z.literal("")),
  skills: z.array(z.enum(["photo", "video", "content"])).min(1, "Choose at least one: photographer, videographer or content creator.").max(3),
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
  const kept = await team.skillsInUse(member, p.data.skills);
  if (kept.length) return { ok: false, message: `You have upcoming weddings as a ${kept.join(" and ").toLowerCase()} — keep that skill until they're done or released.`, fieldErrors: { skills: "Can't remove a skill you're booked for" } };
  await team.updateProfile(member, { ...p.data, home_market_id: p.data.home_market_id || undefined, avatar_url: p.data.avatar_url === "" ? null : p.data.avatar_url || undefined } as never);
  let message = "Profile saved";
  if (p.data.home_address !== undefined && (p.data.home_address || null) !== member.home_address) {
    const g = await geocodeMemberHome(member.id, p.data.home_address || null);
    if (p.data.home_address && g === false) message = "Profile saved — we couldn't place that address on the map, so distances use your home market for now";
  }
  revalidatePath("/team", "layout");
  return { ok: true, message };
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
  if (user.role !== "client" && !(input.to ?? []).length) return { ok: false, message: "Choose who to send this to.", fieldErrors: { to: "Pick at least one person" } };
  let id: string;
  try {
    id = await startConversation(user.id, input.subject.trim(), input.body.trim(), { weddingId: input.weddingId, includeUserIds: input.to });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Couldn't send that message." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Message sent", data: { id } };
}

const guard = async <T,>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; message: string }> => {
  try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Something went wrong." }; }
};
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);

/* Coordinators/admins: manage who's in a thread */
export async function addParticipantsAction(conversationId: string, userIds: string[]): Promise<ActionResult> {
  const user = await requireUser(["coordinator", "admin"]);
  if (!uuid(conversationId) || !Array.isArray(userIds) || !userIds.every(uuid)) return { ok: false, message: "Invalid request." };
  const r = await guard(() => addParticipants(user.id, conversationId, userIds));
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, message: r.data.length === 1 ? `Added ${r.data[0].full_name}` : `Added ${r.data.length} people` };
}
export async function removeParticipantAction(conversationId: string, userId: string): Promise<ActionResult> {
  const user = await requireUser(["coordinator", "admin"]);
  if (!uuid(conversationId) || !uuid(userId)) return { ok: false, message: "Invalid request." };
  const r = await guard(() => removeParticipant(user.id, conversationId, userId));
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, message: `Removed ${r.data}` };
}
export async function messageClientAction(input: { weddingId: string; subject: string; body: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser(["coordinator", "admin"]);
  if (!uuid(input.weddingId)) return { ok: false, message: "Invalid request." };
  const subject = input.subject.trim(), body = input.body.trim();
  if (subject.length < 3) return { ok: false, message: "Add a subject.", fieldErrors: { subject: "Required" } };
  if (body.length < 2) return { ok: false, message: "Write a message.", fieldErrors: { body: "Required" } };
  if (body.length > 4000) return { ok: false, message: "Messages are limited to 4,000 characters.", fieldErrors: { body: "Too long" } };
  const r = await guard(() => messageClient(user.id, input.weddingId, subject, body));
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, message: "Message sent", data: { id: r.data } };
}
export async function joinClientThreadAction(conversationId: string): Promise<ActionResult> {
  const user = await requireUser(["coordinator", "admin"]);
  if (!uuid(conversationId)) return { ok: false, message: "Invalid request." };
  const r = await guard(() => joinClientThread(user.id, conversationId));
  if (!r.ok) return r;
  return { ok: true };
}
