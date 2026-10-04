import Link from "next/link";
import { CalendarClock, MapPin, Clock, Wallet, Hourglass, TrendingUp, CircleDollarSign, ArrowRight, Sparkles, MessageCircle, Camera, Video } from "lucide-react";
import { currentMember } from "@/lib/services/me";
import { myAssignments, opportunities, earnings, actionItems } from "@/lib/services/team";
import { listConversations } from "@/lib/services/messages";
import { listNotifications } from "@/lib/services/notifications";
import { Card, CardHeader, CardBody, StatCard, StatusBadge, Avatar, EmptyState, ButtonLink, Badge } from "@/components/ui";
import { EarningsChart } from "@/components/team/earnings-chart";
import { ApplicationStatus } from "./application";
import { ActionList } from "@/components/team/action-list";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { fmtDate, fmtTime, daysUntil, chatTime, ago, cn } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function TeamOverview() {
  const { user, member } = await currentMember();
  if (member.status !== "active") return <ApplicationStatus member={member} />;
  const [upcoming, opps, money_, actions, convos, notes] = await Promise.all([
    myAssignments(member.id, "upcoming"), opportunities(member), earnings(member.id), actionItems(member),
    listConversations(user.id), listNotifications(user.id, "all", 5),
  ]);
  const next = upcoming.find((a) => a.status === "accepted") ?? upcoming[0];
  const second = upcoming.filter((a) => a !== next)[0];
  const open = opps.filter((o) => o.view_status === "available" && o.eligible).slice(0, 4);
  const first = member.full_name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{fmtDate(new Date(), "EEEE, MMMM d")}</p>
          <h2 className="text-2xl font-semibold text-ink">Good to see you, {first}.</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/team/availability" variant="outline" icon={CalendarClock}>Update availability</ButtonLink>
          <ButtonLink href="/team/open" icon={Sparkles}>Browse open weddings</ButtonLink>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Upcoming wedding cards — modelled on the BankDash "My Cards" pair */}
        <section className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Upcoming weddings</h3>
            <Link href="/team/weddings" className="text-sm font-semibold text-midnight-700 hover:underline">See all</Link>
          </div>
          {next ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Link href={`/team/weddings/${next.wedding_id}`} className="group relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-midnight-700 via-midnight-900 to-midnight-950 text-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
                <div className="absolute -right-10 -top-10 size-40 rounded-full bg-blush-400/20 blur-2xl" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[12px] text-white/60">Next wedding · in {daysUntil(next.wedding_date)} days</p>
                      <p className="mt-1 font-serif text-2xl">{next.couple}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium capitalize text-blush-200">{next.status === "pending" ? "Pending approval" : "Confirmed"}</span>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
                    <div><p className="text-white/50">Date</p><p className="font-medium">{fmtDate(next.wedding_date, "EEE, MMM d")}</p></div>
                    <div><p className="text-white/50">Call time</p><p className="font-medium">{fmtTime(next.call_time)}</p></div>
                    <div><p className="text-white/50">Role</p><p className="font-medium">{ROLE_LABEL[next.role]}</p></div>
                    <div><p className="text-white/50">Coverage</p><p className="font-medium">{next.coverage_hours} hours</p></div>
                  </div>
                </div>
                <div className="relative flex items-center justify-between bg-white/[0.07] px-6 py-4 text-[13px]">
                  <span className="flex items-center gap-2 truncate"><MapPin className="size-4 text-blush-300" />{next.venue_name}, {next.city}</span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
              {second ? (
                <Link href={`/team/weddings/${second.wedding_id}`} className="card group flex flex-col justify-between overflow-hidden transition hover:-translate-y-0.5">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[12px] text-muted">In {daysUntil(second.wedding_date)} days</p>
                        <p className="mt-1 font-serif text-2xl text-ink">{second.couple}</p>
                      </div>
                      <StatusBadge status={second.status === "accepted" ? "confirmed" : second.status} />
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
                      <div><p className="text-muted">Date</p><p className="font-medium text-ink">{fmtDate(second.wedding_date, "EEE, MMM d")}</p></div>
                      <div><p className="text-muted">Call time</p><p className="font-medium text-ink">{fmtTime(second.call_time)}</p></div>
                      <div><p className="text-muted">Role</p><p className="font-medium text-ink">{ROLE_LABEL[second.role]}</p></div>
                      <div><p className="text-muted">Coverage</p><p className="font-medium text-ink">{second.coverage_hours} hours</p></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-line px-6 py-4 text-[13px] text-midnight-600">
                    <span className="flex items-center gap-2 truncate"><MapPin className="size-4 text-blush-400" />{second.venue_name}, {second.city}</span>
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              ) : (
                <Card className="grid place-items-center p-6 text-center">
                  <div>
                    <p className="font-medium text-ink">Room for one more?</p>
                    <p className="mt-1 text-sm text-muted">{open.length} open weddings match your discipline.</p>
                    <ButtonLink href="/team/open" variant="outline" size="sm" className="mt-4">Browse</ButtonLink>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card><EmptyState icon={CalendarClock} title="No upcoming weddings yet" description="Keep your calendar current and accept an open wedding to get started." action={<ButtonLink href="/team/open">Browse open weddings</ButtonLink>} /></Card>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Action required</h3>
            {actions.length > 0 && <Badge tone="danger">{actions.length}</Badge>}
          </div>
          <Card className="p-3"><ActionList items={actions.slice(0, 5)} /></Card>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label="Upcoming payments" value={money(money_.upcoming)} tone="blush" sub={`${money_.upcomingCount} booked wedding${money_.upcomingCount === 1 ? "" : "s"}`} />
        <StatCard icon={Wallet} label="Paid this month" value={money(money_.paidMonth)} tone="success" />
        <StatCard icon={Hourglass} label="Pending payments" value={money(money_.pending)} tone="warning" sub={money_.onHold ? `${money(money_.onHold)} on hold` : "Processing weekly"} />
        <StatCard icon={TrendingUp} label="Total earnings" value={money(money_.total)} tone="info" sub="All time" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Earnings" subtitle="Payouts received over the last 12 months" action={<ButtonLink href="/team/payments" variant="ghost" size="sm">Payments <ArrowRight className="size-4" /></ButtonLink>} />
          <CardBody><EarningsChart data={money_.monthly} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Open opportunities" subtitle="Weddings that still need a team member" action={<Link href="/team/open" className="text-sm font-semibold text-midnight-700 hover:underline">View all</Link>} />
          <CardBody className="pt-2">
            {open.length === 0 ? <EmptyState icon={Sparkles} title="Nothing open right now" description="We'll notify you when a wedding needs you." className="py-6" /> : (
              <ul className="divide-y divide-line">
                {open.map((o) => (
                  <li key={o.id}>
                    <Link href={`/team/open?id=${o.id}`} className="flex items-center gap-3 py-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-midnight-50 text-center leading-none">
                        <span className="text-[10px] font-semibold uppercase text-muted">{fmtDate(o.wedding_date, "MMM")}</span>
                        <span className="text-lg font-semibold text-ink">{fmtDate(o.wedding_date, "d")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{o.city}, {o.state}</p>
                        <p className="truncate text-[12px] text-muted">{ROLE_LABEL[o.role]} · {o.coverage_hours}h</p>
                      </div>
                      <span className="text-sm font-semibold text-success-500">{money(o.compensation)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader title="Your schedule" subtitle="Confirmed and pending assignments" />
          <div className="mt-4 overflow-x-auto">
            {upcoming.length === 0 ? <EmptyState icon={CalendarClock} title="Your schedule is clear" /> : (
              <table className="w-full min-w-[620px] text-sm">
                <thead><tr className="border-y border-line bg-canvas/60 text-left text-[12px] uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Couple</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Location</th><th className="px-4 py-3 font-medium">Service</th><th className="px-4 py-3 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {upcoming.slice(0, 6).map((a) => (
                    <tr key={a.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/50">
                      <td className="px-6 py-3.5"><Link href={`/team/weddings/${a.wedding_id}`} className="font-medium text-ink hover:underline">{a.couple}</Link></td>
                      <td className="px-4 py-3.5 text-midnight-600">{fmtDate(a.wedding_date)}</td>
                      <td className="px-4 py-3.5 text-midnight-600">{a.city}, {a.state}</td>
                      <td className="px-4 py-3.5 text-midnight-600"><span className="inline-flex items-center gap-1.5">{a.role.includes("photo") ? <Camera className="size-3.5" /> : <Video className="size-3.5" />}{a.role.includes("photo") ? "Photography" : "Videography"} · {a.coverage_hours}h</span></td>
                      <td className="px-4 py-3.5"><StatusBadge status={a.status === "accepted" ? "confirmed" : a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Messages" action={<Link href="/team/messages" className="text-sm font-semibold text-midnight-700 hover:underline">Open</Link>} />
            <CardBody className="pt-2">
              {convos.length === 0 ? <EmptyState icon={MessageCircle} title="No messages yet" className="py-6" /> : (
                <ul className="space-y-1">
                  {convos.slice(0, 4).map((c) => {
                    const other = c.participants.find((p) => p.id !== user.id) ?? c.participants[0];
                    return (
                      <li key={c.id}>
                        <Link href={`/team/messages?c=${c.id}`} className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-canvas">
                          <Avatar name={other?.name ?? "VW"} src={other?.avatar} size={38} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2"><p className={cn("truncate text-[13px]", c.unread ? "font-semibold text-ink" : "font-medium text-midnight-700")}>{c.subject}</p><span className="shrink-0 text-[11px] text-muted">{chatTime(c.last_message_at)}</span></div>
                            <p className="truncate text-[12px] text-muted">{c.last_sender?.split(" ")[0]}: {c.last_body}</p>
                          </div>
                          {c.unread > 0 && <span className="size-2 shrink-0 rounded-full bg-blush-400" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Notifications" action={<Link href="/team/notifications" className="text-sm font-semibold text-midnight-700 hover:underline">All</Link>} />
            <CardBody className="pt-2">
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-midnight-100" : "bg-blush-400")} />
                    <Link href={n.link ?? "/team/notifications"} className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">{n.title}</p>
                      <p className="text-[11px] text-muted">{ago(n.created_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
      <p className="flex items-center gap-2 text-[12px] text-muted"><Clock className="size-3.5" /> Uploads are due within 48 hours of each wedding. <CircleDollarSign className="ml-2 size-3.5" /> Payouts run every Friday.</p>
    </div>
  );
}
