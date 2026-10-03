import Link from "next/link";
import { CalendarDays, MapPin, ClipboardList, MessageCircle, ArrowRight, Clock, Images, CheckCircle2, Camera, Video, Heart, FileText } from "lucide-react";
import { currentClient } from "@/lib/services/me-client";
import { Card, CardHeader, CardBody, Avatar, Badge, ButtonLink, Progress, EmptyState, DescList } from "@/components/ui";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { fmtLong, fmtDate, fmtTime, daysUntil, cn } from "@/lib/utils";
import { IMG, unsplash } from "@/content/catalog";
import { PayButton } from "./pay-button";

export const metadata = { title: "My Wedding" };

export default async function ClientHome() {
  const { user, booking: b } = await currentClient();
  if (!b) {
    return (
      <Card className="mx-auto max-w-2xl">
        <EmptyState icon={Heart} title={`Welcome, ${user.full_name.split(" ")[0]}!`} description="You don't have a booking yet. Check availability for your date and reserve your team in about ten minutes." action={<ButtonLink href="/book" size="lg">Book your wedding</ButtonLink>} />
      </Card>
    );
  }
  const d = daysUntil(b.wedding_date);
  const q = b.questionnaire;
  const steps = [
    { done: true, label: "Date reserved", sub: `Booked ${fmtDate(b.created_at)}` },
    { done: q?.status === "submitted", label: "Questionnaire", sub: q?.status === "submitted" ? "Submitted" : q?.status === "draft" ? "In progress" : "Not started", href: "/client/questionnaire" },
    { done: b.team.length > 0 && b.team.every((t) => t.full_name), label: "Team assigned", sub: `${b.team.filter((t) => t.full_name).length} of ${b.team.length} confirmed` },
    { done: b.balance <= 0, label: "Balance paid", sub: b.balance > 0 ? `${money(b.balance)} remaining` : "Paid in full", href: "/client/payments" },
    { done: b.deliverables.length > 0, label: "Gallery delivered", sub: d < 0 ? "In editing" : `~${Math.round(b.turnaround_days / 7)} weeks after`, href: "/client/documents" },
  ];
  const progress = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[var(--radius-card)] bg-midnight-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={unsplash(IMG.lakeside, 1600, 700)} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight-950 via-midnight-950/70 to-transparent" />
        <div className="flex flex-col gap-6 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone="blush" className="bg-white/10 text-blush-200">{b.booking_number}</Badge>
            <h2 className="mt-3 font-serif text-4xl sm:text-5xl">{b.couple}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-white/75"><span className="flex items-center gap-1.5"><CalendarDays className="size-4" />{fmtLong(b.wedding_date)}</span><span className="flex items-center gap-1.5"><MapPin className="size-4" />{b.venue_name}, {b.city}</span></p>
          </div>
          {d >= 0 ? (
            <div className="flex gap-3">
              {[[d, "days"], [Math.floor(d / 7), "weeks"]].map(([v, l]) => <div key={l as string} className="min-w-[96px] rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur"><p className="text-4xl font-semibold">{v as number}</p><p className="text-[12px] uppercase tracking-wide text-white/60">{l as string} to go</p></div>)}
            </div>
          ) : <Badge tone="success" className="text-sm">Married {Math.abs(d)} days ago 🎉</Badge>}
        </div>
      </section>

      <Card>
        <CardBody className="pt-6">
          <div className="mb-4 flex items-center justify-between"><p className="font-semibold text-ink">Your planning progress</p><span className="text-sm text-muted">{progress}%</span></div>
          <Progress value={progress} tone="blush" />
          <ol className="mt-6 grid gap-4 sm:grid-cols-5">
            {steps.map((s) => {
              const inner = (
                <>
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", s.done ? "bg-success-500 text-white" : "bg-midnight-50 text-midnight-400")}>{s.done ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}</span>
                  <span><span className="block text-sm font-medium text-ink">{s.label}</span><span className="block text-[12px] text-muted">{s.sub}</span></span>
                </>
              );
              return <li key={s.label}>{s.href ? <Link href={s.href} className="flex items-start gap-3 rounded-xl p-1 hover:bg-canvas">{inner}</Link> : <div className="flex items-start gap-3 p-1">{inner}</div>}</li>;
            })}
          </ol>
        </CardBody>
      </Card>

      {q?.status !== "submitted" && d >= 0 && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-blush-200 bg-blush-50 p-5 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-blush-500"><ClipboardList className="size-6" /></span>
          <div className="flex-1"><p className="font-semibold text-ink">Tell us about your day</p><p className="text-sm text-midnight-600">Your questionnaire helps your team plan the timeline, family photos and must-have moments.</p></div>
          <ButtonLink href="/client/questionnaire" icon={ArrowRight}>{q?.status === "draft" ? "Continue questionnaire" : "Start questionnaire"}</ButtonLink>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Booking details" action={<Badge tone="success">{b.status === "confirmed" ? "Confirmed" : b.status}</Badge>} />
            <CardBody>
              <DescList cols={3} items={[
                ["Package", `${b.package_name}`], ["Coverage", `${b.hours} hours`], ["Services", b.service_slug === "both" ? "Photo + Video" : b.service_slug === "photo" ? "Photography" : "Videography"],
                ["Venue", b.venue_name], ["Ceremony", b.ceremony_location], ["Reception", b.reception_location],
                ["Guests", b.guest_count], ["Style", b.wedding_type], ["Start time", fmtTime(b.start_time)],
              ]} />
              <div className="mt-6 flex flex-wrap gap-2">
                {(b.package_deliverables ?? []).map((x: string) => <Badge key={x}>{x}</Badge>)}
                {b.addons.map((a) => <Badge key={a.name} tone="blush">+ {a.name}{a.quantity > 1 ? ` × ${a.quantity}` : ""}</Badge>)}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Your day at a glance" subtitle="Draft timeline — your coordinator will finalize it with you" action={<Link href="/client/messages" className="text-sm font-semibold text-midnight-700 hover:underline">Suggest changes</Link>} />
            <CardBody>
              <ol className="relative ml-2 border-l-2 border-midnight-50">
                {b.timeline.map((t, i) => (
                  <li key={i} className="relative pb-4 pl-6 last:pb-0">
                    <span className={cn("absolute -left-[9px] top-1 size-4 rounded-full border-[3px] border-white", i === 0 ? "bg-blush-400" : "bg-midnight-200")} />
                    <p className="text-sm"><b className="mr-3 inline-block w-20 text-ink">{fmtTime(t.time)}</b><span className="text-midnight-700">{t.title}</span></p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Payments" action={<Link href="/client/payments" className="text-sm font-semibold text-midnight-700 hover:underline">Details</Link>} />
            <CardBody>
              <div className="flex items-end justify-between"><div><p className="text-[12px] text-muted">Paid</p><p className="text-2xl font-semibold text-ink">{money(b.paid)}</p></div><p className="text-sm text-muted">of {money(b.total)}</p></div>
              <Progress value={(b.paid / b.total) * 100} tone="success" className="mt-3" />
              {b.nextPayment ? (
                <div className="mt-4 rounded-2xl bg-canvas p-4">
                  <p className="text-sm text-midnight-700">Next payment <b className="text-ink">{money(b.nextPayment.amount)}</b> due {fmtDate(b.nextPayment.due_date)}</p>
                  <PayButton paymentId={b.nextPayment.id} amount={b.nextPayment.amount} label="Pay now" />
                </div>
              ) : <p className="mt-4 flex items-center gap-2 text-sm text-success-700"><CheckCircle2 className="size-4" />Paid in full — thank you!</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Your team" />
            <CardBody className="space-y-3">
              {b.team.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Avatar name={t.full_name ?? ROLE_LABEL[t.role]} src={t.avatar_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">{t.role.includes("photo") ? <Camera className="size-3.5 text-muted" /> : <Video className="size-3.5 text-muted" />}{t.full_name ?? ROLE_LABEL[t.role]}</p>
                    <p className="truncate text-[12px] text-muted">{t.full_name ? `${ROLE_LABEL[t.role]} · ${t.years_experience} yrs · ${(t.specialties ?? []).slice(0, 2).join(", ")}` : "We're matching the perfect person"}</p>
                  </div>
                  {!t.full_name && <Badge>Matching</Badge>}
                </div>
              ))}
              {b.coordinator && (
                <div className="flex items-center gap-3 border-t border-line pt-3">
                  <Avatar name={b.coordinator.full_name} src={b.coordinator.avatar_url} size={44} />
                  <div className="flex-1"><p className="text-sm font-medium text-ink">{b.coordinator.full_name}</p><p className="text-[12px] text-muted">Your coordinator · {b.coordinator.phone}</p></div>
                </div>
              )}
              {b.conversationId && <ButtonLink href={`/client/messages?c=${b.conversationId}`} variant="outline" icon={MessageCircle} className="w-full">Message your team</ButtonLink>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documents & gallery" action={<Link href="/client/documents" className="text-sm font-semibold text-midnight-700 hover:underline">All</Link>} />
            <CardBody className="space-y-2">
              {b.documents.slice(0, 3).map((doc) => <Link key={doc.id} href="/client/documents" className="flex items-center gap-3 rounded-xl p-2 text-sm hover:bg-canvas"><FileText className="size-4 text-midnight-400" /><span className="flex-1 truncate text-midnight-700">{doc.title}</span></Link>)}
              {b.deliverables.length > 0 ? <Link href="/client/documents" className="flex items-center gap-3 rounded-xl bg-success-50 p-2 text-sm text-success-700"><Images className="size-4" />Your gallery is ready!</Link> : <p className="flex items-center gap-3 p-2 text-[13px] text-muted"><Images className="size-4" />Your gallery will appear here after the wedding.</p>}
            </CardBody>
          </Card>
                  </div>
      </div>
    </div>
  );
}
