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

const STAFF = ["coordinator", "admin"];
const TEAM = ["photographer", "videographer"];

/**
 * Who may message whom:
 * - coordinators, admins, photographers and videographers can message each other freely
 * - clients only ever talk to coordinators/admins — never directly to photographers or videographers
 */
export async function startConversation(userId: string, subject: string, body: string, opts: { weddingId?: string | null; includeUserIds?: string[] } = {}) {
  const [me] = await sql`select role from users where id = ${userId}`;
  const isClient = me?.role === "client";
  const asked = [...new Set((opts.includeUserIds ?? []).filter((x) => x !== userId))];
  const allowedRoles = isClient ? STAFF : [...STAFF, ...TEAM];
  const picked = asked.length
    ? await sql`select u.id from users u left join team_members t on t.user_id = u.id
        where u.id in ${sql(asked)} and u.status = 'active' and u.role in ${sql(allowedRoles)} and (t.id is null or t.status = 'active')`
    : [];
  const ids = new Set<string>([userId, ...picked.map((r) => r.id as string)]);
  // Clients always reach a coordinator; staff/team threads need at least one recipient (default: a coordinator)
  if (isClient || ids.size === 1) {
    const [coord] = await sql`select id from users where role = 'coordinator' and status = 'active' order by created_at limit 1`;
    if (coord) ids.add(coord.id);
  }
  if (ids.size === 1) throw new Error("Choose who to send this to.");
  const kind = opts.weddingId ? "wedding" : subject.toLowerCase().includes("payment") || subject.toLowerCase().includes("support") ? "support" : "direct";
  const [c] = await sql`insert into conversations (subject, kind, wedding_id) values (${subject}, ${kind}, ${opts.weddingId ?? null}) returning id`;
  for (const id of ids) await sql`insert into conversation_participants (conversation_id, user_id) values (${c.id}, ${id})`;
  await sendMessage(userId, c.id, body);
  return c.id as string;
}

export type Contact = { id: string; full_name: string; avatar_url: string | null; role: string };
/** People a user may start a thread with. Clients: coordinators/admins only. Everyone else: all active staff and team. */
export async function contactsFor(userId: string): Promise<Contact[]> {
  const [me] = await sql`select role from users where id = ${userId}`;
  const roles = me?.role === "client" ? STAFF : [...STAFF, ...TEAM];
  return sql<Contact[]>`
    select u.id, u.full_name, u.avatar_url, u.role from users u left join team_members t on t.user_id = u.id
    where u.id <> ${userId} and u.status = 'active' and u.role in ${sql(roles)} and (t.id is null or t.status = 'active')
    order by case when u.role in ('coordinator','admin') then 0 else 1 end, u.full_name`;
}

const isStaffRole = (r?: string) => r === "coordinator" || r === "admin";

async function requireStaffInThread(actorId: string, conversationId: string) {
  const [me] = await sql`select u.role, u.full_name, (cp.user_id is not null) as member from users u
    left join conversation_participants cp on cp.conversation_id = ${conversationId} and cp.user_id = u.id where u.id = ${actorId}`;
  if (!me || !isStaffRole(me.role)) throw new Error("Only coordinators and admins can change who's in a conversation.");
  if (!me.member) throw new Error("You're not part of this conversation.");
  return me as { role: string; full_name: string };
}

const names = (rows: { full_name: string }[]) =>
  rows.length <= 2 ? rows.map((r) => r.full_name).join(" and ") : `${rows.slice(0, -1).map((r) => r.full_name).join(", ")} and ${rows.at(-1)!.full_name}`;

/**
 * Coordinators/admins can loop staff, photographers and videographers into an existing thread — including one with a client.
 * That's the only way a photographer/videographer ends up talking with a client. Clients are never added this way.
 */
export async function addParticipants(actorId: string, conversationId: string, userIds: string[]) {
  await requireStaffInThread(actorId, conversationId);
  const ids = [...new Set(userIds.filter((x) => x !== actorId))];
  if (!ids.length) throw new Error("Choose who to add.");
  const people = await sql<{ id: string; full_name: string }[]>`
    select u.id, u.full_name from users u left join team_members t on t.user_id = u.id
    where u.id in ${sql(ids)} and u.status = 'active' and u.role in ${sql([...STAFF, ...TEAM])} and (t.id is null or t.status = 'active')
      and not exists (select 1 from conversation_participants p where p.conversation_id = ${conversationId} and p.user_id = u.id)
    order by u.full_name`;
  if (!people.length) throw new Error("They're already in this conversation.");
  // New people see the full history, so mark it unread for them
  for (const p of people) await sql`insert into conversation_participants (conversation_id, user_id, last_read_at) values (${conversationId}, ${p.id}, 'epoch') on conflict do nothing`;
  await sendMessage(actorId, conversationId, `Added ${names(people)} to this conversation.`);
  return people;
}

/** Coordinators/admins can take staff or team members back out of a thread. Clients and yourself can't be removed. */
export async function removeParticipant(actorId: string, conversationId: string, userId: string) {
  await requireStaffInThread(actorId, conversationId);
  if (userId === actorId) throw new Error("You can't remove yourself.");
  const [u] = await sql`select u.full_name, u.role from conversation_participants p join users u on u.id = p.user_id where p.conversation_id = ${conversationId} and p.user_id = ${userId}`;
  if (!u) throw new Error("They're not in this conversation.");
  if (u.role === "client") throw new Error("The couple can't be removed from their conversation.");
  await sendMessage(actorId, conversationId, `Removed ${u.full_name} from this conversation.`);
  await sql`delete from conversation_participants where conversation_id = ${conversationId} and user_id = ${userId}`;
  return u.full_name as string;
}

export type ClientThread = { id: string; subject: string; last_message_at: Date; messages: number; in_thread: boolean };
/** Conversations the couple is part of for this wedding (or any of their threads, if not tied to a wedding). */
export async function clientThreadsForWedding(weddingId: string, staffId: string) {
  return sql<ClientThread[]>`
    select c.id, c.subject, c.last_message_at, (select count(*) from messages m where m.conversation_id = c.id)::int as messages,
      exists (select 1 from conversation_participants p where p.conversation_id = c.id and p.user_id = ${staffId}) as in_thread
    from weddings w join clients cl on cl.id = w.client_id
    join conversation_participants cp on cp.user_id = cl.user_id
    join conversations c on c.id = cp.conversation_id
    where w.id = ${weddingId} and (c.wedding_id = w.id or c.wedding_id is null)
    order by c.last_message_at desc limit 10`;
}

/** A coordinator/admin starts a new thread with the couple from the wedding page. */
export async function messageClient(staffId: string, weddingId: string, subject: string, body: string) {
  const [me] = await sql`select role from users where id = ${staffId}`;
  if (!isStaffRole(me?.role)) throw new Error("Only coordinators and admins can message clients directly.");
  const [w] = await sql`select cl.user_id, u.status from weddings w join clients cl on cl.id = w.client_id join users u on u.id = cl.user_id where w.id = ${weddingId}`;
  if (!w) throw new Error("This wedding has no client account to message.");
  if (w.status !== "active") throw new Error("The client's account is suspended.");
  const [c] = await sql`insert into conversations (subject, kind, wedding_id) values (${subject}, 'wedding', ${weddingId}) returning id`;
  await sql`insert into conversation_participants (conversation_id, user_id) values (${c.id}, ${staffId}), (${c.id}, ${w.user_id}) on conflict do nothing`;
  await sendMessage(staffId, c.id, body);
  return c.id as string;
}

/** Join a client thread you can see from the wedding page but aren't in yet (e.g. another coordinator started it). */
export async function joinClientThread(staffId: string, conversationId: string) {
  const [me] = await sql`select role from users where id = ${staffId}`;
  if (!isStaffRole(me?.role)) throw new Error("Only coordinators and admins can join client conversations.");
  await sql`insert into conversation_participants (conversation_id, user_id, last_read_at) values (${conversationId}, ${staffId}, 'epoch') on conflict do nothing`;
}
