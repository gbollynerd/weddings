import "server-only";
import { sql } from "@/lib/db";
import { notify } from "./notifications";

export type ConversationSummary = {
  id: string; subject: string; kind: string; wedding_id: string | null; couple: string | null; last_message_at: string;
  last_body: string | null; last_sender: string | null; unread: number; participants: { id: string; name: string; avatar: string | null; role: string }[];
};

export async function listConversations(userId: string, q?: string): Promise<ConversationSummary[]> {
  const rows = await sql`
    select c.id, c.subject, c.kind, c.wedding_id, w.couple, c.last_message_at,
      (select body from messages where conversation_id = c.id order by created_at desc limit 1) as last_body,
      (select u.full_name from messages m join users u on u.id = m.sender_id where m.conversation_id = c.id order by m.created_at desc limit 1) as last_sender,
      (select count(*) from messages m where m.conversation_id = c.id and m.sender_id <> ${userId} and m.created_at > cp.last_read_at)::int as unread,
      (select json_agg(json_build_object('id', u.id, 'name', u.full_name, 'avatar', u.avatar_url, 'role', u.role) order by u.full_name)
         from conversation_participants p2 join users u on u.id = p2.user_id where p2.conversation_id = c.id) as participants
    from conversations c
    join conversation_participants cp on cp.conversation_id = c.id and cp.user_id = ${userId}
    left join weddings w on w.id = c.wedding_id
    where ${q ? sql`(c.subject ilike ${"%" + q + "%"} or exists (select 1 from messages m where m.conversation_id = c.id and m.body ilike ${"%" + q + "%"}))` : sql`true`}
    order by c.last_message_at desc`;
  return rows as unknown as ConversationSummary[];
}

export async function getConversation(userId: string, id: string) {
  const [c] = await sql`select c.id, c.subject, c.kind, c.wedding_id, w.couple, w.wedding_date::text from conversations c
    join conversation_participants cp on cp.conversation_id = c.id and cp.user_id = ${userId}
    left join weddings w on w.id = c.wedding_id where c.id = ${id}`;
  if (!c) return null;
  const [messages, participants] = await Promise.all([
    sql`select m.id, m.body, m.created_at, m.sender_id, m.attachment_name, m.attachment_size, u.full_name, u.avatar_url, u.role
        from messages m join users u on u.id = m.sender_id where m.conversation_id = ${id} order by m.created_at asc`,
    sql`select u.id, u.full_name, u.avatar_url, u.role, cp.last_read_at from conversation_participants cp join users u on u.id = cp.user_id where cp.conversation_id = ${id}`,
  ]);
  await sql`update conversation_participants set last_read_at = now() where conversation_id = ${id} and user_id = ${userId}`;
  return { ...c, messages, participants };
}

export async function sendMessage(userId: string, conversationId: string, body: string, attachment?: { name: string; size: number; key: string | null }) {
  const [member] = await sql`select 1 from conversation_participants where conversation_id = ${conversationId} and user_id = ${userId}`;
  if (!member) throw new Error("You're not part of this conversation.");
  const [m] = await sql`insert into messages (conversation_id, sender_id, body, attachment_name, attachment_size, attachment_key)
    values (${conversationId}, ${userId}, ${body}, ${attachment?.name ?? null}, ${attachment?.size ?? null}, ${attachment?.key ?? null}) returning id, created_at`;
  await sql`update conversations set last_message_at = now() where id = ${conversationId}`;
  await sql`update conversation_participants set last_read_at = now() where conversation_id = ${conversationId} and user_id = ${userId}`;
  const [sender] = await sql`select full_name, role from users where id = ${userId}`;
  const others = await sql`select cp.user_id, u.role, coalesce(s.notify_messages, true) as on from conversation_participants cp join users u on u.id = cp.user_id
    left join user_settings s on s.user_id = cp.user_id where cp.conversation_id = ${conversationId} and cp.user_id <> ${userId}`;
  for (const o of others) {
    if (!o.on) continue;
    const base = o.role === "client" ? "/client/messages" : o.role === "coordinator" || o.role === "admin" ? "/admin/messages" : "/team/messages";
    await notify(o.user_id, "message", `New message from ${sender.full_name}`, body.slice(0, 120), `${base}?c=${conversationId}`);
  }
  return m;
}

/** Start a conversation with the coordinator team (and optional wedding context). */
export async function startConversation(userId: string, subject: string, body: string, opts: { weddingId?: string | null; includeUserIds?: string[] } = {}) {
  const coords = await sql`select id from users where role = 'coordinator' order by created_at limit 1`;
  const ids = new Set<string>([userId, ...coords.map((c) => c.id as string), ...(opts.includeUserIds ?? [])]);
  const [c] = await sql`insert into conversations (subject, kind, wedding_id) values (${subject}, ${opts.weddingId ? "wedding" : subject.toLowerCase().includes("payment") || subject.toLowerCase().includes("support") ? "support" : "direct"}, ${opts.weddingId ?? null}) returning id`;
  for (const id of ids) await sql`insert into conversation_participants (conversation_id, user_id) values (${c.id}, ${id})`;
  await sendMessage(userId, c.id, body);
  return c.id as string;
}

/** People a user may start a thread with (coordinators + teammates on shared weddings). */
export async function contactsFor(userId: string) {
  return sql`
    select distinct u.id, u.full_name, u.avatar_url, u.role from users u where u.role = 'coordinator'
    union
    select distinct u.id, u.full_name, u.avatar_url, u.role
    from wedding_assignments a1 join team_members t1 on t1.id = a1.team_member_id and t1.user_id = ${userId}
    join wedding_assignments a2 on a2.wedding_id = a1.wedding_id and a2.id <> a1.id
    join team_members t2 on t2.id = a2.team_member_id join users u on u.id = t2.user_id
    order by 2`;
}
