"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { Button, Input, Textarea, Field } from "@/components/ui";
import { Modal, useAction } from "@/components/ui/interactive";
import { messageClientAction, joinClientThreadAction } from "@/lib/actions/team";
import { chatTime } from "@/lib/utils";

type Thread = { id: string; subject: string; last_message_at: string; messages: number; in_thread: boolean };

/** Coordinator/admin: start a conversation with the couple, or jump into an existing one. */
export function ClientMessages({ weddingId, couple, firstName, threads, canMessage }: { weddingId: string; couple: string; firstName: string; threads: Thread[]; canMessage: boolean }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [open, setOpen] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const openThread = (t: Thread) => {
    if (t.in_thread) { router.push(`/admin/messages?c=${t.id}`); return; }
    run(() => joinClientThreadAction(t.id), { onSuccess: () => router.push(`/admin/messages?c=${t.id}`) });
  };
  const send = () => run(async () => {
    const r = await messageClientAction({ weddingId, subject, body });
    if (!r.ok) setErrors(r.fieldErrors ?? {});
    return r;
  }, { onSuccess: (d) => { setOpen(false); router.push(`/admin/messages?c=${d!.id}`); } });

  return (
    <div className="space-y-2">
      <Button size="sm" icon={MessageCircle} className="w-full" disabled={!canMessage} onClick={() => { setSubject(`${couple} — `); setBody(`Hi ${firstName}, `); setErrors({}); setOpen(true); }}>Message couple</Button>
      {threads.length > 0 && (
        <ul className="space-y-1">
          {threads.slice(0, 3).map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => openThread(t)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-[12.5px] text-midnight-600 hover:bg-white" title={t.in_thread ? "Open conversation" : "Join and open conversation"}>
                <MessageCircle className="size-3.5 shrink-0 text-midnight-300" />
                <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                <span className="shrink-0 text-[11px] text-muted">{chatTime(t.last_message_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={`Message ${couple}`}
        description="Starts a new conversation between you and the couple. You can loop in their photographer, videographer or content creator from the conversation later."
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button icon={Send} loading={pending} onClick={send}>Send message</Button></>}>
        <div className="space-y-4">
          <Field label="Subject" error={errors.subject}><Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-invalid={!!errors.subject} /></Field>
          <Field label="Message" error={errors.body}><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[140px]" aria-invalid={!!errors.body} /></Field>
        </div>
      </Modal>
    </div>
  );
}
