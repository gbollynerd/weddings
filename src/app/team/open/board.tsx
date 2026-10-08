"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Clock, MapPin, Camera, Video, Navigation, CircleDollarSign, Users, AlertTriangle, CheckCircle2, Search, SlidersHorizontal,
  Timer, Sparkles, XCircle, Undo2, ArrowRight, Info, FileSignature, Gift, Route, ShieldAlert,
} from "lucide-react";
import { Button, ButtonLink, StatusBadge, Badge, Select, Input, EmptyState, Alert, Field, Textarea } from "@/components/ui";
import { Modal, Tabs, useAction, useToast } from "@/components/ui/interactive";
import { acceptOpportunityAction, declineOpportunityAction, undoDeclineAction, withdrawRequestAction, declineOfferAction } from "@/lib/actions/team";
import { SignContractModal } from "@/components/contracts/sign-modal";
import { milesLabel, LONG_DISTANCE_MILES, MILEAGE_FREE_MILES } from "@/lib/geo";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { cn, fmtDate, fmtLong, fmtTime, ago } from "@/lib/utils";
import type { Opportunity } from "@/lib/services/team";

type Item = Omit<Opportunity, "expires_at"> & { expires_at: string | null };
type Tab = "offered" | "available" | "pending" | "accepted" | "closed" | "declined";

export function OpenWeddingsBoard({ items, discipline, homeCity, homeLabel, memberName, initialId, standardsAccepted = true }: { items: Item[]; discipline: "photo" | "video"; homeCity: string; homeLabel: string; memberName: string; initialId?: string; standardsAccepted?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useAction();
  const [tab, setTab] = React.useState<Tab>(() => {
    const init = items.find((i) => i.id === initialId);
    return init?.view_status === "offered" ? "offered" : init?.view_status === "pending" ? "pending" : items.some((i) => i.view_status === "offered") ? "offered" : "available";
  });
  const [q, setQ] = React.useState("");
  const [service, setService] = React.useState<"all" | "photo" | "video">(discipline);
  const [role, setRole] = React.useState<"all" | "lead" | "second">("all");
  const [month, setMonth] = React.useState("all");
  const [maxMiles, setMaxMiles] = React.useState("any");
  const [minPay, setMinPay] = React.useState("0");
  const [sort, setSort] = React.useState<"date" | "pay" | "distance">("date");
  const [showFilters, setShowFilters] = React.useState(false);
  const [detail, setDetail] = React.useState<Item | null>(() => items.find((i) => i.id === initialId) ?? null);
  const [confirm, setConfirm] = React.useState<Item | null>(null);
  const [decline, setDecline] = React.useState<Item | null>(null);
  const [declineReason, setDeclineReason] = React.useState("Not available that day");
  const [declineNote, setDeclineNote] = React.useState("");
  const [declineOffer, setDeclineOffer] = React.useState<Item | null>(null);
  const [success, setSuccess] = React.useState<{ item: Item; status: string; weddingId: string } | null>(null);

  const bucket = (i: Item): Tab => i.view_status === "available" ? "available" : i.view_status === "offered" ? "offered" : i.view_status === "pending" ? "pending" : i.view_status === "accepted" ? "accepted" : i.view_status === "declined" ? "declined" : "closed";
  const counts = items.filter((i) => service === "all" || i.role.endsWith(service) || i.view_status === "offered")
    .reduce((acc, i) => { acc[bucket(i)]++; return acc; }, { offered: 0, available: 0, pending: 0, accepted: 0, closed: 0, declined: 0 } as Record<Tab, number>);
  const miles = (i: Item) => i.distance?.miles ?? null;
  const months = [...new Set(items.map((i) => i.wedding_date.slice(0, 7)))].sort();
  const cities = [...new Set(items.map((i) => `${i.city}, ${i.state}`))].sort();
  const [city, setCity] = React.useState("all");

  const filtered = items
    .filter((i) => bucket(i) === tab)
    .filter((i) => service === "all" || i.role.endsWith(service) || tab === "offered")
    .filter((i) => role === "all" || i.role.startsWith(role))
    .filter((i) => month === "all" || i.wedding_date.startsWith(month))
    .filter((i) => city === "all" || `${i.city}, ${i.state}` === city)
    .filter((i) => maxMiles === "any" || (miles(i) ?? 0) <= Number(maxMiles))
    .filter((i) => i.compensation >= Number(minPay))
    .filter((i) => !q || `${i.couple} ${i.venue_name} ${i.city}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === "pay" ? b.compensation - a.compensation : sort === "distance" ? (miles(a) ?? 1e9) - (miles(b) ?? 1e9) : a.wedding_date.localeCompare(b.wedding_date));

  const activeFilters = [service !== discipline, role !== "all", month !== "all", city !== "all", maxMiles !== "any", minPay !== "0"].filter(Boolean).length;
  const reset = () => { setService(discipline); setRole("all"); setMonth("all"); setCity("all"); setMaxMiles("any"); setMinPay("0"); setQ(""); };

  // The team standards must be accepted before signing for any wedding.
  const startSign = (i: Item) => {
    if (standardsAccepted) { setConfirm(i); return; }
    toast({ tone: "info", title: "Accept the team standards first", body: "It takes a couple of minutes, then you can sign for this wedding." });
    router.push("/team/standards");
  };
  const doDeclineOffer = (i: Item) => run(() => declineOfferAction(i.id, declineNote ? `${declineReason} — ${declineNote}` : declineReason), {
    onSuccess: () => { setDeclineOffer(null); setDetail(null); setDeclineNote(""); router.refresh(); },
  });
  const doDecline = (i: Item) => run(() => declineOpportunityAction(i.id, declineNote ? `${declineReason} — ${declineNote}` : declineReason), {
    onSuccess: () => { setDecline(null); setDetail(null); setDeclineNote(""); router.refresh(); },
  });

  return (
    <div>
      {!standardsAccepted && (
        <Alert tone="danger" icon={ShieldAlert} className="mb-4" title="Accept the team standards to take weddings"
          action={<ButtonLink href="/team/standards" size="sm">Review &amp; accept</ButtonLink>}>
          Our shooting standard, footage tagging, backup rules, insurance and liability terms are now required for every wedding.
        </Alert>
      )}
      <Alert tone="blush" icon={Info} className="mb-6">
        To accept a wedding you&apos;ll sign our contractor agreement for that date, then a coordinator reviews and confirms you — it stays under <b>Pending</b> until then. Make sure the date is <Link href="/team/availability" className="font-semibold underline">marked available</Link> first. Distances are straight-line from {homeLabel}.
      </Alert>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} className="max-w-full overflow-x-auto" items={[
          ...(counts.offered || tab === "offered" ? [{ value: "offered" as Tab, label: "Offered to you", count: counts.offered }] : []),
          { value: "available", label: "Available", count: counts.available },
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "accepted", label: "Accepted", count: counts.accepted },
          { value: "closed", label: "Expired & filled", count: counts.closed },
          { value: "declined", label: "Declined", count: counts.declined },
        ]} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search couple, venue, city" className="h-10 w-56 pl-9" aria-label="Search opportunities" />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 w-auto" aria-label="Sort">
            <option value="date">Soonest first</option><option value="pay">Highest pay</option><option value="distance">Closest</option>
          </Select>
          <Button variant={showFilters || activeFilters ? "secondary" : "outline"} size="md" icon={SlidersHorizontal} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            Filters{activeFilters ? ` · ${activeFilters}` : ""}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="card mb-5 grid gap-4 p-5 animate-pop-in sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Service"><Select value={service} onChange={(e) => setService(e.target.value as typeof service)}><option value="all">All services</option><option value="photo">Photography</option><option value="video">Videography</option></Select></Field>
          <Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}><option value="all">Lead & second</option><option value="lead">Lead only</option><option value="second">Second only</option></Select></Field>
          <Field label="Date"><Select value={month} onChange={(e) => setMonth(e.target.value)}><option value="all">Any month</option>{months.map((m) => <option key={m} value={m}>{fmtDate(m + "-01", "MMMM yyyy")}</option>)}</Select></Field>
          <Field label="Location"><Select value={city} onChange={(e) => setCity(e.target.value)}><option value="all">All locations</option>{cities.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label={`Distance from ${homeCity || "home"}`}><Select value={maxMiles} onChange={(e) => setMaxMiles(e.target.value)}><option value="any">Any distance</option><option value="50">Within 50 mi</option><option value="200">Within 200 mi</option><option value="400">Within 400 mi</option></Select></Field>
          <Field label="Minimum pay"><Select value={minPay} onChange={(e) => setMinPay(e.target.value)}><option value="0">Any</option><option value="500">$500+</option><option value="800">$800+</option><option value="1000">$1,000+</option></Select></Field>
          <div className="flex items-end lg:col-span-6"><Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button></div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={tab === "available" ? Sparkles : CalendarDays}
            title={tab === "available" ? "No open weddings match" : `No ${tab === "closed" ? "expired or filled" : tab} weddings`}
            description={activeFilters || q ? "Try widening your filters." : tab === "available" ? "We'll notify you as soon as a new wedding needs your discipline." : undefined}
            action={activeFilters || q ? <Button variant="outline" onClick={reset}>Clear filters</Button> : undefined} />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((i) => (
            <OpportunityCard key={i.id} item={i} onView={() => setDetail(i)} onAccept={() => startSign(i)} onDecline={() => i.view_status === "offered" ? setDeclineOffer(i) : setDecline(i)}
              onUndo={() => run(() => undoDeclineAction(i.id), { onSuccess: () => router.refresh() })}
              onWithdraw={() => run(() => withdrawRequestAction(i.id), { onSuccess: () => router.refresh() })} pending={pending} />
          ))}
        </div>
      )}

      {/* Details */}
      <Modal open={!!detail} onClose={() => setDetail(null)} size="lg" title={detail ? `${detail.city}, ${detail.state} · ${fmtDate(detail.wedding_date, "MMM d")}` : ""}
        description={detail ? `${ROLE_LABEL[detail.role]} · ${detail.package_name ?? ""}` : ""}
        footer={detail && (detail.view_status === "available" || detail.view_status === "offered") ? (
          <>
            <Button variant="outline" icon={XCircle} onClick={() => detail.view_status === "offered" ? setDeclineOffer(detail) : setDecline(detail)}>{detail.view_status === "offered" ? "Decline offer" : "Decline"}</Button>
            <Button icon={FileSignature} onClick={() => startSign(detail)} disabled={!detail.eligible || detail.conflict || (!!detail.calendar && detail.calendar !== "available")}>Review &amp; sign</Button>
          </>
        ) : <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>}>
        {detail && <DetailBody item={detail} homeLabel={homeLabel} />}
      </Modal>

      {/* Sign the agreement to accept */}
      <SignContractModal assignmentId={confirm?.id ?? null} open={!!confirm} onClose={() => setConfirm(null)} memberName={memberName}
        title={confirm?.view_status === "offered" ? "Sign to confirm this wedding" : "Sign to request this wedding"}
        signLabel={confirm?.view_status === "offered" ? "Sign & confirm" : "Sign & send request"}
        sign={async (sig) => {
          const r = await acceptOpportunityAction(confirm!.id, sig);
          if (!r.ok && r.data?.needsStandards) { setConfirm(null); router.push("/team/standards"); }
          return r;
        }}
        onSigned={(d) => { const i = confirm!; setConfirm(null); setDetail(null); if (d) setSuccess({ item: i, status: d.status, weddingId: d.weddingId }); router.refresh(); }}
        summary={confirm && (
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <p className="font-semibold text-ink">{fmtLong(confirm.wedding_date)}</p>
            <p className="text-muted">{confirm.venue_name} · {confirm.city}, {confirm.state}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge tone="midnight">{ROLE_LABEL[confirm.role]}</Badge><Badge>{confirm.coverage_hours} hours</Badge><Badge tone="success">{money(confirm.compensation)}</Badge>{confirm.distance && <Badge>{milesLabel(confirm.distance)}</Badge>}</div>
            {confirm.calendar !== "available" && <p className="mt-3 flex items-center gap-1.5 text-[12px] text-warning-700"><AlertTriangle className="size-3.5" />This date isn&apos;t marked available yet — we&apos;ll mark it for you.</p>}
          </div>
        )}
        footnote={confirm?.view_status === "offered"
          ? "A coordinator offered you this wedding, so you're confirmed as soon as you sign. Your signed copy is saved with the wedding and you can download it any time."
          : "After you sign, the wedding moves to Pending until a coordinator approves you. If someone else is chosen, the agreement is voided. Your signed copy is saved with the wedding."} />

      {/* Decline */}
      <Modal open={!!decline} onClose={() => setDecline(null)} size="sm" title="Decline this wedding?" description="It will move to your Declined tab. You can restore it any time before it's filled."
        footer={<><Button variant="outline" onClick={() => setDecline(null)}>Cancel</Button><Button variant="danger" loading={pending} onClick={() => decline && doDecline(decline)}>Decline</Button></>}>
        <div className="space-y-4">
          <Field label="Reason (helps coordinators staff better)">
            <Select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}>
              <option>Not available that day</option><option>Too far to travel</option><option>Compensation too low</option><option>Prefer a different role</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Note (optional)"><Textarea value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} className="min-h-[72px]" /></Field>
        </div>
      </Modal>

      {/* Decline an offer */}
      <Modal open={!!declineOffer} onClose={() => setDeclineOffer(null)} size="sm" title="Decline this offer?" description="We'll let the coordinator know so they can find someone else."
        footer={<><Button variant="outline" onClick={() => setDeclineOffer(null)}>Cancel</Button><Button variant="danger" loading={pending} onClick={() => declineOffer && doDeclineOffer(declineOffer)}>Decline offer</Button></>}>
        <div className="space-y-4">
          <Field label="Reason">
            <Select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}>
              <option>Not available that day</option><option>Too far to travel</option><option>Compensation too low</option><option>Prefer a different role</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Note (optional)"><Textarea value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} className="min-h-[72px]" /></Field>
        </div>
      </Modal>

      {/* Success */}
      <Modal open={!!success} onClose={() => setSuccess(null)} size="sm">
        {success && (
          <div className="py-4 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-success-50 text-success-500 animate-pop-in"><CheckCircle2 className="size-8" /></div>
            <h3 className="mt-4 text-xl font-semibold text-ink">{success.status === "pending" ? "Signed — pending approval" : "You're booked!"}</h3>
            <p className="mt-1 text-sm text-muted">
              {success.status === "pending" ? "Your signed agreement is saved. A coordinator will review your request and we'll notify you as soon as you're confirmed." : `${success.item.couple} · ${fmtDate(success.item.wedding_date, "EEEE, MMM d")}. The full timeline and shot list are ready for you.`}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={() => { setSuccess(null); setTab("available"); toast({ tone: "info", title: "Keep browsing open weddings" }); }}>Keep browsing</Button>
              {success.status === "pending"
                ? <Button icon={ArrowRight} onClick={() => { setSuccess(null); setTab("pending"); }}>See pending</Button>
                : <ButtonLink href={`/team/weddings/${success.weddingId}`} icon={ArrowRight}>View wedding</ButtonLink>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function OpportunityCard({ item: i, onView, onAccept, onDecline, onUndo, onWithdraw, pending }: { item: Item; onView: () => void; onAccept: () => void; onDecline: () => void; onUndo: () => void; onWithdraw: () => void; pending: boolean }) {
  const isPhoto = i.role.endsWith("photo");
  const closingSoon = i.view_status === "available" && i.expires_at && new Date(i.expires_at).getTime() - Date.now() < 7 * 86400000;
  const open = i.view_status === "available" || i.view_status === "offered";
  const muted = ["expired", "filled", "declined"].includes(i.view_status);
  return (
    <article className={cn("card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]", muted && "opacity-75")}>
      <div className="flex items-start gap-4 p-5">
        <div className={cn("w-16 shrink-0 overflow-hidden rounded-2xl bg-white text-center shadow-sm ring-1", muted ? "ring-line" : "ring-blush-100")} aria-label={fmtDate(i.wedding_date, "EEEE, MMMM d")}>
          <div className={cn("py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", muted ? "bg-midnight-50 text-muted" : "bg-blush-400 text-white")}>{fmtDate(i.wedding_date, "MMM")}</div>
          <div className={cn("pt-1.5 font-serif text-[26px] leading-none", muted ? "text-muted" : "text-ink")}>{fmtDate(i.wedding_date, "d")}</div>
          <div className="pb-2 pt-1 text-[10px] font-medium uppercase tracking-wide text-muted">{fmtDate(i.wedding_date, "EEE")}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-ink">{i.city}, {i.state}</h3>
            {i.view_status === "offered" ? <Badge tone="blush"><Gift className="size-3" />Offered to you</Badge> : <StatusBadge status={i.view_status === "available" ? "open" : i.view_status} />}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted">{i.venue_name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={isPhoto ? "blush" : "info"}>{isPhoto ? <Camera className="size-3" /> : <Video className="size-3" />}{ROLE_LABEL[i.role]}</Badge>
            {closingSoon && <Badge tone="warning"><Timer className="size-3" />Closes {ago(i.expires_at!)}</Badge>}
            {open && (i.distance?.miles ?? 0) > LONG_DISTANCE_MILES && <Badge><Route className="size-3" />Long-distance</Badge>}
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-line bg-canvas/50 px-5 py-4 text-[13px]">
        <div className="flex items-center gap-2 text-midnight-600"><Clock className="size-4 text-midnight-300" />{fmtTime(i.call_time)} · {i.coverage_hours}h</div>
        <div className="flex items-center gap-2 font-semibold text-success-700"><CircleDollarSign className="size-4" />{money(i.compensation)} <span className="font-normal text-muted">(${i.hourly}/hr)</span></div>
        <div className="flex items-center gap-2 text-midnight-600" title="Straight-line distance"><Navigation className="size-4 text-midnight-300" />{i.distance ? `${milesLabel(i.distance)} away` : "—"}</div>
        <div className="flex items-center gap-2 text-midnight-600"><Users className="size-4 text-midnight-300" />{i.guest_count ?? "—"} guests</div>
      </dl>
      <div className="flex-1 px-5 py-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Requirements</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">{i.requirements.map((r) => <li key={r} className="rounded-lg bg-midnight-50 px-2 py-1 text-[12px] text-midnight-600">{r}</li>)}</ul>
        {open && i.conflict && <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-danger-500"><AlertTriangle className="size-3.5" />You&apos;re already booked this day</p>}
        {open && !i.conflict && i.calendar && i.calendar !== "available" && <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-warning-700"><AlertTriangle className="size-3.5" />Marked {i.calendar} on your calendar</p>}
        {!i.eligible && i.view_status === "available" && <p className="mt-3 text-[12px] text-muted">Open to {i.role.endsWith("photo") ? "photographers" : "videographers"} only.</p>}
      </div>
      <div className="flex gap-2 px-5 pb-5">
        {open && (
          <Button variant="ghost" size="icon" onClick={onDecline} aria-label="Decline" title="Decline" className="shrink-0 border border-danger-500/25 text-danger-500 hover:border-danger-500/40 hover:bg-danger-50 hover:text-danger-500"><XCircle className="size-5" /></Button>
        )}
        <Button variant="outline" className="flex-1" onClick={onView}>View details</Button>
        {open && (
          <Button className="flex-1" onClick={onAccept} disabled={!i.eligible || i.conflict || (!!i.calendar && i.calendar !== "available")}>{i.view_status === "offered" ? "Review & sign" : "Accept"}</Button>
        )}
        {i.view_status === "declined" && <Button variant="secondary" className="flex-1" icon={Undo2} onClick={onUndo} loading={pending}>Restore</Button>}
        {i.view_status === "pending" && <Button variant="secondary" className="flex-1" onClick={onWithdraw} loading={pending}>Withdraw request</Button>}
        {i.view_status === "accepted" && <ButtonLink href={`/team/weddings/${i.wedding_id}`} className="flex-1">Open wedding</ButtonLink>}
      </div>
    </article>
  );
}

function DetailBody({ item: i, homeLabel }: { item: Item; homeLabel: string }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [CalendarDays, "Date", fmtLong(i.wedding_date)],
          [Clock, "Call time", `${fmtTime(i.call_time)} · ${i.coverage_hours} hours`],
          [CircleDollarSign, "Compensation", `${money(i.compensation)} ($${i.hourly}/hr)`],
          [MapPin, i.reception_venue_name ? "Venues" : "Venue", `${i.venue_name}${i.venue_address ? ` — ${i.venue_address}` : ""}${i.reception_venue_name ? ` · Reception at ${i.reception_venue_name}` : ""}`],
          [Navigation, "Distance", i.distance ? `${milesLabel(i.distance)} from ${homeLabel}${i.mileage ? ` · ${money(i.mileage)} mileage` : ` · mileage after ${MILEAGE_FREE_MILES} mi`}` : "—"],
          [Users, "Guests", `${i.guest_count ?? "—"} · ${i.wedding_type ?? ""}`],
        ].map(([I, k, v], idx) => {
          const Icon = I as typeof Clock;
          return (
            <div key={idx} className="rounded-2xl bg-canvas p-3.5">
              <p className="flex items-center gap-1.5 text-[12px] text-muted"><Icon className="size-3.5" />{k as string}</p>
              <p className="mt-1 text-sm font-medium text-ink">{v as string}</p>
            </div>
          );
        })}
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">Requirements</p>
        <ul className="mt-2 space-y-1.5 text-sm text-midnight-700">{i.requirements.map((r) => <li key={r} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success-500" />{r}</li>)}</ul>
      </div>
      {i.notes && <Alert tone="info" icon={Info} title="Coordinator notes">{i.notes}</Alert>}
      <div>
        <p className="text-sm font-semibold text-ink">Wedding team</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex justify-between rounded-xl border border-dashed border-blush-300 bg-blush-50 px-3 py-2"><span className="font-medium text-blush-700">{ROLE_LABEL[i.role]}</span><span className="text-blush-600">This opening</span></li>
          {i.team.map((t, k) => <li key={k} className="flex justify-between rounded-xl bg-canvas px-3 py-2"><span className="text-midnight-700">{ROLE_LABEL[t.role]}</span><span className="text-muted">{t.name ?? "Filled"}</span></li>)}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-muted">Your calendar:</span>
        {i.conflict ? <StatusBadge status="booked" label="Already booked" /> : i.calendar ? <StatusBadge status={i.calendar} /> : <Badge>Not set</Badge>}
        {i.expires_at && i.view_status === "available" && <span className="text-muted">· Offer closes {ago(i.expires_at)}</span>}
      </div>
    </div>
  );
}
