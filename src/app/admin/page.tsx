import { CalendarCheck, Wallet, Sparkles, ShieldAlert, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { StatCard } from "@/components/ui";
import { money } from "@/lib/pricing";
import { AdminBoard } from "./board";
import { checkAvailability } from "@/lib/services/catalog";

export const metadata = { title: "Operations" };
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

export default async function AdminHome() {
  await requireUser(["coordinator", "admin"]);
  const [[stats], bookings, licenses, requests, payouts, open, team, changes, cancels, applicants] = await Promise.all([
    sql`select (select count(*) from bookings where status <> 'cancelled')::int as bookings,
               (select coalesce(sum(case when status = 'paid' then amount when kind = 'refund' and status = 'refunded' then -amount else 0 end),0) from client_payments)::int as revenue,
               (select count(*) from wedding_assignments a join weddings w on w.id = a.wedding_id where a.status = 'open' and w.wedding_date >= current_date)::int as open_slots,
               (select count(*) from licenses where status = 'pending_review')::int as pending_licenses,
               (select count(*) from team_members)::int as team`,
    sql`select b.booking_number, b.total, b.status, b.created_at, w.couple, w.wedding_date::text, m.city, m.state, p.name as package,
          (select coalesce(sum(case when cp.status = 'paid' then cp.amount when cp.kind = 'refund' and cp.status = 'refunded' then -cp.amount else 0 end),0) from client_payments cp where cp.booking_id = b.id)::int as paid,
          (select count(*) from wedding_assignments a where a.wedding_id = w.id and a.status = 'open')::int as open_slots
        from bookings b join weddings w on w.id = b.wedding_id join markets m on m.id = w.market_id join packages p on p.id = b.package_id
        order by b.created_at desc limit 25`,
    sql`select l.id, l.doc_type, l.file_name, l.expires_on::text, l.uploaded_at, u.full_name from licenses l join team_members t on t.id = l.team_member_id join users u on u.id = t.user_id
        where l.status = 'pending_review' order by l.uploaded_at`,
    sql`select a.id, a.role, a.compensation, a.travel_miles, w.couple, w.id as wedding_id, w.wedding_date::text, m.city, u.full_name,
          (select c.id from assignment_contracts c where c.assignment_id = a.id and c.team_member_id = t.id and c.status = 'active' order by c.signed_at desc limit 1) as contract_id,
          (select count(*) from assignment_cancellations x where x.team_member_id = t.id and x.late and x.status in ('reassigned','reopened'))::int as late_cancels
        from wedding_assignments a join weddings w on w.id = a.wedding_id
        join markets m on m.id = w.market_id join team_members t on t.id = a.team_member_id join users u on u.id = t.user_id where a.status = 'pending' order by w.wedding_date`,
    sql`select p.id, p.amount + p.mileage + p.bonus as total, p.status, p.requested_at, u.full_name, w.couple from payouts p join team_members t on t.id = p.team_member_id
        join users u on u.id = t.user_id left join wedding_assignments a on a.id = p.assignment_id left join weddings w on w.id = a.wedding_id
        where p.status in ('pending','processing','on_hold') order by p.requested_at`,
    sql`select a.id, a.role, a.compensation, w.id as wedding_id, w.couple, w.wedding_date::text, m.city, m.state, a.expires_at from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id
        where a.status = 'open' and w.wedding_date >= current_date order by w.wedding_date limit 20`,
    sql`select u.full_name, u.avatar_url, t.skills, m.city, t.rating,
          (select count(*) from wedding_assignments a join weddings w on w.id = a.wedding_id where a.team_member_id = t.id and a.status = 'accepted' and w.wedding_date >= current_date)::int as upcoming
        from team_members t join users u on u.id = t.user_id left join markets m on m.id = t.home_market_id order by u.full_name`,
    sql`select r.id, r.kind, r.note, r.created_at, r.from_date::text, r.to_date::text, r.total_before, r.total_after, r.removed_addons, r.payload, r.before,
          w.couple, w.id as wedding_id, w.wedding_date::text, m.city, m.slug as market, b.booking_number, b.service_slug, fp.name as from_package, tp.name as to_package
        from wedding_change_requests r join weddings w on w.id = r.wedding_id join bookings b on b.id = r.booking_id join markets m on m.id = w.market_id
        left join packages fp on fp.id = r.from_package_id left join packages tp on tp.id = r.to_package_id
        where r.status = 'pending' order by r.created_at`,
    sql`select x.id, x.reason, x.late, x.days_before, x.requested_at, x.role, w.id as wedding_id, w.couple, w.wedding_date::text, u.full_name
        from assignment_cancellations x join weddings w on w.id = x.wedding_id join team_members t on t.id = x.team_member_id join users u on u.id = t.user_id
        where x.status = 'pending' order by w.wedding_date`,
    sql`select count(*)::int as n from team_members where status = 'applicant'`,
  ]);
  // Date requests: show the coordinator how the new date looks before approving
  const changeRows = await Promise.all(changes.map(async (c) => ({
    ...c, created_at: iso(c.created_at),
    availability: c.kind === "date" ? (await checkAvailability(c.market, c.to_date, c.service_slug)).level : null,
    days_out: c.kind === "date" ? Math.round((new Date(c.wedding_date + "T12:00:00").getTime() - Date.now()) / 86400000) : null,
  })));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CalendarCheck} label="Active bookings" value={stats.bookings} />
        <StatCard icon={Wallet} label="Collected" value={money(stats.revenue)} tone="success" />
        <StatCard icon={Sparkles} label="Open team slots" value={stats.open_slots} tone="blush" />
        <StatCard icon={ShieldAlert} label="Licenses to review" value={stats.pending_licenses} tone="warning" />
        <StatCard icon={Users} label="Team members" value={stats.team} tone="info" />
      </div>
      <AdminBoard
        bookings={bookings.map((b) => ({ ...b, created_at: iso(b.created_at) })) as never}
        licenses={licenses.map((l) => ({ ...l, uploaded_at: iso(l.uploaded_at) })) as never}
        requests={requests as never}
        payouts={payouts.map((p) => ({ ...p, requested_at: iso(p.requested_at) })) as never}
        open={open.map((o) => ({ ...o, expires_at: iso(o.expires_at) })) as never}
        team={team as never}
        changes={changeRows as never}
        cancels={cancels.map((c) => ({ ...c, requested_at: iso(c.requested_at) })) as never}
        applicants={applicants[0].n}
      />
    </div>
  );
}
