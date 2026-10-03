import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, CalendarDays, Clock, Users, Camera, Video, Heart, UploadCloud, MessageCircle, Phone, Lock, Images, Film } from "lucide-react";
import { currentMember } from "@/lib/services/me";
import { weddingForMember } from "@/lib/services/team";
import { Card, CardHeader, CardBody, StatusBadge, DescList, Avatar, Badge, ButtonLink, EmptyState, Alert } from "@/components/ui";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { fmtLong, fmtTime, fmtDate, daysUntil, bytes, cn } from "@/lib/utils";
import { WeddingDocuments, PrepConfirm, QuickMessage } from "./client";
import { LocationCard, ShareDetails } from "./logistics";
import { mapLinks } from "@/lib/maps";

export const metadata = { title: "Wedding details" };

export default async function WeddingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, member } = await currentMember();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await weddingForMember(member.id, id);
  if (!data) notFound();
  const { assignment: a, wedding: w, timeline, team, documents, questionnaire, uploads, conversationId, client } = data;
  const d = daysUntil(a.wedding_date);
  const past = d < 0;
  const status = a.wedding_status === "cancelled" ? "cancelled" : past ? "completed" : a.status === "accepted" ? "confirmed" : a.status;
  const isVideo = a.role.includes("video");
  const q = (questionnaire?.answers ?? {}) as Record<string, string>;
  const fullAddress = a.venue_address || `${a.venue_name}, ${a.city}, ${a.state}`;
  const shareInfo = {
    couple: a.couple, dateLong: fmtLong(a.wedding_date), dateShort: fmtDate(a.wedding_date, "EEE MMM d"),
    callTime: fmtTime(a.call_time), coverage: `${a.coverage_hours} hrs coverage`, role: ROLE_LABEL[a.role],
    venue: a.venue_name, address: fullAddress, ceremony: w?.ceremony_location ?? null, reception: w?.reception_location ?? null,
    firstEvents: timeline.slice(0, 6).map((t) => ({ time: fmtTime(t.time), title: t.title })),
    coordinator: "Grace Thompson", onCall: "(704) 555-0199", weddingId: id,
  };

  return (
    <div className="space-y-6">
      <Link href="/team/weddings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" />My Weddings</Link>

      <div className="card relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-blush-50 to-transparent md:block" />
        <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={status} /><Badge tone={isVideo ? "info" : "blush"}>{isVideo ? <Video className="size-3" /> : <Camera className="size-3" />}{ROLE_LABEL[a.role]}</Badge>{!past && d >= 0 && <Badge>{d === 0 ? "Today" : `In ${d} days`}</Badge>}</div>
            <h2 className="mt-3 font-serif text-3xl text-ink">{a.couple}</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-midnight-600">
              <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-midnight-300" />{fmtLong(a.wedding_date)}</span>
              <a href={mapLinks(fullAddress).view} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 underline decoration-midnight-200 underline-offset-4 hover:text-ink hover:decoration-midnight-400"><MapPin className="size-4 text-midnight-300" />{a.venue_name}, {a.city}, {a.state}</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareDetails info={shareInfo} me={{ email: user.email, phone: user.phone ?? null }} />
            {conversationId && <ButtonLink href={`/team/messages?c=${conversationId}`} variant="outline" icon={MessageCircle}>Message team</ButtonLink>}
            <ButtonLink href={`/team/uploads${isVideo ? "/video" : ""}?wedding=${id}`} icon={UploadCloud}>{past ? "Upload files" : "Uploads"}</ButtonLink>
          </div>
        </div>
      </div>

      {a.status === "pending" && <Alert tone="warning" icon={Clock} title="Awaiting coordinator approval">You&apos;ll be notified as soon as your request for this wedding is confirmed.</Alert>}
      {!past && a.status === "accepted" && <PrepConfirm assignmentId={a.id} confirmedAt={a.prep_confirmed_at ? String(a.prep_confirmed_at) : null} />}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Wedding overview" />
            <CardBody>
              <DescList cols={3} items={[
                ["Couple", a.couple],
                ["Date", fmtDate(a.wedding_date, "EEE, MMM d, yyyy")],
                ["Your call time", fmtTime(a.call_time)],
                ["Venue", a.venue_name],
                ["Address", a.venue_address],
                ["Location", `${a.city}, ${a.state}`],
                ["Ceremony", w?.ceremony_location],
                ["Reception", w?.reception_location],
                ["Coverage", `${a.coverage_hours} hours · ${a.package_name ?? ""}`],
                ["Assigned role", ROLE_LABEL[a.role]],
                ["Guests", a.guest_count],
                ["Style", a.wedding_type],
              ]} />
              {(w?.special_requests || w?.notes) && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {w?.special_requests && <div className="rounded-2xl bg-blush-50 p-4 text-sm"><p className="mb-1 font-semibold text-blush-700">Special requests</p><p className="text-midnight-700">{w.special_requests}</p></div>}
                  {w?.notes && <div className="rounded-2xl bg-canvas p-4 text-sm"><p className="mb-1 font-semibold text-ink">Coordinator notes</p><p className="text-midnight-700">{w.notes}</p></div>}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" subtitle="Times are local to the venue" />
            <CardBody>
              <ol className="relative ml-2 border-l-2 border-midnight-50">
                {timeline.map((t, i) => (
                  <li key={t.id} className="relative pb-5 pl-6 last:pb-0">
                    <span className={cn("absolute -left-[9px] top-1 size-4 rounded-full border-[3px] border-white", i === 0 ? "bg-blush-400" : i === timeline.length - 1 ? "bg-midnight-900" : "bg-midnight-200")} />
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <span className="w-20 shrink-0 text-sm font-semibold text-ink">{fmtTime(t.time)}</span>
                      <div><p className="text-sm font-medium text-ink">{t.title}</p>{t.detail && <p className="text-[13px] text-muted">{t.detail}</p>}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <WeddingDocuments
            questionnaire={questionnaire ? { status: questionnaire.status, answers: q, submitted_at: questionnaire.submitted_at ? String(questionnaire.submitted_at) : null } : null}
            documents={documents.map((x) => ({ id: x.id, type: x.type, title: x.title, content: x.content ?? "" }))}
            specialRequests={w?.special_requests ?? null}
            timeline={timeline.map((t) => ({ time: fmtTime(t.time), title: t.title, detail: t.detail }))}
          />
        </div>

        <div className="space-y-6">
          <LocationCard venue={a.venue_name} address={fullAddress} />
          <Card>
            <CardHeader title="Wedding team" />
            <CardBody className="space-y-3">
              {team.map((t, i) => (
                <div key={i} className={cn("flex items-center gap-3 rounded-2xl p-2", t.is_me && "bg-blush-50")}>
                  <Avatar name={t.full_name ?? "Open"} src={t.avatar_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{t.full_name ?? "Open position"} {t.is_me && <span className="text-blush-600">(you)</span>}</p>
                    <p className="text-[12px] text-muted">{ROLE_LABEL[t.role]} · arrives {fmtTime(t.call_time)}</p>
                  </div>
                  {!t.full_name && <Badge tone="info">Open</Badge>}
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-2xl p-2">
                <Avatar name="Grace Thompson" size={40} />
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">Grace Thompson</p><p className="text-[12px] text-muted">Wedding coordinator</p></div>
                <Phone className="size-4 text-midnight-300" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Client information" subtitle="Shared on a need-to-know basis" />
            <CardBody>
              <DescList cols={1} items={[
                ["Couple", client ? `${client.partner_one} & ${client.partner_two}` : a.couple],
                ["Planner / day-of contact", q.planner ?? "Provided closer to the date"],
                ["VIPs & family notes", q.vip ?? "—"],
                ["Getting ready", q.getting_ready ?? "—"],
                ["First look", q.first_look ?? "—"],
              ]} />
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas p-3 text-[12px] text-muted"><Lock className="mt-0.5 size-3.5 shrink-0" />Client email, phone and payment details are managed by your coordinator. Use Messages for anything you need.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Your uploads" action={<Link href={`/team/uploads${isVideo ? "/video" : ""}?wedding=${id}`} className="text-sm font-semibold text-midnight-700 hover:underline">Manage</Link>} />
            <CardBody>
              {uploads.length === 0 ? (
                <EmptyState icon={isVideo ? Film : Images} title={past ? "No files uploaded yet" : "Uploads open after the wedding"} description={past ? "Files are due within 48 hours of the wedding." : "You'll upload RAW files and footage here."} className="py-6" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[["Files", uploads.filter((u) => u.status !== "failed").length], ["Failed", uploads.filter((u) => u.status === "failed").length], ["Size", bytes(uploads.filter((u) => u.status !== "failed").reduce((s, u) => s + Number(u.size_bytes), 0))]].map(([k, v]) => (
                      <div key={k as string} className="rounded-xl bg-canvas py-2.5"><p className="text-[11px] text-muted">{k}</p><p className="text-sm font-semibold text-ink">{v}</p></div>
                    ))}
                  </div>
                  <ul className="space-y-1.5 text-[13px]">
                    {uploads.slice(0, 4).map((u) => <li key={u.id} className="flex items-center justify-between gap-2"><span className="truncate text-midnight-700">{u.filename}</span><StatusBadge status={u.status} /></li>)}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          {conversationId && <QuickMessage conversationId={conversationId} />}

          <Card className="p-5">
            <p className="text-[12px] uppercase tracking-wide text-muted">Your pay for this wedding</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{money(a.compensation)}</p>
            <p className="text-[13px] text-muted">{a.coverage_hours} hours{a.travel_miles && a.travel_miles > 100 ? " · mileage reimbursed" : ""}</p>
            <Link href="/team/handbook/rates-mileage-bonuses" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-blush-600 hover:underline"><Heart className="size-3.5" />How pay is calculated</Link>
            <Users className="hidden" />
          </Card>
        </div>
      </div>
    </div>
  );
}
