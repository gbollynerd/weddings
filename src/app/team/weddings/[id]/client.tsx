"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ListChecks, MapPinned, Sparkles, CalendarClock, FileText, ChevronRight, CheckCircle2, ClipboardCheck, Send, Printer } from "lucide-react";
import { Card, CardHeader, CardBody, StatusBadge, Button, Textarea, Alert } from "@/components/ui";
import { Modal, useAction } from "@/components/ui/interactive";
import { Markdown } from "@/components/markdown";
import { confirmPrepAction, sendMessageAction } from "@/lib/actions/team";
import { ago } from "@/lib/utils";

const QLABEL: Record<string, string> = {
  getting_ready: "Getting ready", first_look: "First look", family_formals: "Family formals", vip: "VIPs & family notes",
  planner: "Planner / day-of contact", must_have: "Must-have shots", music: "Music & entertainment",
};

type Doc = { key: string; title: string; icon: React.ComponentType<{ className?: string }>; meta: React.ReactNode; body: React.ReactNode };

export function WeddingDocuments({ questionnaire, documents, specialRequests, timeline }: {
  questionnaire: { status: string; answers: Record<string, string>; submitted_at: string | null } | null;
  documents: { id: string; type: string; title: string; content: string }[];
  specialRequests: string | null;
  timeline: { time: string; title: string; detail: string | null }[];
}) {
  const [open, setOpen] = React.useState<Doc | null>(null);
  const docs: Doc[] = [
    {
      key: "q", title: "Wedding questionnaire", icon: ClipboardList,
      meta: questionnaire ? <StatusBadge status={questionnaire.status} /> : <StatusBadge status="not_started" />,
      body: questionnaire && questionnaire.status !== "not_started" ? (
        <dl className="space-y-4">
          {Object.entries(questionnaire.answers).map(([k, v]) => (
            <div key={k}><dt className="text-[12px] uppercase tracking-wide text-muted">{QLABEL[k] ?? k}</dt><dd className="mt-0.5 text-sm text-ink">{v}</dd></div>
          ))}
          {questionnaire.submitted_at && <p className="text-[12px] text-muted">Submitted {ago(questionnaire.submitted_at)}</p>}
        </dl>
      ) : <Alert tone="warning">The couple hasn&apos;t submitted their questionnaire yet. Your coordinator will share it as soon as it&apos;s in.</Alert>,
    },
    ...documents.filter((d) => d.type === "shot_list").map((d) => ({ key: d.id, title: d.title, icon: ListChecks, meta: <span className="text-[12px] text-muted">{d.content.split("\n").filter(Boolean).length} items</span>, body: <Markdown source={d.content} /> })),
    {
      key: "tl", title: "Timeline", icon: CalendarClock, meta: <span className="text-[12px] text-muted">{timeline.length} moments</span>,
      body: <ul className="divide-y divide-line">{timeline.map((t, i) => <li key={i} className="flex gap-4 py-2.5 text-sm"><span className="w-20 shrink-0 font-semibold text-ink">{t.time}</span><span><span className="text-ink">{t.title}</span>{t.detail && <span className="block text-[13px] text-muted">{t.detail}</span>}</span></li>)}</ul>,
    },
    ...documents.filter((d) => d.type === "venue_info").map((d) => ({ key: d.id, title: d.title, icon: MapPinned, meta: <span className="text-[12px] text-muted">Parking, load-in, rain plan</span>, body: <Markdown source={d.content} /> })),
    { key: "sr", title: "Special requests", icon: Sparkles, meta: <span className="text-[12px] text-muted">{specialRequests ? "1 note" : "None"}</span>, body: <p className="text-sm text-midnight-700">{specialRequests ?? "No special requests for this wedding."}</p> },
  ];
  return (
    <Card>
      <CardHeader title="Documents" subtitle="Everything you need for the day" />
      <CardBody>
        <ul className="grid gap-3 sm:grid-cols-2">
          {docs.map((d) => (
            <li key={d.key}>
              <button onClick={() => setOpen(d)} className="group flex w-full items-center gap-3 rounded-2xl border border-line p-3.5 text-left transition hover:border-midnight-200 hover:bg-canvas">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-midnight-50 text-midnight-600"><d.icon className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{d.title}</span><span className="block">{d.meta}</span></span>
                <ChevronRight className="size-4 text-midnight-300 transition group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      </CardBody>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title} size="lg"
        icon={open ? <span className="grid size-10 place-items-center rounded-xl bg-midnight-50 text-midnight-600"><FileText className="size-5" /></span> : undefined}
        footer={<><Button variant="outline" icon={Printer} onClick={() => window.print()}>Print</Button><Button onClick={() => setOpen(null)}>Done</Button></>}>
        {open?.body}
      </Modal>
    </Card>
  );
}

export function PrepConfirm({ assignmentId, confirmedAt }: { assignmentId: string; confirmedAt: string | null }) {
  const router = useRouter();
  const { run, pending } = useAction();
  if (confirmedAt) return <Alert tone="success" icon={CheckCircle2}>You reviewed the timeline and documents {ago(confirmedAt)}.</Alert>;
  return (
    <Alert tone="info" icon={ClipboardCheck} title="Prep check"
      action={<Button size="sm" loading={pending} onClick={() => run(() => confirmPrepAction(assignmentId), { onSuccess: () => router.refresh() })}>I&apos;ve reviewed everything</Button>}>
      Read the timeline, shot list, venue notes and special requests, then confirm so your coordinator knows you&apos;re ready.
    </Alert>
  );
}

export function QuickMessage({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [body, setBody] = React.useState("");
  return (
    <Card>
      <CardHeader title="Message the wedding team" />
      <CardBody>
        <form onSubmit={(e) => { e.preventDefault(); run(() => sendMessageAction(conversationId, body), { success: "Message sent", onSuccess: () => { setBody(""); router.refresh(); } }); }} className="space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ask about the timeline, parking, shot list…" className="min-h-[80px]" aria-label="Message" />
          <Button type="submit" size="sm" icon={Send} loading={pending} disabled={!body.trim()} className="w-full">Send</Button>
        </form>
      </CardBody>
    </Card>
  );
}
