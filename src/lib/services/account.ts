import "server-only";
import { sql } from "@/lib/db";

export async function getSettings(userId: string) {
  const [s] = await sql`select * from user_settings where user_id = ${userId}`;
  const sessions = await sql`select id, user_agent, ip, created_at, last_seen from sessions where user_id = ${userId} and revoked_at is null order by last_seen desc limit 10`;
  return { settings: s, sessions };
}
