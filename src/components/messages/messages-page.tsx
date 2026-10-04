import { Suspense } from "react";
import { listConversations, getConversation, contactsFor } from "@/lib/services/messages";
import { sql } from "@/lib/db";
import { MessagesView, type Convo, type Thread } from "./messages-view";

const s = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string));

export async function MessagesPage({ userId, sp, weddings }: { userId: string; sp: { c?: string; q?: string }; weddings: { id: string; couple: string; date: string }[] }) {
  const [convos, contacts, [me]] = await Promise.all([listConversations(userId, sp.q), contactsFor(userId), sql`select role from users where id = ${userId}`]);
  const activeId = sp.c && /^[0-9a-f-]{36}$/.test(sp.c) ? sp.c : null;
  const thread = activeId ? await getConversation(userId, activeId) : null;
  // reflect read state immediately in the list
  const list = convos.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c));
  return (
    <Suspense>
      <MessagesView me={userId}
        convos={list.map((c) => ({ ...c, last_message_at: s(c.last_message_at) })) as Convo[]}
        thread={thread ? ({ ...thread, messages: thread.messages.map((m) => ({ ...m, created_at: s(m.created_at) })), participants: thread.participants.map((p) => ({ ...p, last_read_at: s(p.last_read_at) })) } as unknown as Thread) : null}
        weddings={weddings} contacts={contacts.map((c) => ({ id: c.id, full_name: c.full_name, role: c.role, avatar_url: c.avatar_url }))} isClient={me?.role === "client"} />
    </Suspense>
  );
}
