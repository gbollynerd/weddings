"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, PenSquare, Paperclip, Send, ArrowLeft, MessageCircle, FileText, Users, Heart, LifeBuoy, X, Loader2, CheckCheck } from "lucide-react";
import { Avatar, AvatarStack, Button, Input, Textarea, Field, Select, EmptyState, Badge } from "@/components/ui";
import { Modal, useAction, useToast } from "@/components/ui/interactive";
import { sendMessageAction, startConversationAction } from "@/lib/actions/team";
import { uploadFile } from "@/lib/client-upload";
import { cn, chatTime, fmtDate, bytes } from "@/lib/utils";

export type Convo = { id: string; subject: string; kind: string; couple: string | null; last_message_at: string; last_body: string | null; last_sender: string | null; unread: number; participants: { id: string; name: string; avatar: string | null; role: string }[] };
export type Thread = { id: string; subject: string; kind: string; couple: string | null; wedding_date: string | null; messages: { id: string; body: string; created_at: string; sender_id: string; attachment_name: string | null; attachment_size: number | null; full_name: string; avatar_url: string | null; role: string }[]; participants: { id: string; full_name: string; avatar_url: string | null; role: string; last_read_at: string }[] };

const roleLabel: Record<string, string> = { coordinator: "Coordinator", photographer: "Photographer", videographer: "Videographer", client: "Client", admin: "Admin" };
const kindIcon = { wedding: Heart, support: LifeBuoy, direct: MessageCircle } as Record<string, typeof Heart>;

export function MessagesView({ me, convos, thread, weddings, contacts }: {
  me: string; convos: Convo[]; thread: Thread | null; weddings: { id: string; couple: string; date: string }[]; contacts: { id: string; full_name: string; role: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");
  const [compose, setCompose] = React.useState(sp.get("new") === "1");
  const activeId = thread?.id ?? null;

  React.useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 15000);
    return () => clearInterval(t);
  }, [router]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(sp.toString());
      if (q) p.set("q", q); else p.delete("q");
      if ((sp.get("q") ?? "") !== q) router.replace(`${pathname}?${p.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card flex h-[calc(100vh-170px)] min-h-[560px] overflow-hidden">
      {/* Conversation list */}
      <aside className={cn("flex w-full flex-col border-r border-line md:w-[340px] md:shrink-0", activeId && "hidden md:flex")}>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Conversations</h2>
            <Button size="sm" icon={PenSquare} onClick={() => setCompose(true)}>New</Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" className="h-10 rounded-full bg-canvas pl-9" aria-label="Search messages" />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto scrollbar-thin">
          {convos.length === 0 && <EmptyState icon={MessageCircle} title={q ? "No matches" : "No conversations yet"} description={q ? "Try another search." : "Start one with your coordinator."} />}
          {convos.map((c) => {
            const others = c.participants.filter((p) => p.id !== me);
            const KI = kindIcon[c.kind] ?? MessageCircle;
            return (
              <li key={c.id}>
                <Link href={`${pathname}?c=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} scroll={false}
                  className={cn("flex gap-3 border-b border-line/60 px-4 py-3.5 transition", c.id === activeId ? "bg-midnight-50/80" : "hover:bg-canvas")}>
                  <div className="relative">
                    <Avatar name={others[0]?.name ?? "VW"} src={others[0]?.avatar} size={42} />
                    <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-white text-midnight-500 ring-1 ring-line"><KI className="size-3" /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-[13.5px]", c.unread ? "font-semibold text-ink" : "font-medium text-midnight-700")}>{c.subject}</p>
                      <span className={cn("shrink-0 text-[11px]", c.unread ? "font-semibold text-blush-600" : "text-muted")}>{chatTime(c.last_message_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={cn("flex-1 truncate text-[12.5px]", c.unread ? "text-midnight-700" : "text-muted")}>{c.last_sender === undefined ? "" : `${c.last_sender?.split(" ")[0]}: `}{c.last_body}</p>
                      {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-blush-400 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Thread */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !activeId && "hidden md:flex")}>
        {thread ? <ThreadPane me={me} thread={thread} onBack={() => router.push(pathname)} /> : (
          <div className="grid flex-1 place-items-center">
            <EmptyState icon={MessageCircle} title="Select a conversation" description="Messages with coordinators and your wedding teams live here." action={<Button icon={PenSquare} onClick={() => setCompose(true)}>New message</Button>} />
          </div>
        )}
      </section>

      <ComposeModal open={compose} onClose={() => setCompose(false)} weddings={weddings} contacts={contacts}
        onSent={(id) => { setCompose(false); router.push(`${pathname}?c=${id}`); router.refresh(); }} />
    </div>
  );
}

function ThreadPane({ me, thread, onBack }: { me: string; thread: Thread; onBack: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [attachment, setAttachment] = React.useState<{ file: File; pct: number; key?: string | null; done: boolean; error?: string } | null>(null);
  const [optimistic, setOptimistic] = React.useState<Thread["messages"]>([]);
  const endRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const messages = [...thread.messages, ...optimistic.filter((o) => !thread.messages.some((m) => m.body === o.body && m.sender_id === o.sender_id && Math.abs(new Date(m.created_at).getTime() - new Date(o.created_at).getTime()) < 60000))];

  React.useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, thread.id]);
  React.useEffect(() => { setOptimistic([]); setBody(""); setAttachment(null); }, [thread.id]);

  const others = thread.participants.filter((p) => p.id !== me);
  const lastMine = [...messages].reverse().find((m) => m.sender_id === me);
  const seenBy = lastMine ? others.filter((p) => new Date(p.last_read_at) >= new Date(lastMine.created_at)) : [];

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast({ tone: "error", title: "Attachments are limited to 25 MB", body: "Use Uploads for wedding files." }); return; }
    setAttachment({ file: f, pct: 0, done: false });
    const h = uploadFile(f, { weddingId: null, assignmentId: null, kind: "document", category: "attachment" }, (pct) => setAttachment((a) => (a ? { ...a, pct } : a)));
    h.promise.then((r) => setAttachment((a) => (a ? { ...a, done: r.ok, key: r.key ?? null, error: r.ok ? undefined : r.error, pct: r.ok ? 100 : a.pct } : a)));
  };

  const send = async () => {
    const text = body.trim();
    if (!text && !attachment?.done) return;
    if (attachment && !attachment.done) { toast({ tone: "warning", title: "Attachment still uploading" }); return; }
    setSending(true);
    const temp = { id: "tmp" + Date.now(), body: text || `Shared a file: ${attachment!.file.name}`, created_at: new Date().toISOString(), sender_id: me, attachment_name: attachment?.file.name ?? null, attachment_size: attachment?.file.size ?? null, full_name: "You", avatar_url: null, role: "" };
    setOptimistic((o) => [...o, temp]);
    setBody("");
    const att = attachment?.done ? { name: attachment.file.name, size: attachment.file.size, key: attachment.key ?? null } : undefined;
    setAttachment(null);
    const r = await sendMessageAction(thread.id, text, att);
    setSending(false);
    if (!r.ok) { toast({ tone: "error", title: r.message ?? "Message not sent" }); setOptimistic((o) => o.filter((x) => x.id !== temp.id)); setBody(text); return; }
    router.refresh();
  };

  let lastDay = "";
  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <button onClick={onBack} className="grid size-9 place-items-center rounded-full hover:bg-canvas md:hidden" aria-label="Back to conversations"><ArrowLeft className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{thread.subject}</p>
          <p className="truncate text-[12px] text-muted">{others.map((p) => `${p.full_name} (${roleLabel[p.role] ?? p.role})`).join(", ")}</p>
        </div>
        {thread.couple && <Badge tone="blush" className="hidden sm:inline-flex"><Heart className="size-3" />{thread.couple}{thread.wedding_date ? ` · ${fmtDate(thread.wedding_date, "MMM d")}` : ""}</Badge>}
        <AvatarStack people={others.map((p) => ({ name: p.full_name, src: p.avatar_url }))} size={30} />
      </header>
      <div className="flex-1 space-y-1 overflow-y-auto bg-canvas/40 px-4 py-5 scrollbar-thin sm:px-6" aria-live="polite">
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const day = fmtDate(m.created_at, "EEEE, MMMM d");
          const showDay = day !== lastDay;
          lastDay = day;
          const prevSame = i > 0 && messages[i - 1].sender_id === m.sender_id && !showDay;
          return (
            <React.Fragment key={m.id}>
              {showDay && <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-muted"><span className="h-px flex-1 bg-line" />{day}<span className="h-px flex-1 bg-line" /></div>}
              <div className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "", prevSame ? "mt-1" : "mt-3")}>
                <div className="w-8 shrink-0">{!mine && !prevSame && <Avatar name={m.full_name} src={m.avatar_url} size={32} />}</div>
                <div className={cn("max-w-[78%] sm:max-w-[65%]", mine && "items-end text-right")}>
                  {!prevSame && !mine && <p className="mb-1 text-[12px] text-muted"><span className="font-medium text-midnight-700">{m.full_name}</span> · {roleLabel[m.role] ?? ""}</p>}
                  <div className={cn("inline-block rounded-2xl px-4 py-2.5 text-left text-[14px] leading-relaxed", mine ? "rounded-tr-md bg-midnight-900 text-white" : "rounded-tl-md bg-white text-midnight-800 shadow-sm ring-1 ring-line", m.id.startsWith("tmp") && "opacity-70")}>
                    {m.attachment_name && (
                      <span className={cn("mb-1.5 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px]", mine ? "bg-white/10" : "bg-canvas")}>
                        <FileText className="size-4 shrink-0" /><span className="truncate">{m.attachment_name}</span>{m.attachment_size ? <span className="shrink-0 opacity-60">{bytes(Number(m.attachment_size))}</span> : null}
                      </span>
                    )}
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{m.id.startsWith("tmp") ? "Sending…" : chatTime(m.created_at) === fmtDate(m.created_at, "h:mm a") ? fmtDate(m.created_at, "h:mm a") : fmtDate(m.created_at, "MMM d, h:mm a")}</p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {lastMine && seenBy.length > 0 && <p className="flex items-center justify-end gap-1 text-[11px] text-muted"><CheckCheck className="size-3.5 text-success-500" />Seen by {seenBy.map((p) => p.full_name.split(" ")[0]).join(", ")}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-line bg-white p-3 sm:p-4">
        {attachment && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-canvas px-3 py-2 text-[13px]">
            {attachment.done ? <FileText className="size-4 text-success-500" /> : attachment.error ? <X className="size-4 text-danger-500" /> : <Loader2 className="size-4 animate-spin text-midnight-400" />}
            <span className="flex-1 truncate">{attachment.file.name} · {bytes(attachment.file.size)}{attachment.error ? ` — ${attachment.error}` : !attachment.done ? ` · ${Math.round(attachment.pct)}%` : ""}</span>
            <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment" className="text-muted hover:text-ink"><X className="size-4" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} aria-label="Attach a file"><Paperclip className="size-5" /></Button>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" rows={1} aria-label="Message"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl py-2.5"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <Button type="submit" size="icon" loading={sending} disabled={!body.trim() && !attachment?.done} aria-label="Send"><Send className="size-4" /></Button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-muted sm:block">Enter to send · Shift + Enter for a new line · For wedding-day emergencies call the on-call line.</p>
      </form>
    </>
  );
}

function ComposeModal({ open, onClose, weddings, contacts, onSent }: { open: boolean; onClose: () => void; weddings: { id: string; couple: string; date: string }[]; contacts: { id: string; full_name: string; role: string }[]; onSent: (id: string) => void }) {
  const { run, pending } = useAction();
  const [topic, setTopic] = React.useState("general");
  const [subject, setSubject] = React.useState("");
  const [weddingId, setWeddingId] = React.useState("");
  const [to, setTo] = React.useState<string[]>([]);
  const [body, setBody] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (topic === "payments") setSubject((s) => s || "Payments question");
    if (topic === "support") setSubject((s) => s || "Support request");
  }, [topic]);
  const teammates = contacts.filter((c) => c.role !== "coordinator");
  const submit = () => {
    const w = weddings.find((x) => x.id === weddingId);
    const subj = subject || (w ? `${w.couple} — question` : "");
    run(async () => {
      const r = await startConversationAction({ subject: subj, body, weddingId: weddingId || null, to });
      if (!r.ok) setErrors(r.fieldErrors ?? {});
      return r;
    }, { onSuccess: (d) => { setSubject(""); setBody(""); setWeddingId(""); setTo([]); setErrors({}); onSent(d!.id); } });
  };
  return (
    <Modal open={open} onClose={onClose} title="New message" description="Your coordinator is always included."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button icon={Send} loading={pending} onClick={submit}>Send message</Button></>}>
      <div className="space-y-4">
        <Field label="Topic">
          <div className="grid grid-cols-3 gap-2">
            {[["general", "General", MessageCircle], ["wedding", "A wedding", Heart], ["payments", "Payments", Users], ["support", "Support", LifeBuoy]].slice(0, weddings.length ? 4 : 3).map(([v, l, I]) => {
              const Icon = I as typeof Heart;
              return <button key={v as string} type="button" onClick={() => setTopic(v as string)} className={cn("flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[13px] font-medium", topic === v ? "border-midnight-900 bg-midnight-900 text-white" : "border-line text-midnight-600 hover:bg-canvas")}><Icon className="size-4" />{l as string}</button>;
            })}
          </div>
        </Field>
        {(topic === "wedding" || weddings.length > 0) && topic === "wedding" && (
          <Field label="Wedding"><Select value={weddingId} onChange={(e) => setWeddingId(e.target.value)}><option value="">Choose a wedding…</option>{weddings.map((w) => <option key={w.id} value={w.id}>{w.couple} · {fmtDate(w.date, "MMM d, yyyy")}</option>)}</Select></Field>
        )}
        {teammates.length > 0 && (
          <Field label="Also include (optional)">
            <div className="flex flex-wrap gap-2">
              {teammates.map((c) => <button key={c.id} type="button" onClick={() => setTo((t) => (t.includes(c.id) ? t.filter((x) => x !== c.id) : [...t, c.id]))} className={cn("rounded-full border px-3 py-1 text-[12px]", to.includes(c.id) ? "border-blush-400 bg-blush-50 text-blush-700" : "border-line text-midnight-600")}>{c.full_name}</button>)}
            </div>
          </Field>
        )}
        <Field label="Subject" error={errors.subject}><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" aria-invalid={!!errors.subject} /></Field>
        <Field label="Message" error={errors.body}><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[120px]" aria-invalid={!!errors.body} /></Field>
      </div>
    </Modal>
  );
}
