import { currentMember } from "@/lib/services/me";
import { earnings, payouts, payableAssignments, myAssignments } from "@/lib/services/team";
import { PaymentsView } from "./view";

export const metadata = { title: "Payments" };

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

export default async function PaymentsPage() {
  const { member } = await currentMember();
  const [summary, rows, payable, upcoming] = await Promise.all([earnings(member.id), payouts(member.id), payableAssignments(member.id), myAssignments(member.id, "upcoming")]);
  return (
    <PaymentsView
      summary={summary}
      payoutMethod={`${member.payout_method ?? "Direct deposit"}${member.payout_last4 ? ` ···· ${member.payout_last4}` : ""}`}
      rows={rows.map((r) => ({
        id: r.id, couple: r.couple ?? "Earlier season wedding", wedding_date: r.wedding_date, role: r.role, city: r.city ? `${r.city}, ${r.state}` : null,
        amount: r.amount, mileage: r.mileage, bonus: r.bonus, status: r.status, requested_at: iso(r.requested_at), scheduled_for: r.scheduled_for,
        paid_at: iso(r.paid_at), method: r.method, reference: r.reference, hold_reason: r.hold_reason, created_at: iso(r.created_at)!, coverage_hours: r.coverage_hours,
      }))}
      payable={payable.map((p) => ({ id: p.id, couple: p.couple, date: p.wedding_date, amount: p.compensation, role: p.role, uploads: p.uploads, miles: p.travel_miles }))}
      upcoming={upcoming.filter((u) => u.status === "accepted").map((u) => ({ id: u.id, couple: u.couple, date: u.wedding_date, amount: u.compensation, role: u.role, weddingId: u.wedding_id }))}
    />
  );
}
