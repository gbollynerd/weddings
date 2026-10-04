import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { homeFor, type Role, can } from "./permissions";

const COOKIE = "vw_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-0123456789abcdef");

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  session_id: string;
};

export async function createSession(userId: string) {
  const h = await headers();
  const [s] = await sql`insert into sessions (user_id, user_agent, ip) values (${userId}, ${h.get("user-agent")?.slice(0, 250) ?? null}, ${(h.get("x-forwarded-for") ?? "").split(",")[0] || "local"}) returning id`;
  const token = await new SignJWT({ sid: s.id, uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const rows = await sql<SessionUser[]>`
      select u.id, u.email, u.role, u.full_name, u.phone, u.avatar_url, s.id as session_id
      from sessions s join users u on u.id = s.user_id
      where s.id = ${payload.sid as string} and s.revoked_at is null and u.status = 'active'`;
    if (!rows[0]) return null;
    // keep "last active" fresh without writing on every request
    sql`update sessions set last_seen = now() where id = ${rows[0].session_id} and last_seen < now() - interval '5 minutes'`.catch(() => {});
    return rows[0];
  } catch {
    return null;
  }
});

export async function destroySession() {
  const s = await getSession();
  if (s) await sql`update sessions set revoked_at = now() where id = ${s.session_id}`;
  (await cookies()).delete(COOKIE);
}

/** Use at the top of any protected page/layout/action. */
export async function requireUser(roles?: Role[], next?: string): Promise<SessionUser> {
  const u = await getSession();
  if (!u) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (roles && !roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}

export async function requirePermission(permission: string) {
  const u = await requireUser();
  if (!can(u.role, permission)) throw new Error("You don't have permission to do that.");
  return u;
}

export async function verifyPassword(email: string, password: string) {
  const [u] = await sql`select id, password_hash, role, status from users where lower(email) = lower(${email})`;
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.password_hash);
  return ok ? ({ id: u.id, role: u.role, status: u.status } as { id: string; role: Role; status: "active" | "suspended" }) : null;
}

export const SUSPENDED_MESSAGE = "This account has been suspended. Contact your coordinator if you think this is a mistake.";

/** Sign a user out everywhere (suspension, password reset). */
export async function revokeAllSessions(userId: string) {
  await sql`update sessions set revoked_at = now() where user_id = ${userId} and revoked_at is null`;
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
