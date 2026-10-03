import "server-only";
import { sql } from "@/lib/db";

export async function notify(userId: string, type: string, title: string, body: string | null, link: string | null) {
  await sql`insert into notifications (user_id, type, title, body, link) values (${userId}, ${type}, ${title}, ${body}, ${link})`;
}

export async function listNotifications(userId: string, filter: "all" | "unread" = "all", limit = 50) {
  return sql`select id, type, title, body, link, read_at, created_at from notifications
    where user_id = ${userId} ${filter === "unread" ? sql`and read_at is null` : sql``}
    order by created_at desc limit ${limit}`;
}

export async function unreadCounts(userId: string) {
  const [r] = await sql`select
      (select count(*) from notifications where user_id = ${userId} and read_at is null)::int as notifications,
      (select count(distinct m.conversation_id) from messages m join conversation_participants cp on cp.conversation_id = m.conversation_id
         where cp.user_id = ${userId} and m.sender_id <> ${userId} and m.created_at > cp.last_read_at)::int as messages`;
  return r as { notifications: number; messages: number };
}

export async function markRead(userId: string, ids: string[] | "all") {
  if (ids === "all") await sql`update notifications set read_at = now() where user_id = ${userId} and read_at is null`;
  else if (ids.length) await sql`update notifications set read_at = now() where user_id = ${userId} and id in ${sql(ids)}`;
}
export async function markUnread(userId: string, id: string) {
  await sql`update notifications set read_at = null where user_id = ${userId} and id = ${id}`;
}
