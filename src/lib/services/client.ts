import "server-only";
import { sql } from "@/lib/db";
import { changeRequestsFor } from "./changes";

export async function clientBooking(userId: string, bookingNumber?: string): Promise<ClientBooking | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [b] = await sql<Record<string, any>[]>`
    select b.id, b.booking_number, b.total, b.package_price, b.addons_total, b.deposit_amount, b.status, b.created_at, b.service_slug,
      w.id as wedding_id, w.market_id, w.couple, w.wedding_date::text, w.start_time::text, w.venue_name, w.venue_address, w.ceremony_location, w.reception_location,
      w.guest_count, w.wedding_type, w.special_requests, w.notes, w.status as wedding_status,
      m.city, m.state, m.slug as market_slug, m.price_multiplier::float as price_multiplier, p.slug as package_slug, p.name as package_name, p.hours, p.photographers, p.videographers, p.deliverables as package_deliverables, p.features, p.turnaround_days, c.partner_one, c.partner_two
    from bookings b join weddings w on w.id = b.wedding_id join clients c on c.id = b.client_id join markets m on m.id = w.market_id join packages p on p.id = b.package_id
    where c.user_id = ${userId} ${bookingNumber ? sql`and b.booking_number = ${bookingNumber}` : sql`and b.status <> 'cancelled'`}
    order by (w.wedding_date >= current_date) desc, w.wedding_date asc limit 1`;
  if (!b) return null;
  const [addons, payments, team, timeline, documents, questionnaire, deliverables, convo, coordinator, changeRequests] = await Promise.all([
    sql`select a.name, a.slug, a.applies_to, ba.quantity, ba.unit_price, a.unit from booking_addons ba join addons a on a.id = ba.addon_id where ba.booking_id = ${b.id}`,
    sql`select id, kind, amount, due_date::text, status, paid_at, method_brand, method_last4, receipt_number from client_payments where booking_id = ${b.id} order by due_date, kind`,
    sql`select a.role, a.status, u.full_name, u.avatar_url, tm.bio, tm.years_experience, tm.specialties
        from wedding_assignments a left join team_members tm on tm.id = a.team_member_id and a.status in ('accepted','completed') left join users u on u.id = tm.user_id
        where a.wedding_id = ${b.wedding_id} and a.status not in ('cancelled','expired','filled') order by a.role`,
    sql`select time::text, title, detail from wedding_timeline_items where wedding_id = ${b.wedding_id} order by sort`,
    sql`select id, type, title, content, created_at from documents where wedding_id = ${b.wedding_id} and visibility in ('all','client') order by created_at`,
    sql`select answers, status, submitted_at from client_questionnaires where wedding_id = ${b.wedding_id}`,
    sql`select id, filename, size_bytes, created_at, kind from uploads where wedding_id = ${b.wedding_id} and client_visible order by created_at desc`,
    sql`select c.id from conversations c join conversation_participants cp on cp.conversation_id = c.id and cp.user_id = ${userId} where c.wedding_id = ${b.wedding_id} order by c.created_at limit 1`,
    sql`select full_name, avatar_url, phone, email from users where role = 'coordinator' order by created_at limit 1`,
    changeRequestsFor(b.wedding_id),
  ]);
  // Refunds (e.g. after a package downgrade) come back off what has been paid.
  const refunded = payments.filter((p) => p.kind === "refund" && p.status === "refunded").reduce((s, p) => s + p.amount, 0);
  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0) - refunded;
  const due = payments.filter((p) => p.status === "scheduled");
  return {
    ...b, addons, payments, team, timeline, documents, questionnaire: questionnaire[0] ?? null, deliverables, changeRequests, refunded, conversationId: convo[0]?.id ?? null, coordinator: coordinator[0] ?? null,
    paid, balance: b.total - paid, nextPayment: due[0] ?? null,
  } as ClientBooking;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;
export interface ClientBooking extends R {
  addons: R[]; payments: R[]; changeRequests: R[]; refunded: number; team: R[]; timeline: R[]; documents: R[]; deliverables: R[];
  coordinator: R | null; questionnaire: R | null; nextPayment: R | null; conversationId: string | null; paid: number; balance: number;
}
