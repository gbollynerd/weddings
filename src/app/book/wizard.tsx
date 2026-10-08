"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin, CalendarDays, Camera, Video, Sparkles, Check, ChevronLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle, XCircle, Plus, Minus,
  Users, Clock, Lock, CreditCard, ShieldCheck, Info, Columns3, Heart, Mail, LogIn, UserPlus, Building2,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, Field, Input, Select, Textarea, Alert, Badge, Checkbox, buttonClass } from "@/components/ui";
import { Modal, Tabs, useToast } from "@/components/ui/interactive";
import { AddressInput } from "@/components/ui/address-input";
import { WEDDING_TYPES } from "@/content/wedding-types";
import { checkAvailabilityAction, createBookingAction } from "@/lib/actions/booking";
import { signupClient, loginInline, logoutAction } from "@/lib/actions/auth";
import { EmailSuggestion } from "@/components/ui/email-hint";
import { Markdown } from "@/components/markdown";
import { SERVICE_AGREEMENT, CANCELLATION_POLICY, type ClientTerm } from "@/content/client-terms";
import { emailError, confirmError } from "@/lib/validation";
import { quote, marketPrice, money, DEPOSIT_RATE } from "@/lib/pricing";
import { cn, fmtDate, fmtLong } from "@/lib/utils";
import type { Market, Package, Addon } from "@/lib/services/catalog";

type Catalog = { markets: Market[]; packages: Package[]; addons: Addon[]; services: { slug: string; name: string; tagline: string; description: string }[]; venues: { id: string; name: string; address: string; kind: string; market: string }[] };
type Me = { role: string; name: string; email: string; phone: string; partnerOne: string; partnerTwo: string } | null;
type Service = "photo" | "video" | "both";
type Avail = { level: "available" | "limited" | "full" | "unknown"; remaining: number; suggestions: string[]; peak?: boolean } | null;
type Details = { partnerOne: string; partnerTwo: string; email: string; phone: string; ceremony: string; reception: string; guests: string; weddingType: string; startTime: string; requests: string; notes: string };
type Draft = { state: string; market: string; date: string; venue: string; venueAddress: string; service: Service | ""; pkg: string; addons: Record<string, number>; details: Details; plan: "deposit" | "full" | "installments" };

const STEPS = ["Location", "Service", "Package", "Add-ons", "Details", "Account", "Payment"] as const;
const KEY = "vw-booking-draft";
const emptyDetails: Details = { partnerOne: "", partnerTwo: "", email: "", phone: "", ceremony: "", reception: "", guests: "", weddingType: "", startTime: "15:00", requests: "", notes: "" };
const SERVICE_META: Record<Service, { icon: typeof Camera; img: string }> = { photo: { icon: Camera, img: "📷" }, video: { icon: Video, img: "🎬" }, both: { icon: Sparkles, img: "✨" } };

export function BookingWizard({ catalog, me: initialMe, initial }: { catalog: Catalog; me: Me; initial: { market?: string; date?: string; service?: Service; pkg?: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = React.useState<Me>(initialMe);
  const [step, setStep] = React.useState(0);
  const [hydrated, setHydrated] = React.useState(false);
  const initialMarket = catalog.markets.find((m) => m.slug === initial.market);
  const [d, setD] = React.useState<Draft>({
    state: initialMarket?.state ?? "", market: initialMarket?.slug ?? "", date: initial.date ?? "", venue: "", venueAddress: "",
    service: initial.service && ["photo", "video", "both"].includes(initial.service) ? initial.service : "", pkg: initial.pkg ?? "", addons: {},
    details: { ...emptyDetails, partnerOne: initialMe?.partnerOne ?? "", partnerTwo: initialMe?.partnerTwo ?? "", email: initialMe?.email ?? "", phone: initialMe?.phone ?? "" }, plan: "deposit",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [addrTrusted, setAddrTrusted] = React.useState(false);
  const [avail, setAvail] = React.useState<Avail>(null);
  const [checking, setChecking] = React.useState(false);
  const [compare, setCompare] = React.useState(false);
  const topRef = React.useRef<HTMLDivElement>(null);

  // Restore an in-progress draft (per browser tab)
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved && !initial.market && !initial.service && !initial.pkg && !initial.date) {
        const s = JSON.parse(saved) as { d: Draft; step: number };
        setD((cur) => ({ ...s.d, details: { ...s.d.details, email: s.d.details.email || cur.details.email } }));
        setStep(Math.min(s.step, 6));
      }
    } catch {}
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (hydrated) try { sessionStorage.setItem(KEY, JSON.stringify({ d, step })); } catch {} }, [d, step, hydrated]);

  const market = catalog.markets.find((m) => m.slug === d.market);
  const mult = market?.price_multiplier ?? 1;
  const pkg = catalog.packages.find((p) => p.slug === d.pkg && p.service_slug === d.service);
  const addonLines = catalog.addons.filter((a) => (d.addons[a.slug] ?? 0) > 0 && d.service && a.applies_to.includes(d.service)).map((a) => ({ slug: a.slug, name: a.name, price: a.price, unit: a.unit, quantity: d.addons[a.slug] }));
  const q = pkg ? quote({ packageBase: pkg.base_price, multiplier: mult, addons: addonLines }) : null;
  const minDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const states = [...new Map(catalog.markets.map((m) => [m.state, m.state_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  // Availability
  React.useEffect(() => {
    if (!d.market || !d.date || d.date < minDate) { setAvail(null); return; }
    let live = true;
    setChecking(true);
    checkAvailabilityAction(d.market, d.date, (d.service || "photo") as Service).then((r) => { if (live) setAvail(r as Avail); }).finally(() => live && setChecking(false));
    return () => { live = false; };
  }, [d.market, d.date, d.service]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };
  const setDetail = (k: keyof Details, v: string) => { setD((x) => ({ ...x, details: { ...x.details, [k]: v } })); setErrors((e) => ({ ...e, [k]: "" })); };

  const accountStep = 5;
  const needsAccount = !me || me.role !== "client";
  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!d.state) e.state = "Choose a state";
      if (!d.market) e.market = "Choose the nearest city";
      if (!d.date) e.date = "Choose your wedding date";
      else if (d.date < minDate) e.date = "Dates must be at least 14 days away";
      if (d.venue.trim().length < 2) e.venue = "Enter your venue (or “Not booked yet”)";
      if (avail?.level === "full") e.date = "This date is fully booked — try a suggested date";
    }
    if (s === 1 && !d.service) e.service = "Choose a service";
    if (s === 2 && !pkg) e.pkg = "Choose a package";
    if (s === 4) {
      const x = d.details;
      if (x.partnerOne.trim().length < 2) e.partnerOne = "Required";
      if (x.partnerTwo.trim().length < 2) e.partnerTwo = "Required";
      { const ee = emailError(x.email); if (ee) e.email = ee; }
      if (x.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a 10-digit phone number";
      if (x.ceremony.trim().length < 2) e.ceremony = "Where is the ceremony?";
      if (!x.guests || Number(x.guests) < 2) e.guests = "Estimated guest count";
      if (!x.weddingType) e.weddingType = "Choose one";
    }
    return e;
  };
  const go = (to: number) => { setStep(to); setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 10); };
  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) { toast({ tone: "error", title: "Please complete the highlighted fields" }); return; }
    let to = step + 1;
    if (to === accountStep && !needsAccount) to++;
    go(to);
  };
  const back = () => { let to = step - 1; if (to === accountStep && !needsAccount) to--; go(Math.max(0, to)); };

  return (
    <div className="min-h-screen bg-porcelain" ref={topRef}>
      <header className="sticky top-0 z-40 border-b border-line bg-porcelain/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-8">
          <Logo />
          <ol className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Booking progress">
            {STEPS.map((s, i) => {
              if (i === accountStep && !needsAccount) return null;
              const done = i < step, cur = i === step;
              return (
                <li key={s} className="flex items-center gap-1">
                  <button disabled={i > step} onClick={() => go(i)} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium transition", cur ? "bg-midnight-900 text-white" : done ? "text-midnight-700 hover:bg-midnight-50" : "text-midnight-300")} aria-current={cur ? "step" : undefined}>
                    <span className={cn("grid size-5 place-items-center rounded-full text-[11px]", cur ? "bg-white/20" : done ? "bg-success-500 text-white" : "bg-midnight-50")}>{done ? <Check className="size-3" /> : i + 1}</span>{s}
                  </button>
                  {i < STEPS.length - 1 && <span className="h-px w-3 bg-line" />}
                </li>
              );
            })}
          </ol>
          <p className="ml-auto text-sm text-muted lg:hidden">Step {step + 1 - (step > accountStep && !needsAccount ? 1 : 0)} of {needsAccount ? 7 : 6}</p>
        </div>
        <div className="h-1 bg-midnight-50 lg:hidden"><div className="h-full bg-blush-400 transition-all" style={{ width: `${((step + 1) / 7) * 100}%` }} /></div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-32 pt-8 sm:px-8 lg:grid-cols-[1fr_380px] lg:pb-16">
        <main className="min-w-0">
          {step > 0 && <button onClick={back} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft className="size-4" />Back</button>}

          {step === 0 && (
            <Section title="Tell us where you're getting married" subtitle="We'll check availability for your date and show your local pricing.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country"><Select value="US" onChange={() => {}}><option value="US">United States</option></Select></Field>
                <Field label="State" error={errors.state} required>
                  <Select value={d.state} onChange={(e) => { set("state", e.target.value); set("market", ""); }} aria-invalid={!!errors.state}>
                    <option value="">Select a state…</option>{states.map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
                  </Select>
                </Field>
                <Field label="Nearest city" error={errors.market} required hint="No travel fees inside each city's service area.">
                  <Select value={d.market} onChange={(e) => set("market", e.target.value)} disabled={!d.state} aria-invalid={!!errors.market}>
                    <option value="">{d.state ? "Select a city…" : "Choose a state first"}</option>
                    {catalog.markets.filter((m) => m.state === d.state).map((m) => <option key={m.slug} value={m.slug}>{m.city}</option>)}
                  </Select>
                </Field>
                <Field label="Wedding date" error={errors.date} required>
                  <Input type="date" min={minDate} value={d.date} onChange={(e) => set("date", e.target.value)} aria-invalid={!!errors.date} />
                </Field>
                <Field label="Venue" error={errors.venue} required className="sm:col-span-2">
                  <Input list="venues" value={d.venue} onChange={(e) => { set("venue", e.target.value); const v = catalog.venues.find((x) => x.name === e.target.value); if (v) { set("venueAddress", v.address); setAddrTrusted(true); } }} placeholder="Venue name — or “Not booked yet”" aria-invalid={!!errors.venue} />
                  <datalist id="venues">{catalog.venues.filter((v) => v.market === d.market).map((v) => <option key={v.id} value={v.name}>{v.kind}</option>)}<option value="Not booked yet" /></datalist>
                </Field>
                <Field label="Venue address" className="sm:col-span-2" htmlFor="bk-address"><AddressInput id="bk-address" value={d.venueAddress} onChange={(v) => { set("venueAddress", v); setAddrTrusted(false); }} trusted={addrTrusted} hint="Optional — helps us plan travel" placeholder="Start typing the street address" /></Field>
              </div>
              <AvailabilityCard avail={avail} checking={checking} date={d.date} city={market ? `${market.city}, ${market.state}` : ""} onPick={(x) => set("date", x)} />
              <p className="mt-4 text-[13px] text-muted">Getting married somewhere else? <Link href="mailto:hello@visualweddings.example" className="font-medium text-blush-600 underline">Ask about destination weddings</Link>.</p>
            </Section>
          )}

          {step === 1 && (
            <Section title="What would you like captured?" subtitle={`Prices for ${market?.city ?? "your city"}. You can add extras in the next steps.`}>
              {errors.service && <Alert tone="danger" className="mb-4">{errors.service}</Alert>}
              <div className="grid gap-4 md:grid-cols-3">
                {catalog.services.map((s) => {
                  const svc = s.slug as Service;
                  const I = SERVICE_META[svc].icon;
                  const from = Math.min(...catalog.packages.filter((p) => p.service_slug === svc).map((p) => marketPrice(p.base_price, mult)));
                  const on = d.service === svc;
                  return (
                    <button key={s.slug} onClick={() => { set("service", svc); if (pkg?.service_slug !== svc) set("pkg", ""); }} aria-pressed={on}
                      className={cn("relative flex flex-col rounded-3xl border-2 bg-white p-6 text-left transition hover:-translate-y-0.5", on ? "border-midnight-900 shadow-[var(--shadow-pop)]" : "border-line hover:border-midnight-200")}>
                      {svc === "both" && <span className="absolute -top-3 right-5 rounded-full bg-blush-400 px-2.5 py-0.5 text-[11px] font-semibold text-white">Most popular</span>}
                      <span className={cn("grid size-12 place-items-center rounded-2xl", on ? "bg-midnight-900 text-white" : "bg-blush-50 text-blush-500")}><I className="size-6" /></span>
                      <p className="mt-5 font-serif text-xl text-ink">{s.name}</p>
                      <p className="mt-1 flex-1 text-sm text-muted">{s.description}</p>
                      <p className="mt-5 text-sm text-midnight-700">From <span className="text-lg font-semibold text-ink">{money(from)}</span></p>
                      {on && <CheckCircle2 className="absolute right-5 top-5 size-6 text-midnight-900" />}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title="Choose your package" subtitle="Everything included is listed — no hidden fees." action={<Button variant="outline" size="sm" icon={Columns3} onClick={() => setCompare(true)}>Compare packages</Button>}>
              {errors.pkg && <Alert tone="danger" className="mb-4">{errors.pkg}</Alert>}
              <div className="grid gap-5 xl:grid-cols-3">
                {catalog.packages.filter((p) => p.service_slug === d.service).map((p) => {
                  const on = d.pkg === p.slug;
                  return (
                    <div key={p.slug} className={cn("relative flex flex-col rounded-3xl border-2 bg-white p-6 transition", on ? "border-midnight-900 shadow-[var(--shadow-pop)]" : "border-line")}>
                      {p.popular && <span className="absolute -top-3 left-6 rounded-full bg-blush-400 px-2.5 py-0.5 text-[11px] font-semibold text-white">Most popular</span>}
                      <p className="font-serif text-2xl text-ink">{p.name}</p>
                      <p className="text-sm text-muted">{p.tagline}</p>
                      <p className="mt-4 text-3xl font-semibold text-ink">{money(marketPrice(p.base_price, mult))}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
                        <Spec icon={Clock} label={`${p.hours} hours`} />
                        <Spec icon={Users} label={[p.photographers && `${p.photographers} photo`, p.videographers && `${p.videographers} video`].filter(Boolean).join(" + ")} />
                        <Spec icon={CalendarDays} label={`~${Math.round(p.turnaround_days / 7)} wk delivery`} />
                        <Spec icon={Heart} label={`${p.deliverables.length} deliverables`} />
                      </div>
                      <ul className="mt-5 flex-1 space-y-2 text-sm text-midnight-700">
                        {[...p.deliverables, ...p.features.filter((f) => !f.includes("hours") && !f.includes("Gallery") && !f.includes("Film in"))].map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success-500" />{f}</li>)}
                      </ul>
                      <Button className="mt-6" variant={on ? "primary" : "outline"} onClick={() => set("pkg", p.slug)} icon={on ? CheckCircle2 : undefined}>{on ? "Selected" : "Select package"}</Button>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title="Make it yours" subtitle="Optional extras — add as many or as few as you like.">
              <div className="grid gap-3 md:grid-cols-2">
                {catalog.addons.filter((a) => d.service && a.applies_to.includes(d.service)).map((a) => {
                  const qty = d.addons[a.slug] ?? 0;
                  const included = pkg && ((a.slug === "second-photographer" && pkg.photographers >= 2) || (a.slug === "engagement-session" && pkg.features.some((f) => f.includes("Engagement"))) || (a.slug === "drone-coverage" && pkg.deliverables.some((f) => f.includes("Drone"))) || (a.slug === "heirloom-album" && pkg.deliverables.some((f) => f.includes("album"))));
                  return (
                    <div key={a.slug} className={cn("flex items-start gap-4 rounded-2xl border-2 bg-white p-5 transition", qty ? "border-midnight-900" : "border-line", included && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{a.name}</p>
                        <p className="text-[13px] text-muted">{a.description}</p>
                        <p className="mt-2 text-sm font-semibold text-ink">{included ? <Badge tone="success">Included in {pkg?.name}</Badge> : <>+{money(marketPrice(a.price, mult))}{a.unit === "hour" && <span className="font-normal text-muted"> / hour</span>}</>}</p>
                      </div>
                      {!included && (a.unit === "hour" ? (
                        <div className="flex items-center gap-1 rounded-xl border border-line p-1">
                          <button onClick={() => set("addons", { ...d.addons, [a.slug]: Math.max(0, qty - 1) })} className="grid size-8 place-items-center rounded-lg hover:bg-canvas disabled:opacity-40" disabled={!qty} aria-label={`Fewer ${a.name}`}><Minus className="size-4" /></button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button onClick={() => set("addons", { ...d.addons, [a.slug]: Math.min(4, qty + 1) })} className="grid size-8 place-items-center rounded-lg hover:bg-canvas" aria-label={`More ${a.name}`}><Plus className="size-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => set("addons", { ...d.addons, [a.slug]: qty ? 0 : 1 })} aria-pressed={!!qty}
                          className={cn("grid size-9 shrink-0 place-items-center rounded-full border-2 transition", qty ? "border-midnight-900 bg-midnight-900 text-white" : "border-midnight-200 text-midnight-400 hover:border-midnight-400")} aria-label={`${qty ? "Remove" : "Add"} ${a.name}`}>
                          {qty ? <Check className="size-4" /> : <Plus className="size-4" />}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="Tell us about your wedding" subtitle="This helps us build the right team and timeline. You can update details later in your dashboard.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.partnerOne} required><Input value={d.details.partnerOne} onChange={(e) => setDetail("partnerOne", e.target.value)} autoComplete="name" aria-invalid={!!errors.partnerOne} /></Field>
                <Field label="Partner's name" error={errors.partnerTwo} required><Input value={d.details.partnerTwo} onChange={(e) => setDetail("partnerTwo", e.target.value)} aria-invalid={!!errors.partnerTwo} /></Field>
                <Field label="Email" error={errors.email} required><div className="space-y-1.5"><Input type="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={d.details.email} onChange={(e) => setDetail("email", e.target.value)} autoComplete="email" aria-invalid={!!errors.email} /><EmailSuggestion value={d.details.email} onAccept={(v) => setDetail("email", v)} /></div></Field>
                <Field label="Phone" error={errors.phone} required><Input type="tel" value={d.details.phone} onChange={(e) => setDetail("phone", e.target.value)} autoComplete="tel" placeholder="(704) 555-0123" aria-invalid={!!errors.phone} /></Field>
                <Field label="Wedding date"><Input value={d.date ? fmtLong(d.date) : ""} disabled /></Field>
                <Field label="Venue"><Input value={d.venue} disabled /></Field>
                <Field label="Ceremony location" error={errors.ceremony} required><Input value={d.details.ceremony} onChange={(e) => setDetail("ceremony", e.target.value)} placeholder={d.venue !== "Not booked yet" ? `${d.venue} — garden` : "Church, garden, same venue…"} aria-invalid={!!errors.ceremony} /></Field>
                <Field label="Reception location"><Input value={d.details.reception} onChange={(e) => setDetail("reception", e.target.value)} placeholder="Same as ceremony" /></Field>
                <Field label="Guest count" error={errors.guests} required><Input type="number" min={2} value={d.details.guests} onChange={(e) => setDetail("guests", e.target.value)} aria-invalid={!!errors.guests} /></Field>
                <Field label="Wedding type" error={errors.weddingType} required>
                  <Select value={d.details.weddingType} onChange={(e) => setDetail("weddingType", e.target.value)} aria-invalid={!!errors.weddingType}>
                    <option value="">Select…</option>{WEDDING_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Approximate start time" hint="When you'd like coverage to begin"><Input type="time" value={d.details.startTime} onChange={(e) => setDetail("startTime", e.target.value)} /></Field>
                <div />
                <Field label="Special requests" className="sm:col-span-2" hint="Family notes, cultural traditions, must-have shots, accessibility needs."><Textarea value={d.details.requests} onChange={(e) => setDetail("requests", e.target.value)} /></Field>
                <Field label="Timeline / notes" className="sm:col-span-2"><Textarea value={d.details.notes} onChange={(e) => setDetail("notes", e.target.value)} placeholder="Anything else we should know?" /></Field>
              </div>
            </Section>
          )}

          {step === 5 && (
            <AccountStep me={me} details={d.details} onDone={(m) => { setMe(m); toast({ tone: "success", title: `Welcome, ${m.partnerOne.split(" ")[0]}!` }); go(6); router.refresh(); }} />
          )}

          {step === 6 && q && pkg && market && (
            <PaymentStep plan={d.plan} setPlan={(p) => set("plan", p)} q={q} date={d.date}
              onPay={async (card) => {
                const r = await createBookingAction({ market: d.market, date: d.date, venue: d.venue, venueAddress: d.venueAddress, service: d.service as Service, pkg: d.pkg, addons: d.addons, details: { ...d.details, guests: Number(d.details.guests) }, plan: d.plan } as never, card);
                if (r.ok) { try { sessionStorage.removeItem(KEY); } catch {} router.push(`/book/confirmation/${r.data!.bookingNumber}`); }
                return r;
              }} />
          )}

          {step < 5 && (
            <div className="mt-8 hidden justify-end lg:flex">
              <Button size="lg" className="rounded-full px-8" onClick={next}>Continue <ArrowRight className="size-4" /></Button>
            </div>
          )}
        </main>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Summary d={d} market={market} pkg={pkg} q={q} addonLines={addonLines} mult={mult} onEdit={go} />
        </aside>
      </div>

      {step < 5 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-4">
            <div className="flex-1"><p className="text-[12px] text-muted">{q ? "Total" : "Estimated from"}</p><p className="text-lg font-semibold text-ink">{q ? money(q.total) : "—"}</p></div>
            <Button size="lg" className="rounded-full px-7" onClick={next}>Continue <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      )}

      <Modal open={compare} onClose={() => setCompare(false)} size="xl" title="Compare packages" description={`${catalog.services.find((s) => s.slug === d.service)?.name} · ${market?.city ?? ""} pricing`}>
        <CompareTable packages={catalog.packages.filter((p) => p.service_slug === d.service)} mult={mult} selected={d.pkg} onSelect={(s) => { set("pkg", s); setCompare(false); }} />
      </Modal>
    </div>
  );
}

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="animate-pop-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-serif text-3xl text-ink sm:text-4xl">{title}</h1>{subtitle && <p className="mt-2 text-muted">{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Spec({ icon: I, label }: { icon: typeof Clock; label: string }) {
  return <span className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-canvas px-2.5 py-1.5 text-midnight-700"><I className="size-3.5 text-midnight-400" />{label}</span>;
}

function AvailabilityCard({ avail, checking, date, city, onPick }: { avail: Avail; checking: boolean; date: string; city: string; onPick: (d: string) => void }) {
  if (!date || !city) return null;
  if (checking) return <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-5 text-sm text-muted"><Loader2 className="size-5 animate-spin" />Checking availability in {city}…</div>;
  if (!avail || avail.level === "unknown") return null;
  const map = {
    available: { tone: "border-success-500/30 bg-success-50", icon: <CheckCircle2 className="size-6 text-success-500" />, title: `Great news — ${fmtDate(date, "EEEE, MMMM d")} is available in ${city}.`, body: "Reserve today to lock in your team." },
    limited: { tone: "border-warning-500/30 bg-warning-50", icon: <AlertTriangle className="size-6 text-warning-500" />, title: `Limited availability — only ${avail.remaining} team${avail.remaining > 1 ? "s" : ""} left for ${fmtDate(date, "MMMM d")}.`, body: avail.peak ? "Saturdays in season book quickly." : "Book soon to secure your date." },
    full: { tone: "border-danger-500/30 bg-danger-50", icon: <XCircle className="size-6 text-danger-500" />, title: `${fmtDate(date, "MMMM d")} is fully booked in ${city}.`, body: "Try one of these nearby dates:" },
  }[avail.level];
  return (
    <div className={cn("mt-6 flex items-start gap-4 rounded-2xl border p-5 animate-pop-in", map.tone)} role="status">
      {map.icon}
      <div className="flex-1">
        <p className="font-semibold text-ink">{map.title}</p>
        <p className="text-sm text-midnight-600">{map.body}</p>
        {avail.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {avail.suggestions.map((s) => <button key={s} onClick={() => onPick(s)} className="rounded-full border border-line bg-white px-3 py-1 text-[13px] font-medium text-midnight-700 hover:border-midnight-300">{fmtDate(s, "EEE, MMM d")}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ d, market, pkg, q, addonLines, mult, onEdit }: { d: Draft; market?: Market; pkg?: Package; q: ReturnType<typeof quote> | null; addonLines: { slug: string; name: string; price: number; unit: string; quantity: number }[]; mult: number; onEdit: (s: number) => void }) {
  return (
    <div className="hidden overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ring-1 ring-line lg:block">
      <div className="bg-midnight-900 p-6 text-white">
        <p className="text-[12px] uppercase tracking-wide text-white/50">Your booking</p>
        <p className="mt-1 font-serif text-2xl">{d.details.partnerOne && d.details.partnerTwo ? `${d.details.partnerOne.split(" ")[0]} & ${d.details.partnerTwo.split(" ")[0]}` : "Your wedding"}</p>
        <div className="mt-4 space-y-2 text-sm text-white/80">
          <p className="flex items-center gap-2"><MapPin className="size-4 text-blush-300" />{market ? `${market.city}, ${market.state}` : "Location"}</p>
          <p className="flex items-center gap-2"><CalendarDays className="size-4 text-blush-300" />{d.date ? fmtDate(d.date, "EEE, MMMM d, yyyy") : "Date"}</p>
          {d.venue && <p className="flex items-center gap-2"><Building2 className="size-4 text-blush-300" />{d.venue}</p>}
        </div>
      </div>
      <div className="space-y-4 p-6 text-sm">
        {pkg ? (
          <>
            <Row label={<button onClick={() => onEdit(2)} className="text-left hover:underline">{pkg.name} package<span className="block text-[12px] text-muted">{pkg.hours} hrs · {[pkg.photographers && `${pkg.photographers} photographer${pkg.photographers > 1 ? "s" : ""}`, pkg.videographers && `${pkg.videographers} videographer${pkg.videographers > 1 ? "s" : ""}`].filter(Boolean).join(", ")}</span></button>} value={money(q!.packagePrice)} />
            {addonLines.map((a) => <Row key={a.slug} label={<button onClick={() => onEdit(3)} className="hover:underline">{a.name}{a.quantity > 1 ? ` × ${a.quantity}` : ""}</button>} value={`+${money(marketPrice(a.price, mult) * a.quantity)}`} />)}
            <div className="border-t border-dashed border-line pt-4">
              <Row label={<span className="font-semibold text-ink">Total</span>} value={<span className="text-lg font-semibold text-ink">{money(q!.total)}</span>} />
              <Row label={`Due today (${Math.round(DEPOSIT_RATE * 100)}% deposit)`} value={money(q!.deposit)} muted />
              <Row label="Remaining balance" value={money(q!.balance)} muted />
            </div>
          </>
        ) : <p className="text-muted">Choose a service and package to see your price.</p>}
        <div className="flex items-start gap-2 rounded-2xl bg-canvas p-3 text-[12px] text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success-500" />Free date changes up to 90 days before your wedding. Deposits are fully refundable within 7 days of booking.</div>
      </div>
    </div>
  );
}
const Row = ({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) => (
  <div className={cn("flex items-start justify-between gap-4 py-1", muted && "text-muted")}><span className="text-midnight-700">{label}</span><span className="shrink-0 font-medium">{value}</span></div>
);

function CompareTable({ packages, mult, selected, onSelect }: { packages: Package[]; mult: number; selected: string; onSelect: (s: string) => void }) {
  const rows: [string, (p: Package) => React.ReactNode][] = [
    ["Price", (p) => <b className="text-ink">{money(marketPrice(p.base_price, mult))}</b>],
    ["Coverage", (p) => `${p.hours} hours`],
    ["Photographers", (p) => p.photographers || "—"],
    ["Videographers", (p) => p.videographers || "—"],
    ["Turnaround", (p) => `~${Math.round(p.turnaround_days / 7)} weeks`],
    ...[...new Set(packages.flatMap((p) => [...p.deliverables, ...p.features]))].filter((f) => !/hours|Gallery|Film in|photographer|videographer/i.test(f)).map((f) => [f, (p: Package) => ([...p.deliverables, ...p.features].includes(f) ? <Check className="mx-auto size-4 text-success-500" /> : <Minus className="mx-auto size-4 text-midnight-200" />)] as [string, (p: Package) => React.ReactNode]),
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr><th />{packages.map((p) => <th key={p.slug} className="px-3 pb-4 text-center"><p className="font-serif text-lg text-ink">{p.name}</p>{p.popular && <Badge tone="blush">Popular</Badge>}</th>)}</tr></thead>
        <tbody>{rows.map(([l, f]) => <tr key={l} className="border-t border-line"><td className="py-2.5 pr-3 text-midnight-600">{l}</td>{packages.map((p) => <td key={p.slug} className="px-3 py-2.5 text-center text-midnight-700">{f(p)}</td>)}</tr>)}</tbody>
        <tfoot><tr><td />{packages.map((p) => <td key={p.slug} className="px-3 pt-4 text-center"><Button size="sm" variant={selected === p.slug ? "primary" : "outline"} onClick={() => onSelect(p.slug)}>{selected === p.slug ? "Selected" : "Choose"}</Button></td>)}</tr></tfoot>
      </table>
    </div>
  );
}

function AccountStep({ me, details, onDone }: { me: Me; details: Details; onDone: (m: NonNullable<Me>) => void }) {
  const [mode, setMode] = React.useState<"create" | "login">("create");
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState("");
  const [f, setF] = React.useState({ email: details.email, password: "", confirm: "" });
  if (me && me.role !== "client") {
    return (
      <Section title="You're signed in as a team member">
        <Alert tone="warning" icon={Info} title={`Signed in as ${me.name} (${me.role})`}>Bookings must be made from a client account. Log out to continue as a couple.</Alert>
        <form action={logoutAction} className="mt-4"><Button variant="outline">Log out</Button></form>
      </Section>
    );
  }
  const submit = async () => {
    setPending(true); setMsg(""); setErr({});
    try {
      if (mode === "create") {
        const early: Record<string, string> = {};
        const eErr = emailError(f.email); if (eErr) early.email = eErr;
        if (f.password.length < 8) early.password = "Use at least 8 characters";
        const cErr = confirmError(f.password, f.confirm); if (cErr) early.confirm = cErr;
        if (Object.keys(early).length) { setErr(early); return; }
        const r = await signupClient({ partnerOne: details.partnerOne, partnerTwo: details.partnerTwo, email: f.email, phone: details.phone, password: f.password, confirmPassword: f.confirm });
        if (!r.ok) { const fe = r.fieldErrors ?? {}; setErr({ ...fe, confirm: fe.confirmPassword ?? "" }); setMsg(r.message ?? ""); return; }
        onDone({ role: "client", name: details.partnerOne, email: f.email, phone: details.phone, partnerOne: details.partnerOne, partnerTwo: details.partnerTwo });
      } else {
        const r = await loginInline(f.email, f.password);
        if (!r.ok) { setMsg(r.message ?? ""); return; }
        if (r.data?.role !== "client") { setMsg("That's a team account. Use a client account to book."); return; }
        onDone({ role: "client", name: details.partnerOne, email: f.email, phone: details.phone, partnerOne: details.partnerOne, partnerTwo: details.partnerTwo });
      }
    } finally { setPending(false); }
  };
  return (
    <Section title="Create your account" subtitle="Track your booking, payments, timeline and gallery in one place.">
      <div className="max-w-lg rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-line">
        <Tabs value={mode} onChange={(v) => { setMode(v); setMsg(""); setErr({}); }} items={[{ value: "create", label: <span className="flex items-center gap-1.5"><UserPlus className="size-4" />New account</span> }, { value: "login", label: <span className="flex items-center gap-1.5"><LogIn className="size-4" />I have an account</span> }]} />
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {msg && <Alert tone="danger">{msg}</Alert>}
          <Field label="Email" error={err.email}><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-midnight-300" /><Input type="email" autoComplete="email" className="pl-10" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })}
            onBlur={() => mode === "create" && f.email && setErr((x) => ({ ...x, email: emailError(f.email) ?? "" }))} aria-invalid={!!err.email} inputMode="email" autoCapitalize="none" spellCheck={false} /></div></Field>
          {mode === "create" && <EmailSuggestion value={f.email} onAccept={(v) => { setF({ ...f, email: v }); setErr((x) => ({ ...x, email: "" })); }} />}
          <Field label="Password" error={err.password} hint={mode === "create" ? "At least 8 characters" : undefined}><Input type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} aria-invalid={!!err.password} /></Field>
          {mode === "create" && (
            <Field label="Confirm password" error={err.confirm}
              hint={f.confirm && f.confirm === f.password ? <span className="inline-flex items-center gap-1 text-success-700"><CheckCircle2 className="size-3.5" />Passwords match</span> : undefined}>
              <Input type="password" autoComplete="new-password" value={f.confirm} aria-invalid={!!err.confirm}
                onChange={(e) => { setF({ ...f, confirm: e.target.value }); if (err.confirm || (f.password && e.target.value.length >= f.password.length)) setErr((x) => ({ ...x, confirm: confirmError(f.password, e.target.value) ?? "" })); }}
                onBlur={() => f.confirm && setErr((x) => ({ ...x, confirm: confirmError(f.password, f.confirm) ?? "" }))} />
            </Field>
          )}
          <Button type="submit" size="lg" className="w-full" loading={pending}>{mode === "create" ? "Create account & continue" : "Log in & continue"}</Button>
          {mode === "create" && <p className="text-center text-[12px] text-muted">Account name: {details.partnerOne} & {details.partnerTwo}</p>}
          {mode === "login" && <p className="text-center text-[12px] text-muted">Demo client: sarah@visualweddings.test / demo1234</p>}
        </form>
      </div>
    </Section>
  );
}

function PaymentStep({ plan, setPlan, q, date, onPay }: { plan: Draft["plan"]; setPlan: (p: Draft["plan"]) => void; q: ReturnType<typeof quote>; date: string; onPay: (card: { number: string; exp: string; cvc: string; name: string; zip: string }) => Promise<{ ok: boolean; message?: string }> }) {
  const [card, setCard] = React.useState({ name: "", number: "", exp: "", cvc: "", zip: "" });
  const [agree, setAgree] = React.useState(false);
  const [terms, setTerms] = React.useState<ClientTerm | null>(null);
  // Links sit inside the checkbox label, so stop the click from also ticking the box
  const openTerms = (t: ClientTerm) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setTerms(t); };
  const [err, setErr] = React.useState<Record<string, string>>({});
  const [processing, setProcessing] = React.useState(false);
  const [declined, setDeclined] = React.useState("");
  const installmentNow = Math.round((q.total * 0.2) / 10) * 10;
  const now = plan === "full" ? q.total : plan === "installments" ? installmentNow : q.deposit;
  const balanceDue = new Date(date + "T12:00:00"); balanceDue.setDate(balanceDue.getDate() - 30);
  const schedule = plan === "full" ? [] : plan === "deposit" ? [[fmtDate(balanceDue < new Date() ? new Date() : balanceDue), q.total - now]] :
    [1, 2, 3].map((i) => { const d0 = new Date(); d0.setMonth(d0.getMonth() + i); const dd = d0 < balanceDue ? d0 : balanceDue; const each = Math.floor((q.total - now) / 3 / 10) * 10; return [fmtDate(dd), i === 3 ? q.total - now - each * 2 : each]; });
  const fmtNum = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  const fmtExp = (v: string) => { const x = v.replace(/\D/g, "").slice(0, 4); return x.length > 2 ? `${x.slice(0, 2)}/${x.slice(2)}` : x; };

  const pay = async () => {
    const e: Record<string, string> = {};
    if (card.name.trim().length < 2) e.name = "Name on card";
    if (card.number.replace(/\D/g, "").length < 13) e.number = "Enter your card number";
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) e.exp = "MM/YY";
    if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = "3–4 digits";
    if (!/^\d{5}$/.test(card.zip)) e.zip = "5-digit ZIP";
    if (!agree) e.agree = "Please accept the service agreement";
    setErr(e); setDeclined("");
    if (Object.keys(e).length) return;
    setProcessing(true);
    const r = await onPay(card);
    if (!r.ok) { setProcessing(false); setDeclined(r.message ?? "Payment failed"); }
  };

  return (
    <Section title="Reserve your date" subtitle="Secure checkout. You'll get a receipt and your booking confirmation by email.">
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          {([["deposit", "30% deposit", q.deposit, "Balance due 30 days before"], ["installments", "Payment plan", installmentNow, "20% today + 3 monthly payments"], ["full", "Pay in full", q.total, "Nothing more to pay"]] as const).map(([v, l, amt, sub]) => (
            <button key={v} onClick={() => setPlan(v)} aria-pressed={plan === v} className={cn("rounded-2xl border-2 bg-white p-4 text-left transition", plan === v ? "border-midnight-900" : "border-line hover:border-midnight-200")}>
              <p className="flex items-center justify-between text-sm font-medium text-ink">{l}{plan === v && <CheckCircle2 className="size-5 text-midnight-900" />}</p>
              <p className="mt-1 text-xl font-semibold text-ink">{money(amt)}</p><p className="text-[12px] text-muted">{sub}</p>
            </button>
          ))}
        </div>
        {schedule.length > 0 && (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <p className="text-sm font-semibold text-ink">Payment schedule</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-midnight-700">Today</span><span className="font-medium">{money(now)}</span></li>
              {schedule.map(([dt, amt], i) => <li key={i} className="flex justify-between text-muted"><span>{dt as string}</span><span>{money(amt as number)}</span></li>)}
            </ul>
            <p className="mt-3 text-[12px] text-muted">We&apos;ll remind you 7 days before each payment. Pay early anytime from your dashboard.</p>
          </div>
        )}
        <div className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-line">
          <div className="mb-5 flex items-center justify-between"><p className="flex items-center gap-2 font-semibold text-ink"><CreditCard className="size-5" />Card details</p><span className="flex items-center gap-1 text-[12px] text-muted"><Lock className="size-3.5" />Encrypted</span></div>
          {declined && <Alert tone="danger" icon={XCircle} title="Payment didn't go through" className="mb-4">{declined}</Alert>}
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Name on card" error={err.name} className="sm:col-span-6"><Input autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} aria-invalid={!!err.name} /></Field>
            <Field label="Card number" error={err.number} className="sm:col-span-6"><Input inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card.number} onChange={(e) => setCard({ ...card, number: fmtNum(e.target.value) })} aria-invalid={!!err.number} /></Field>
            <Field label="Expiry" error={err.exp} className="sm:col-span-2"><Input inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} aria-invalid={!!err.exp} /></Field>
            <Field label="CVC" error={err.cvc} className="sm:col-span-2"><Input inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })} aria-invalid={!!err.cvc} /></Field>
            <Field label="ZIP" error={err.zip} className="sm:col-span-2"><Input inputMode="numeric" autoComplete="postal-code" maxLength={5} value={card.zip} onChange={(e) => setCard({ ...card, zip: e.target.value.replace(/\D/g, "") })} aria-invalid={!!err.zip} /></Field>
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-info-500/30 bg-info-50 p-3 text-[12px] text-midnight-700">
            <b>Test mode.</b> No real charge is made. Use <button type="button" className="font-mono underline" onClick={() => setCard({ name: card.name || "Test Couple", number: "4242 4242 4242 4242", exp: "12/30", cvc: "123", zip: "28202" })}>4242 4242 4242 4242</button> (any future expiry, any CVC) — or <span className="font-mono">4000 0000 0000 0002</span> to see a decline.
          </div>
          <div className="mt-5"><Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} label={<span>I agree to the <a href={`/terms/${SERVICE_AGREEMENT.slug}`} onClick={openTerms(SERVICE_AGREEMENT)} className="font-medium underline underline-offset-2 hover:text-ink">service agreement</a> and <a href={`/terms/${CANCELLATION_POLICY.slug}`} onClick={openTerms(CANCELLATION_POLICY)} className="font-medium underline underline-offset-2 hover:text-ink">cancellation policy</a>.</span>} />{err.agree && <p className="mt-1 text-[12px] font-medium text-danger-500">{err.agree}</p>}</div>
          <Modal open={!!terms} onClose={() => setTerms(null)} size="lg" title={terms?.title} description={terms ? `${terms.summary} Last updated ${terms.updated}.` : undefined}
            footer={<>
              {terms && <a href={`/terms/${terms.slug}`} target="_blank" rel="noopener" className={buttonClass("outline")}>Open in a new tab</a>}
              <Button onClick={() => setTerms(null)}>Done</Button>
            </>}>
            {terms && <Markdown source={terms.body} />}
          </Modal>
          <Button size="lg" className="mt-6 w-full rounded-full" loading={processing} onClick={pay} icon={processing ? undefined : Lock}>{processing ? "Processing payment…" : `Pay ${money(now)} & confirm booking`}</Button>
        </div>
      </div>
    </Section>
  );
}
