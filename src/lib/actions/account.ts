"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser, hashPassword } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { ActionResult } from "./types";

const Account = z.object({ full_name: z.string().trim().min(2, "Enter your name"), email: z.string().trim().email("Enter a valid email"), phone: z.string().trim().max(30).optional().or(z.literal("")) });
export async function updateAccountAction(input: z.input<typeof Account>): Promise<ActionResult> {
  const u = await requireUser();
  const p = Account.safeParse(input);
  if (!p.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const [taken] = await sql`select 1 from users where lower(email) = lower(${p.data.email}) and id <> ${u.id}`;
  if (taken) return { ok: false, message: "That email is used by another account.", fieldErrors: { email: "Already in use" } };
  await sql`update users set full_name = ${p.data.full_name}, email = ${p.data.email.toLowerCase()}, phone = ${p.data.phone || null} where id = ${u.id}`;
  if (u.role === "client") await sql`update clients set partner_one = ${p.data.full_name} where user_id = ${u.id}`;
  revalidatePath("/", "layout");
  return { ok: true, message: "Account updated" };
}

const Prefs = z.object({
  notify_email: z.boolean(), notify_bookings: z.boolean(), notify_messages: z.boolean(), notify_payments: z.boolean(), notify_sms: z.boolean(),
  timezone: z.string().min(3), currency: z.enum(["USD", "CAD", "EUR", "GBP"]), comm_preference: z.enum(["email", "sms", "in_app"]),
});
export async function updatePreferencesAction(input: Partial<z.infer<typeof Prefs>>): Promise<ActionResult> {
  const u = await requireUser();
  const p = Prefs.partial().safeParse(input);
  if (!p.success) return { ok: false, message: "Invalid preferences" };
  const d = p.data;
  await sql`update user_settings set
    notify_email = coalesce(${d.notify_email ?? null}, notify_email), notify_bookings = coalesce(${d.notify_bookings ?? null}, notify_bookings),
    notify_messages = coalesce(${d.notify_messages ?? null}, notify_messages), notify_payments = coalesce(${d.notify_payments ?? null}, notify_payments),
    notify_sms = coalesce(${d.notify_sms ?? null}, notify_sms), timezone = coalesce(${d.timezone ?? null}, timezone),
    currency = coalesce(${d.currency ?? null}, currency), comm_preference = coalesce(${d.comm_preference ?? null}, comm_preference)
    where user_id = ${u.id}`;
  return { ok: true, message: "Preferences saved" };
}

export async function changePasswordAction(current: string, next: string, confirm: string): Promise<ActionResult> {
  const u = await requireUser();
  const fe: Record<string, string> = {};
  if (!current) fe.current = "Enter your current password";
  if (next.length < 8) fe.next = "Use at least 8 characters";
  else if (!/[0-9]/.test(next) || !/[a-zA-Z]/.test(next)) fe.next = "Include letters and numbers";
  if (next !== confirm) fe.confirm = "Passwords don't match";
  if (Object.keys(fe).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fe };
  const [row] = await sql`select password_hash from users where id = ${u.id}`;
  if (!(await bcrypt.compare(current, row.password_hash))) return { ok: false, message: "Your current password is incorrect.", fieldErrors: { current: "Incorrect password" } };
  await sql`update users set password_hash = ${await hashPassword(next)} where id = ${u.id}`;
  await sql`update sessions set revoked_at = now() where user_id = ${u.id} and id <> ${u.session_id} and revoked_at is null`;
  revalidatePath("/", "layout");
  return { ok: true, message: "Password updated — other sessions were signed out" };
}

export async function setTwoFactorAction(on: boolean): Promise<ActionResult> {
  const u = await requireUser();
  await sql`update user_settings set two_factor = ${on} where user_id = ${u.id}`;
  return { ok: true, message: on ? "Two-factor authentication enabled" : "Two-factor authentication turned off" };
}

export async function revokeSessionAction(id: string | "others"): Promise<ActionResult> {
  const u = await requireUser();
  if (id === "others") await sql`update sessions set revoked_at = now() where user_id = ${u.id} and id <> ${u.session_id} and revoked_at is null`;
  else {
    if (id === u.session_id) return { ok: false, message: "Use Log out to end this session." };
    await sql`update sessions set revoked_at = now() where id = ${id} and user_id = ${u.id}`;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: id === "others" ? "Signed out of all other devices" : "Session signed out" };
}

/**
 * Payout details. Only the method and last four digits are stored here; in production the full account
 * details are collected by the payout provider (e.g. Stripe Connect) and never touch our database.
 */
export async function updatePayoutAction(input: { method: string; holder: string; routing: string; account: string }): Promise<ActionResult> {
  const u = await requireUser(["freelancer"]);
  const fe: Record<string, string> = {};
  if (!["Direct deposit", "PayPal", "Check"].includes(input.method)) fe.method = "Choose a method";
  if (input.method === "Direct deposit") {
    if (input.holder.trim().length < 2) fe.holder = "Enter the account holder's name";
    if (!/^\d{9}$/.test(input.routing)) fe.routing = "Routing numbers are 9 digits";
    if (!/^\d{4,17}$/.test(input.account)) fe.account = "Enter a valid account number";
  }
  if (input.method === "PayPal" && !/^\S+@\S+\.\S+$/.test(input.account)) fe.account = "Enter your PayPal email";
  if (Object.keys(fe).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fe };
  const last4 = input.method === "Direct deposit" ? input.account.slice(-4) : input.method === "PayPal" ? input.account.split("@")[0].slice(-4) : null;
  await sql`update team_members set payout_method = ${input.method}, payout_last4 = ${last4} where user_id = ${u.id}`;
  revalidatePath("/team", "layout");
  return { ok: true, message: "Payout details updated" };
}
