"use server";
import { redirect } from "next/navigation";
import { skillsLine } from "@/lib/skills";
import { z } from "zod";
import { EMAIL_RE } from "@/lib/validation";
import { sql } from "@/lib/db";
import { createSession, destroySession, verifyPassword, hashPassword, SUSPENDED_MESSAGE } from "@/lib/auth";
import { homeFor, type Role } from "@/lib/permissions";
import { geocodeAddress } from "@/lib/geocode";
import { notify } from "@/lib/services/notifications";
import type { ActionResult } from "./types";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : null);

export async function loginAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Enter your email and password.", fieldErrors: { ...(!email && { email: "Required" }), ...(!password && { password: "Required" }) } };
  const u = await verifyPassword(email, password);
  if (!u) return { ok: false, message: "That email and password don't match our records." };
  if (u.status !== "active") return { ok: false, message: SUSPENDED_MESSAGE };
  await createSession(u.id);
  redirect(safeNext(form.get("next")) ?? homeFor(u.role as Role));
}

const Email = z.string().trim().toLowerCase().max(254, "Enter a valid email address, like name@example.com")
  .regex(EMAIL_RE, "Enter a valid email address, like name@example.com");
const SignupSchema = z.object({
  partnerOne: z.string().trim().min(2, "Enter your full name"),
  partnerTwo: z.string().trim().min(2, "Enter your partner's name"),
  email: Email,
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Use at least 8 characters"),
  // Optional so the booking wizard (which checks it in the browser) can call signupClient directly
  confirmPassword: z.string().optional(),
}).refine((d) => d.confirmPassword === undefined || d.confirmPassword === d.password, { path: ["confirmPassword"], message: "Passwords don't match" });

/** Creates a client account. Used by /signup and by the booking flow (account step). */
export async function signupClient(input: z.input<typeof SignupSchema>): Promise<ActionResult<{ userId: string }>> {
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
    confirmPassword: String(form.get("confirmPassword") ?? ""),
  });
  if (!r.ok) return { ok: false, message: r.message, fieldErrors: r.fieldErrors };
  redirect(safeNext(form.get("next")) ?? "/client");
}

/** JSON login used inside the booking wizard (no redirect). */
export async function loginInline(email: string, password: string): Promise<ActionResult<{ role: string }>> {
  const u = await verifyPassword(email, password);
  if (!u) return { ok: false, message: "That email and password don't match our records." };
  if (u.status !== "active") return { ok: false, message: SUSPENDED_MESSAGE };
  await createSession(u.id);
  return { ok: true, data: { role: u.role } };
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ───────────── Freelancer applications (photo / video / content) ───────────── */
const ApplySchema = z.object({
  fullName: z.string().trim().min(3, "Enter your full name").max(80),
  email: Email,
  phone: z.string().trim().min(7, "Enter a phone number").max(30),
  password: z.string().min(8, "Use at least 8 characters"),
  confirmPassword: z.string().min(1, "Re-enter your password"),
  skills: z.array(z.enum(["photo", "video", "content"])).min(1, "Choose at least one").max(3),
  homeAddress: z.string().trim().min(6, "Enter your home base address").max(200),
  market: z.string().trim().min(2, "Choose the market you'll mostly work in"),
  years: z.coerce.number().int().min(0, "Enter 0 or more").max(60),
  portfolio: z.string().trim().url("Enter a full link (https://…)"),
  instagram: z.string().trim().max(60).optional().default(""),
  about: z.string().trim().min(40, "Tell us a little more (40+ characters)").max(1200),
  equipment: z.string().trim().max(800).optional().default(""),
  agree: z.literal(true, { message: "Please confirm" }),
}).refine((d) => d.confirmPassword === d.password, { path: ["confirmPassword"], message: "Passwords don't match" });
export type ApplyInput = z.input<typeof ApplySchema>;

/** Public "Join our team" form: creates a limited applicant account until a coordinator approves it. */
export async function applyToTeamAction(input: ApplyInput): Promise<ActionResult> {
  const parsed = ApplySchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  const [exists] = await sql`select 1 from users where lower(email) = lower(${d.email})`;
  if (exists) return { ok: false, message: "An account with this email already exists. Log in instead.", fieldErrors: { email: "Already registered" } };
  const [market] = await sql`select id from markets where slug = ${d.market} and active`;
  if (!market) return { ok: false, message: "Choose a market from the list.", fieldErrors: { market: "Choose a market" } };
  const home = await geocodeAddress(d.homeAddress);
  const at = home && home !== "unavailable" ? home : null;
  const hash = await hashPassword(d.password);
  const userId = await sql.begin(async (tx) => {
    const [u] = await tx`insert into users (email, password_hash, role, full_name, phone) values (${d.email.toLowerCase()}, ${hash}, 'freelancer', ${d.fullName}, ${d.phone}) returning id`;
    await tx`insert into user_settings (user_id) values (${u.id})`;
    await tx`insert into team_members (user_id, skills, discipline, bio, home_market_id, years_experience, portfolio_url, instagram, equipment, home_address, lat, lng, status, applied_at)
      values (${u.id}, ${[...new Set(d.skills)]}, null, ${d.about}, ${market.id}, ${d.years}, ${d.portfolio}, ${d.instagram || null}, ${d.equipment || null}, ${d.homeAddress}, ${at?.lat ?? null}, ${at?.lng ?? null}, 'applicant', now())`;
    return u.id as string;
  });
  const staff = await sql`select id from users where role in ('coordinator','admin') and status = 'active'`;
  for (const s of staff) await notify(s.id, "booking", `New application: ${skillsLine(d.skills).toLowerCase()}`, `${d.fullName} · ${d.years} years · ${d.portfolio}`, "/admin/people?tab=applicants");
  await createSession(userId);
  return { ok: true };
}
