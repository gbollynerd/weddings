import { Wallet, CheckCircle2, CalendarClock, Receipt } from "lucide-react";
import { currentClient } from "@/lib/services/me-client";
import { Card, CardHeader, CardBody, StatCard, StatusBadge, ButtonLink, EmptyState, Progress } from "@/components/ui";
import { money } from "@/lib/pricing";
import { fmtDate } from "@/lib/utils";
import { PayButton } from "../pay-button";
import { ReceiptButton } from "./receipt";

export const metadata = { title: "Payments" };
const KIND: Record<string, string> = { deposit: "Deposit", balance: "Balance", installment: "Installment", addon: "Add-on" };

export default async function ClientPayments() {
  const { booking: b } = await currentClient();
  if (!b) return <Card><EmptyState icon={Wallet} title="No payments yet" action={<ButtonLink href="/book">Book your wedding</ButtonLink>} /></Card>;
  const scheduled = b.payments.filter((p) => p.status === "scheduled");
  const due = scheduled.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Total" value={money(b.total)} tone="midnight" sub={`${b.package_name} package`} />
        <StatCard icon={CheckCircle2} label="Paid" value={money(b.paid)} tone="success" sub={`${Math.round((b.paid / b.total) * 100)}% complete`} />
        <StatCard icon={CalendarClock} label="Remaining" value={money(b.balance)} tone="blush" sub={b.nextPayment ? `Next due ${fmtDate(b.nextPayment.due_date)}` : "Nothing due"} />
      </div>
      <Card>
        <CardBody className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="flex-1"><p className="font-semibold text-ink">Payment progress</p><Progress value={(b.paid / b.total) * 100} tone="success" className="mt-3" /></div>
          {scheduled.length > 0 && <div className="flex gap-2">{b.nextPayment && <PayButton paymentId={b.nextPayment.id} amount={b.nextPayment.amount} label={`Pay next ${money(b.nextPayment.amount)}`} variant="outline" className="" />}{scheduled.length > 1 && <PayButton paymentId="all" amount={due} label={`Pay all ${money(due)}`} className="" />}</div>}
        </CardBody>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Payment schedule & history" subtitle={`Booking ${b.booking_number}`} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-y border-line bg-canvas/60 text-left text-[12px] uppercase tracking-wide text-muted"><th className="px-6 py-3 font-medium">Payment</th><th className="px-4 py-3 font-medium">Due</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Method</th><th className="px-6 py-3" /></tr></thead>
            <tbody>
              {b.payments.map((p) => (
                <tr key={p.id} className="border-b border-line/70 last:border-0">
                  <td className="px-6 py-3.5 font-medium text-ink">{KIND[p.kind] ?? p.kind}</td>
                  <td className="px-4 py-3.5 text-midnight-600">{fmtDate(p.due_date)}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">{money(p.amount)}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={p.status} label={p.status === "scheduled" ? "Upcoming" : undefined} /></td>
                  <td className="px-4 py-3.5 text-midnight-600">{p.method_brand ? `${p.method_brand} ···· ${p.method_last4}` : "—"}</td>
                  <td className="px-6 py-3.5 text-right">{p.status === "paid" ? <ReceiptButton receipt={{ number: p.receipt_number ?? "—", amount: p.amount, date: p.paid_at ? new Date(p.paid_at).toISOString() : "", method: `${p.method_brand} ···· ${p.method_last4}`, kind: KIND[p.kind] ?? p.kind, booking: b.booking_number, couple: b.couple, pkg: b.package_name, total: b.total, paid: b.paid }} /> : p.status === "scheduled" ? <PayButton paymentId={p.id} amount={p.amount} label="Pay" variant="outline" className="" /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="flex items-center gap-2 text-[12px] text-muted"><Receipt className="size-3.5" />Payments are processed securely. Questions about your invoice? Message your coordinator.</p>
    </div>
  );
}
