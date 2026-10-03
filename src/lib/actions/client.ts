"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { payments, type CardInput } from "@/lib/payments";
import { notify } from "@/lib/services/notifications";
import type { ActionResult } from "./types";

async function ownedWedding(userId: string, weddingId: string) {
  const [w] = await sql`select w.id, w.couple from weddings w join clients c on c.id = w.client_id where w.id = ${weddingId} and c.user_id = ${userId}`;
  return w ?? null;
}

const QKEYS = ["getting_ready", "first_look", "family_formals", "vip", "planner", "must_have", "music", "traditions", "accessibility"] as const;
export async function saveQuestionnaireAction(weddingId: string, answers: Record<string, string>, submit: boolean): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const w = await ownedWedding(u.id, weddingId);
  if (!w) return { ok: false, message: "Wedding not found." };
  const clean = Object.fromEntries(QKEYS.filter((k) => answers[k]?.trim()).map((k) => [k, answers[k].trim().slice(0, 1500)]));
  if (submit) {
    const missing = ["getting_ready", "family_formals", "planner"].filter((k) => !clean[k]);
    if (missing.length) return { ok: false, message: "Please answer the required questions before submitting.", fieldErrors: Object.fromEntries(missing.map((k) => [k, "Required"])) };
  }
  await sql`insert into client_questionnaires (wedding_id, answers, status, submitted_at) values (${weddingId}, ${sql.json(clean)}, ${submit ? "submitted" : "draft"}, ${submit ? new Date() : null})
    on conflict (wedding_id) do update set answers = excluded.answers, status = excluded.status, submitted_at = coalesce(excluded.submitted_at, client_questionnaires.submitted_at)`;
  if (submit) {
    const team = await sql`select distinct t.user_id from wedding_assignments a join team_members t on t.id = a.team_member_id where a.wedding_id = ${weddingId} and a.status = 'accepted'
      union select id from users where role = 'coordinator'`;
    for (const t of team) await notify(t.user_id, "change", "Questionnaire submitted", `${w.couple} submitted their wedding questionnaire.`, null);
  }
  revalidatePath("/client", "layout");
  return { ok: true, message: submit ? "Questionnaire submitted — thank you!" : "Draft saved" };
}

export async function payBalanceAction(paymentId: string | "all", card: CardInput): Promise<ActionResult> {
  const u = await requireUser(["client"]);
  const rows = await sql`select cp.id, cp.amount, b.booking_number from client_payments cp join bookings b on b.id = cp.booking_id join clients c on c.id = b.client_id
    where c.user_id = ${u.id} and cp.status = 'scheduled' ${paymentId === "all" ? sql`` : sql`and cp.id = ${paymentId}`}`;
  if (!rows.length) return { ok: false, message: "There's nothing due right now." };
  const amount = rows.reduce((s, r) => s + r.amount, 0);
  const charge = await payments.charge(amount, card, `Visual Weddings ${rows[0].booking_number}`);
  if (!charge.ok) return { ok: false, message: charge.message, fieldErrors: { card: charge.message } };
  for (const [i, r] of rows.entries())
    await sql`update client_payments set status = 'paid', paid_at = now(), method_brand = ${charge.brand}, method_last4 = ${charge.last4}, provider_ref = ${charge.reference}, receipt_number = ${"R-" + r.booking_number.slice(-4) + "-" + (Date.now() % 10000) + i} where id = ${r.id}`;
  await notify(u.id, "payment", "Payment received", `Thank you! We received $${amount.toLocaleString()}.`, "/client/payments");
  revalidatePath("/client", "layout");
  return { ok: true, message: `Payment of $${amount.toLocaleString()} received` };
}
