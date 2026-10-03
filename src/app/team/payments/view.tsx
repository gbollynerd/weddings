"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, CheckCircle2, Hourglass, CalendarClock, Search, Receipt, Send, AlertTriangle, CreditCard, Download, ChevronLeft, ChevronRight, MessageCircle, Upload, Landmark } from "lucide-react";
import { Card, CardHeader, CardBody, StatCard, StatusBadge, Button, ButtonLink, Input, EmptyState, Alert, Badge } from "@/components/ui";
import { Modal, Tabs, useAction } from "@/components/ui/interactive";
import { EarningsChart } from "@/components/team/earnings-chart";
import { requestPayoutAction } from "@/lib/actions/team";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { cn, fmtDate } from "@/lib/utils";

type Row = { id: string; couple: string; wedding_date: string | null; role: string | null; city: string | null; amount: number; mileage: number; bonus: number; status: string; requested_at: string | null; scheduled_for: string | null; paid_at: string | null; method: string | null; reference: string | null; hold_reason: string | null; created_at: string; coverage_hours: number | null };
type Summary = { total: number; paid: number; paidMonth: number; pending: number; processing: number; onHold: number; upcoming: number; upcomingCount: number; monthly: { month: string; total: number }[] };
const PAGE = 8;

export function PaymentsView({ summary, rows, payable, upcoming, payoutMethod }: {
  summary: Summary; rows: Row[]; payoutMethod: string;
  payable: { id: string; couple: string; date: string; amount: number; role: string; uploads: number; miles: number | null }[];
  upcoming: { id: string; couple: string; date: string; amount: number; role: string; weddingId: string }[];
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [filter, setFilter] = React.useState<"all" | "pending" | "processing" | "paid" | "on_hold">("all");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [sort, setSort] = React.useState<"date" | "amount">("date");
  const [open, setOpen] = React.useState<Row | null>(null);
  const [requesting, setRequesting] = React.useState<(typeof payable)[number] | null>(null);
  const total = (r: Row) => r.amount + r.mileage + r.bonus;

  const filtered = rows
    .filter((r) => filter === "all" || r.status === filter)
    .filter((r) => !q || `${r.couple} ${r.reference ?? ""} ${r.city ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === "amount" ? total(b) - total(a) : (b.paid_at ?? b.requested_at ?? b.created_at).localeCompare(a.paid_at ?? a.requested_at ?? a.created_at));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const view = filtered.slice(page * PAGE, page * PAGE + PAGE);
  React.useEffect(() => setPage(0), [filter, q, sort]);

  const exportCsv = () => {
    const lines = [["Wedding", "Date", "Base", "Mileage", "Bonus", "Total", "Status", "Paid", "Method", "Reference"], ...filtered.map((r) => [r.couple, r.wedding_date ?? "", r.amount, r.mileage, r.bonus, total(r), r.status, r.paid_at?.slice(0, 10) ?? "", r.method ?? "", r.reference ?? ""])];
    const blob = new Blob([lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `visual-weddings-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Total earnings" value={money(summary.total)} tone="info" sub="Paid + pending" />
        <StatCard icon={CheckCircle2} label="Paid" value={money(summary.paid)} tone="success" sub={`${money(summary.paidMonth)} this month`} />
        <StatCard icon={Hourglass} label="Pending" value={money(summary.pending)} tone="warning" sub={summary.onHold ? `${money(summary.onHold)} on hold` : `${money(summary.processing)} processing`} />
        <StatCard icon={CalendarClock} label="Upcoming" value={money(summary.upcoming)} tone="blush" sub={`${summary.upcomingCount} booked wedding${summary.upcomingCount === 1 ? "" : "s"}`} />
      </div>

      {payable.length > 0 && (
        <Card className="border-blush-200 bg-gradient-to-r from-blush-50 to-white">
          <CardHeader title="Ready to request" subtitle="Weddings you've completed that haven't been invoiced yet" />
          <CardBody>
            <ul className="divide-y divide-blush-100">
              {payable.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{p.couple}</p>
                    <p className="text-[12px] text-muted">{fmtDate(p.date)} · {ROLE_LABEL[p.role]} · {p.uploads ? `${p.uploads} files uploaded` : "No uploads yet"}</p>
                  </div>
                  <span className="font-semibold text-ink">{money(p.amount)}</span>
                  {p.uploads ? <Button size="sm" icon={Send} onClick={() => setRequesting(p)}>Request payment</Button> : <ButtonLink size="sm" variant="outline" icon={Upload} href="/team/uploads">Upload first</ButtonLink>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Monthly payouts" subtitle="Last 12 months" />
          <CardBody><EarningsChart data={summary.monthly} height={220} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming payments" subtitle="Booked weddings — paid after delivery" />
          <CardBody>
            {upcoming.length === 0 ? <EmptyState icon={CalendarClock} title="No booked weddings" className="py-6" /> : (
              <ul className="space-y-3">
                {upcoming.map((u) => (
                  <li key={u.id}>
                    <Link href={`/team/weddings/${u.weddingId}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-canvas">
                      <span className="grid size-10 place-items-center rounded-full bg-blush-50 text-blush-500"><CalendarClock className="size-4" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{u.couple}</p><p className="text-[12px] text-muted">{fmtDate(u.date)} · {ROLE_LABEL[u.role]}</p></div>
                      <span className="text-sm font-semibold text-success-700">+{money(u.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-canvas p-3 text-[13px]">
              <Landmark className="size-4 text-midnight-500" />
              <span className="flex-1 text-midnight-700">Payouts to <b>{payoutMethod}</b> every Friday</span>
              <Link href="/team/settings#payout" className="font-medium text-blush-600 hover:underline">Change</Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Payment history</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={filter} onChange={setFilter} items={[
              { value: "all", label: "All" }, { value: "pending", label: "Pending" }, { value: "processing", label: "Processing" }, { value: "paid", label: "Paid" }, { value: "on_hold", label: "On hold" },
            ]} />
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-10 w-40 pl-9" aria-label="Search payments" /></div>
            <Button variant="outline" icon={Download} onClick={exportCsv}>Export</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {view.length === 0 ? <EmptyState icon={Receipt} title="No payments match" description="Try another filter." /> : (
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-y border-line bg-canvas/60 text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="px-6 py-3 font-medium">Wedding</th><th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium"><button onClick={() => setSort(sort === "amount" ? "date" : "amount")} className="uppercase hover:text-ink">Amount {sort === "amount" ? "↓" : ""}</button></th>
                <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Payment date</th><th className="px-4 py-3 font-medium">Method</th><th className="px-6 py-3" />
              </tr></thead>
              <tbody>
                {view.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-canvas/60" onClick={() => setOpen(r)}>
                    <td className="px-6 py-3.5"><p className="font-medium text-ink">{r.couple}</p>{r.role && <p className="text-[12px] text-muted">{ROLE_LABEL[r.role]}</p>}</td>
                    <td className="px-4 py-3.5 text-midnight-600">{r.wedding_date ? fmtDate(r.wedding_date) : fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3.5 font-semibold text-ink">{money(total(r))}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3.5 text-midnight-600">{r.paid_at ? fmtDate(r.paid_at) : r.scheduled_for ? `Expected ${fmtDate(r.scheduled_for, "MMM d")}` : "—"}</td>
                    <td className="px-4 py-3.5 text-midnight-600"><span className="inline-flex items-center gap-1.5"><CreditCard className="size-3.5 text-midnight-300" />{r.method ?? "Direct deposit"}</span></td>
                    <td className="px-6 py-3.5 text-right"><button className="rounded-full border border-line px-3 py-1 text-[12px] font-medium text-midnight-700 hover:bg-white" onClick={(e) => { e.stopPropagation(); setOpen(r); }}>Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-6 py-3 text-[13px] text-muted">
            <span>Showing {page * PAGE + 1}–{Math.min(filtered.length, page * PAGE + PAGE)} of {filtered.length}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
              {Array.from({ length: pages }, (_, i) => <button key={i} onClick={() => setPage(i)} className={cn("size-10 rounded-xl", i === page ? "bg-midnight-900 text-white" : "hover:bg-canvas")}>{i + 1}</button>)}
              <Button variant="ghost" size="icon" disabled={page === pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.couple} description={open?.wedding_date ? `${fmtDate(open.wedding_date, "EEEE, MMMM d, yyyy")}${open.city ? ` · ${open.city}` : ""}` : undefined}
        icon={<span className="grid size-11 place-items-center rounded-full bg-midnight-50 text-midnight-700"><Receipt className="size-5" /></span>}
        footer={<><Button variant="outline" icon={Download} onClick={() => window.print()}>Print statement</Button><Button onClick={() => setOpen(null)}>Close</Button></>}>
        {open && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl bg-canvas p-4">
              <div><p className="text-[12px] text-muted">Total payout</p><p className="text-2xl font-semibold text-ink">{money(total(open))}</p></div>
              <StatusBadge status={open.status} />
            </div>
            {open.status === "on_hold" && open.hold_reason && (
              <Alert tone="danger" icon={AlertTriangle} title="Why this payout is on hold" action={<ButtonLink href="/team/messages" size="sm" variant="outline" icon={MessageCircle}>Reply</ButtonLink>}>{open.hold_reason}</Alert>
            )}
            <dl className="divide-y divide-line rounded-2xl border border-line text-sm">
              {[
                [`Base rate${open.role ? ` — ${ROLE_LABEL[open.role]}` : ""}${open.coverage_hours ? `, ${open.coverage_hours}h` : ""}`, money(open.amount)],
                ["Mileage", open.mileage ? money(open.mileage) : "—"],
                ["On-time upload bonus", open.bonus ? money(open.bonus) : "—"],
              ].map(([k, v]) => <div key={k} className="flex justify-between px-4 py-3"><dt className="text-midnight-600">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>)}
              <div className="flex justify-between bg-canvas/60 px-4 py-3"><dt className="font-semibold text-ink">Total</dt><dd className="font-semibold text-ink">{money(total(open))}</dd></div>
            </dl>
            <div>
              <p className="mb-3 text-sm font-semibold text-ink">Progress</p>
              <ol className="space-y-3">
                {[
                  ["Requested", open.requested_at, true],
                  ["Quality check & processing", open.status === "processing" || open.status === "paid" ? open.scheduled_for ?? open.requested_at : null, ["processing", "paid"].includes(open.status)],
                  [open.status === "on_hold" ? "On hold" : "Paid", open.paid_at, open.status === "paid"],
                ].map(([label, date, done], i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className={cn("grid size-6 place-items-center rounded-full", done ? "bg-success-500 text-white" : open.status === "on_hold" && i === 2 ? "bg-danger-500 text-white" : "bg-midnight-100 text-muted")}>{done ? <CheckCircle2 className="size-3.5" /> : i + 1}</span>
                    <span className={cn("flex-1", done ? "text-ink" : "text-muted")}>{label as string}</span>
                    <span className="text-[12px] text-muted">{date ? fmtDate(date as string, "MMM d, yyyy") : ""}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-canvas p-3"><p className="text-[12px] text-muted">Method</p><p className="font-medium text-ink">{open.method ?? "Direct deposit"}</p></div>
              <div className="rounded-2xl bg-canvas p-3"><p className="text-[12px] text-muted">Reference</p><p className="font-medium text-ink">{open.reference ?? "Assigned when paid"}</p></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!requesting} onClose={() => setRequesting(null)} size="sm" title="Request payment"
        footer={<><Button variant="outline" onClick={() => setRequesting(null)}>Cancel</Button><Button icon={Send} loading={pending} onClick={() => requesting && run(() => requestPayoutAction(requesting.id), { onSuccess: () => { setRequesting(null); router.refresh(); } })}>Submit request</Button></>}>
        {requesting && (
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl bg-canvas p-4"><p className="font-semibold text-ink">{requesting.couple}</p><p className="text-muted">{fmtDate(requesting.date, "EEEE, MMM d")} · {ROLE_LABEL[requesting.role]}</p></div>
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-muted">Base rate</dt><dd className="font-medium">{money(requesting.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Mileage {requesting.miles && requesting.miles > 100 ? `(${requesting.miles - 100} mi × $0.67)` : ""}</dt><dd className="font-medium">{requesting.miles && requesting.miles > 100 ? money(Math.round((requesting.miles - 100) * 0.67)) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">On-time bonus</dt><dd className="font-medium">{money(50)}</dd></div>
            </dl>
            <p className="text-[12px] text-muted">By submitting you confirm all files are uploaded, including the time-sync frame. Payouts run every Friday after a 2–4 day quality check.</p>
            <Badge tone="success">{requesting.uploads} files uploaded</Badge>
          </div>
        )}
      </Modal>
    </div>
  );
}
