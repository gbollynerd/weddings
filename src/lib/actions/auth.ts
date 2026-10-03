"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { createSession, destroySession, verifyPassword, hashPassword } from "@/lib/auth";
import { homeFor, type Role } from "@/lib/permissions";
import type { ActionResult } from "./types";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : null);

export async function loginAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Enter your email and password.", fieldErrors: { ...(!email && { email: "Required" }), ...(!password && { password: "Required" }) } };
  const u = await verifyPassword(email, password);
  if (!u) return { ok: false, message: "That email and password don't match our records." };
  await createSession(u.id);
  redirect(safeNext(form.get("next")) ?? homeFor(u.role as Role));
}

const SignupSchema = z.object({
  partnerOne: z.string().trim().min(2, "Enter your full name"),
  partnerTwo: z.string().trim().min(2, "Enter your partner's name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Use at least 8 characters"),
});

/** Creates a client account. Used by /signup and by the booking flow (account step). */
export async function signupClient(input: z.infer<typeof SignupSchema>): Promise<ActionResult<{ userId: string }>> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  const [exists] = await sql`select 1 from users where lower(email) = lower(${d.email})`;
  if (exists) return { ok: false, message: "An account with this email already exists. Log in instead.", fieldErrors: { email: "Already registered" } };
  const hash = await hashPassword(d.password);
  const userId = await sql.begin(async (tx) => {
    const [u] = await tx`insert into users (email, password_hash, role, full_name, phone) values (${d.email.toLowerCase()}, ${hash}, 'client', ${d.partnerOne}, ${d.phone || null}) returning id`;
    await tx`insert into user_settings (user_id) values (${u.id})`;
    await tx`insert into clients (user_id, partner_one, partner_two) values (${u.id}, ${d.partnerOne}, ${d.partnerTwo})`;
    return u.id as string;
  });
  await createSession(userId);
  return { ok: true, data: { userId } };
}

export async function signupAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const r = await signupClient({
    partnerOne: String(form.get("partnerOne") ?? ""),
    partnerTwo: String(form.get("partnerTwo") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (!r.ok) return { ok: false, message: r.message, fieldErrors: r.fieldErrors };
  redirect(safeNext(form.get("next")) ?? "/client");
}

/** JSON login used inside the booking wizard (no redirect). */
export async function loginInline(email: string, password: string): Promise<ActionResult<{ role: string }>> {
  const u = await verifyPassword(email, password);
  if (!u) return { ok: false, message: "That email and password don't match our records." };
  await createSession(u.id);
  return { ok: true, data: { role: u.role } };
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
