"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Sparkles, CalendarCheck, MessageCircle, Wallet, ShieldAlert, UploadCloud, RefreshCw, CheckCheck, MailOpen, Mail } from "lucide-react";
import { Card, Button, EmptyState, Badge } from "@/components/ui";
import { Tabs, useAction } from "@/components/ui/interactive";
import { markNotificationsAction, markUnreadAction } from "@/lib/actions/team";
import { cn, ago, fmtDate } from "@/lib/utils";

type N = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
const ICON: Record<string, [typeof Bell, string]> = {
  opportunity: [Sparkles, "bg-blush-50 text-blush-500"], booking: [CalendarCheck, "bg-success-50 text-success-500"], message: [MessageCircle, "bg-info-50 text-info-500"],
  payment: [Wallet, "bg-success-50 text-success-700"], license: [ShieldAlert, "bg-warning-50 text-warning-500"], upload: [UploadCloud, "bg-midnight-50 text-midnight-600"], change: [RefreshCw, "bg-blush-50 text-blush-600"],
};
const TYPES = [["all", "All"], ["opportunity", "Opportunities"], ["booking", "Bookings"], ["message", "Messages"], ["payment", "Payments"], ["license", "Compliance"], ["upload", "Uploads"]];

export function NotificationCenter({ items }: { items: N[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [tab, setTab] = React.useState<"all" | "unread">("all");
  const [type, setType] = React.useState("all");
  const list = items.filter((n) => (tab === "all" || !n.read_at) && (type === "all" || n.type === type || (type === "booking" && n.type === "change")));
  const unread = items.filter((n) => !n.read_at).length;
  const groups = list.reduce<Record<string, N[]>>((g, n) => { const k = fmtDate(n.created_at, "yyyy-MM-dd") === fmtDate(new Date(), "yyyy-MM-dd") ? "Today" : fmtDate(n.created_at, "EEEE, MMM d"); (g[k] ??= []).push(n); return g; }, {});
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} items={[{ value: "all", label: "All", count: items.length }, { value: "unread", label: "Unread", count: unread }]} />
        <Button variant="outline" size="sm" icon={CheckCheck} disabled={!unread} loading={pending} onClick={() => run(() => markNotificationsAction("all"), { success: "All caught up", onSuccess: () => router.refresh() })}>Mark all as read</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([v, l]) => <button key={v} onClick={() => setType(v)} className={cn("rounded-full border px-3 py-1 text-[13px]", type === v ? "border-midnight-900 bg-midnight-900 text-white" : "border-line bg-white text-midnight-600 hover:bg-canvas")}>{l}</button>)}
      </div>
      {list.length === 0 ? <Card><EmptyState icon={Bell} title={tab === "unread" ? "No unread notifications" : "No notifications"} description="We'll let you know when something needs your attention." /></Card> : (
        Object.entries(groups).map(([day, ns]) => (
          <section key={day}>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{day}</p>
            <Card className="divide-y divide-line overflow-hidden">
              {ns.map((n) => {
                const [I, tone] = ICON[n.type] ?? [Bell, "bg-midnight-50 text-midnight-600"];
                return (
                  <div key={n.id} className={cn("group flex items-start gap-4 p-4 transition hover:bg-canvas/60", !n.read_at && "bg-blush-50/30")}>
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", tone)}><I className="size-5" /></span>
                    <Link href={n.link ?? "#"} onClick={() => !n.read_at && markNotificationsAction([n.id])} className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">{n.title}{!n.read_at && <Badge tone="blush">New</Badge>}</p>
                      {n.body && <p className="mt-0.5 text-[13px] text-midnight-600">{n.body}</p>}
                      <p className="mt-1 text-[12px] text-muted">{ago(n.created_at)}</p>
                    </Link>
                    <button onClick={() => run(() => (n.read_at ? markUnreadAction(n.id) : markNotificationsAction([n.id])), { onSuccess: () => router.refresh() })}
                      className="rounded-full p-2 text-midnight-300 opacity-0 transition hover:bg-white hover:text-ink group-hover:opacity-100 focus:opacity-100" aria-label={n.read_at ? "Mark as unread" : "Mark as read"} title={n.read_at ? "Mark as unread" : "Mark as read"}>
                      {n.read_at ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                    </button>
                  </div>
                );
              })}
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
