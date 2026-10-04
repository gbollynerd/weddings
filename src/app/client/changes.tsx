"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Church, PartyPopper, Package as PackageIcon, CalendarClock, Hourglass, X, CheckCircle2, XCircle, Info, Camera, Video, Sparkles, AlertTriangle } from "lucide-react";
import { Button, Field, Input, Textarea, Badge, Alert, Checkbox } from "@/components/ui";
import { Modal, useAction } from "@/components/ui/interactive";
import { updateVenueAction, requestPackageChangeAction, requestDateChangeAction, cancelChangeRequestAction } from "@/lib/actions/changes";
import { checkAvailabilityAction } from "@/lib/actions/booking";
import { money } from "@/lib/pricing";
import { fmtDate, fmtLong, cn } from "@/lib/utils";

export type PkgOption = { slug: string; name: string; tagline: string; service_slug: string; hours: number; price: number; popular: boolean };
export type BookedAddon = { name: string; applies_to: string[]; line: number };
export type ChangeReq = {
  id: string; kind: "package" | "date"; status: "pending" | "approved" | "declined" | "cancelled"; note: string | null; decision_note: string | null;
  created_at: string; decided_at: string | null; from_date: string | null; to_date: string | null; from_package: string | null; to_package: string | null;
  total_before: number | null; total_after: number | null; removed_addons: string[];
};
export type VenueForm = {
  ceremonyVenue: string; ceremonyAddress: string; ceremonyArea: string;
  receptionSame: boolean; receptionVenue: string; receptionAddress: string; receptionArea: string;
};
export type ChangeProps = {
  weddingId: string; weddingDate: string; daysToGo: number; market: string; service: "photo" | "video" | "both";
  packageSlug: string; packageName: string; packagePrice: number; total: number; balance: number;
  venue: VenueForm; venueOptions: { name: string; address: string }[];
  packages: PkgOption[]; addons: BookedAddon[]; requests: ChangeReq[];
};

const SERVICE: Record<string, { label: string; icon: typeof Camera }> = { photo: { label: "Photography", icon: Camera }, video: { label: "Videography", icon: Video }, both: { label: "Photo + Video", icon: Sparkles } };
const signed = (n: number) => (n === 0 ? "No change" : `${n > 0 ? "+" : "−"}${money(Math.abs(n))}`);

/** Buttons that open the three change flows. */
export function ChangeActions(p: ChangeProps) {
  const [open, setOpen] = React.useState<null | "venue" | "package" | "date">(null);
  const pending = (k: string) => p.requests.some((r) => r.kind === k && r.status === "pending");
  const close = React.useCallback(() => setOpen(null), []);
  return (
    <>
      <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:flex-wrap">
        <Button variant="outline" size="sm" icon={MapPin} onClick={() => setOpen("venue")}>Edit venues</Button>
        <Button variant="outline" size="sm" icon={PackageIcon} onClick={() => setOpen("package")} disabled={pending("package")} title={pending("package") ? "A package change is already waiting for review" : undefined}>Change package</Button>
        <Button variant="outline" size="sm" icon={CalendarClock} onClick={() => setOpen("date")} disabled={pending("date")} title={pending("date") ? "A date change is already waiting for review" : undefined}>Change date</Button>
      </div>
      <VenueModal open={open === "venue"} onClose={close} {...p} />
      <PackageModal open={open === "package"} onClose={close} {...p} />
      <DateModal open={open === "date"} onClose={close} {...p} />
    </>
  );
}

/* ───────────── Venues (apply immediately) ───────────── */
function VenueModal({ open, onClose, weddingId, venue, venueOptions }: ChangeProps & { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [f, setF] = React.useState(venue);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  React.useEffect(() => { if (open) { setF(venue); setErrors({}); } }, [open, venue]);
  type K = keyof VenueForm;
  const set = (k: K) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === "receptionSame" ? e.target.checked : e.target.value;
    setF((s) => {
      const next = { ...s, [k]: v } as VenueForm;
      // Picking a known venue fills in its address (unless the client already typed a different one)
      const fill = (nameKey: K, addrKey: K, original: string) => {
        const hit = venueOptions.find((o) => o.name.toLowerCase() === String(v).toLowerCase());
        if (k === nameKey && hit && (!s[addrKey] || s[addrKey] === original)) (next[addrKey] as string) = hit.address;
      };
      fill("ceremonyVenue", "ceremonyAddress", venue.ceremonyAddress);
      fill("receptionVenue", "receptionAddress", venue.receptionAddress);
      return next;
    });
    setErrors((x) => ({ ...x, [k]: "" }));
  };
  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      const r = await updateVenueAction(weddingId, f);
      if (!r.ok && r.fieldErrors) setErrors(r.fieldErrors);
      return r;
    }, { onSuccess: () => { onClose(); router.refresh(); } });
  };
  const section = "space-y-4 rounded-2xl border border-line p-4";
  const heading = (Icon: typeof Church, text: string) => <p className="flex items-center gap-2 text-sm font-semibold text-ink"><span className="grid size-7 place-items-center rounded-lg bg-blush-50 text-blush-600"><Icon className="size-4" /></span>{text}</p>;
  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<span className="grid size-10 place-items-center rounded-2xl bg-blush-50 text-blush-600"><MapPin className="size-5" /></span>}
      title="Edit venues" description="Where your ceremony and reception take place. Changes save right away and your team is notified."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => save()} loading={pending}>Save changes</Button></>}>
      <form onSubmit={save} className="space-y-4">
        <datalist id="cv-venues">{venueOptions.map((o) => <option key={o.name} value={o.name} />)}</datalist>

        <fieldset className={section}>
          <legend className="sr-only">Ceremony</legend>
          {heading(Church, "Ceremony")}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue" required error={errors.ceremonyVenue} htmlFor="cv-c-venue">
              <Input id="cv-c-venue" value={f.ceremonyVenue} onChange={set("ceremonyVenue")} list="cv-venues" aria-invalid={!!errors.ceremonyVenue} autoComplete="off" placeholder="e.g. St. Peter's Church" />
            </Field>
            <Field label="Room or area" hint="Optional" htmlFor="cv-c-area"><Input id="cv-c-area" value={f.ceremonyArea} onChange={set("ceremonyArea")} placeholder="e.g. Garden lawn" /></Field>
          </div>
          <Field label="Address" error={errors.ceremonyAddress} hint="Used for your team's directions" htmlFor="cv-c-address">
            <Input id="cv-c-address" value={f.ceremonyAddress} onChange={set("ceremonyAddress")} placeholder="Street, city" />
          </Field>
        </fieldset>

        <fieldset className={section}>
          <legend className="sr-only">Reception</legend>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {heading(PartyPopper, "Reception")}
            <Checkbox id="cv-same" label="Same venue as the ceremony" checked={f.receptionSame} onChange={set("receptionSame")} />
          </div>
          {f.receptionSame ? (
            <Field label="Room or area" hint={`At ${f.ceremonyVenue || "the ceremony venue"} · optional`} htmlFor="cv-r-area"><Input id="cv-r-area" value={f.receptionArea} onChange={set("receptionArea")} placeholder="e.g. Grand ballroom" /></Field>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Venue" required error={errors.receptionVenue} htmlFor="cv-r-venue">
                  <Input id="cv-r-venue" value={f.receptionVenue} onChange={set("receptionVenue")} list="cv-venues" aria-invalid={!!errors.receptionVenue} autoComplete="off" placeholder="e.g. The Ivory Atrium" />
                </Field>
                <Field label="Room or area" hint="Optional" htmlFor="cv-r-area"><Input id="cv-r-area" value={f.receptionArea} onChange={set("receptionArea")} placeholder="e.g. Grand ballroom" /></Field>
              </div>
              <Field label="Address" error={errors.receptionAddress} hint="Used for your team's directions" htmlFor="cv-r-address">
                <Input id="cv-r-address" value={f.receptionAddress} onChange={set("receptionAddress")} placeholder="Street, city" />
              </Field>
            </>
          )}
        </fieldset>

        <p className="flex items-start gap-2 rounded-2xl bg-canvas p-3 text-[12px] text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />Moving outside your booked city? Message your coordinator first — travel may affect pricing.</p>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

/* ───────────── Package (request) ───────────── */
function PackageModal({ open, onClose, weddingId, packages, packageSlug, packageName, total, balance, addons }: ChangeProps & { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [pick, setPick] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  React.useEffect(() => { if (open) { setPick(null); setNote(""); } }, [open]);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (pick) requestAnimationFrame(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }, [pick]);
  const sel = packages.find((x) => x.slug === pick) ?? null;
  const priceFor = (x: PkgOption) => {
    const kept = addons.filter((a) => a.applies_to.includes(x.service_slug));
    const newTotal = x.price + kept.reduce((s, a) => s + a.line, 0);
    return { newTotal, diff: newTotal - total, removed: addons.filter((a) => !a.applies_to.includes(x.service_slug)) };
  };
  const q = sel ? priceFor(sel) : null;
  const newBalance = q ? balance + q.diff : balance;
  const groups = (["photo", "video", "both"] as const).map((s) => ({ s, items: packages.filter((x) => x.service_slug === s) })).filter((g) => g.items.length);
  const send = () => sel && run(() => requestPackageChangeAction(weddingId, sel.slug, note), { onSuccess: () => { onClose(); router.refresh(); } });
  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<span className="grid size-10 place-items-center rounded-2xl bg-blush-50 text-blush-600"><PackageIcon className="size-5" /></span>}
      title="Change package" description={`You're on ${packageName}. Pick a new package — your coordinator confirms the change before anything is charged.`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={send} loading={pending} disabled={!sel}>Send request</Button></>}>
      <div className="space-y-5">
        {groups.map(({ s, items }) => {
          const Icon = SERVICE[s].icon;
          return (
            <fieldset key={s}>
              <legend className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted"><Icon className="size-3.5" />{SERVICE[s].label}</legend>
              <div className="grid gap-2">
                {items.map((x) => {
                  const current = x.slug === packageSlug;
                  const d = priceFor(x).diff;
                  return (
                    <label key={x.slug} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition", current ? "cursor-default border-line bg-canvas" : pick === x.slug ? "border-midnight-900 ring-2 ring-midnight-900/10" : "border-line hover:border-midnight-200")}>
                      <input type="radio" name="pkg" value={x.slug} checked={pick === x.slug} disabled={current} onChange={() => setPick(x.slug)} className="size-4 shrink-0 accent-midnight-900" aria-label={x.name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span className="font-medium text-ink">{x.name}</span>{current && <Badge tone="midnight">Current</Badge>}{x.popular && !current && <Badge tone="blush">Popular</Badge>}</span>
                        <span className="block truncate text-[12px] text-muted">{x.hours} hours · {x.tagline}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold text-ink">{money(x.price)}</span>
                        {!current && <span className={cn("block whitespace-nowrap text-[12px] font-medium", d > 0 ? "text-midnight-600" : d < 0 ? "text-success-700" : "text-muted")}>{signed(d)}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        {sel && q && (
          <div ref={summaryRef} className="scroll-mb-4 space-y-3 rounded-2xl bg-canvas p-4" aria-live="polite">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-[11px] uppercase tracking-wide text-muted">New total</p><p className="font-semibold text-ink">{money(q.newTotal)}</p></div>
              <div><p className="text-[11px] uppercase tracking-wide text-muted">Difference</p><p className={cn("font-semibold", q.diff < 0 ? "text-success-700" : "text-ink")}>{signed(q.diff)}</p></div>
              <div><p className="text-[11px] uppercase tracking-wide text-muted">{newBalance < 0 ? "Refund" : "Left to pay"}</p><p className="font-semibold text-ink">{money(Math.abs(newBalance))}</p></div>
            </div>
            {q.removed.length > 0 && <Alert tone="warning" icon={AlertTriangle}>{q.removed.map((a) => a.name).join(", ")} {q.removed.length > 1 ? "don't" : "doesn't"} apply to {SERVICE[sel.service_slug].label.toLowerCase()} and will be removed.</Alert>}
            <p className="text-[12px] text-muted">{q.diff > 0 ? "The difference is added to your remaining balance — nothing is charged today." : q.diff < 0 ? (newBalance < 0 ? "You've already paid more than the new total, so the difference is refunded to your card." : "Your remaining balance goes down by the difference.") : "Your total stays the same."}</p>
          </div>
        )}

        <Field label="Note for your coordinator" hint="Optional" htmlFor="cp-note">
          <Textarea id="cp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything we should know about the change?" className="min-h-[72px]" maxLength={1000} />
        </Field>
      </div>
    </Modal>
  );
}

/* ───────────── Date (request) ───────────── */
type Avail = { level: string; suggestions: string[] } | null;
function DateModal({ open, onClose, weddingId, weddingDate, daysToGo, market, service }: ChangeProps & { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [date, setDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [avail, setAvail] = React.useState<Avail>(null);
  const [checking, setChecking] = React.useState(false);
  const [err, setErr] = React.useState("");
  const min = React.useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); }, []);
  React.useEffect(() => { if (open) { setDate(""); setNote(""); setAvail(null); setErr(""); } }, [open]);
  React.useEffect(() => {
    if (!date || date < min || date === weddingDate) { setAvail(null); return; }
    let live = true;
    setChecking(true);
    checkAvailabilityAction(market, date, service).then((a) => { if (live) setAvail(a as Avail); }).finally(() => live && setChecking(false));
    return () => { live = false; };
  }, [date, market, service, min, weddingDate]);
  const send = () => {
    if (!date) return setErr("Choose a new date");
    if (date < min) return setErr("New dates need to be at least 14 days away");
    if (date === weddingDate) return setErr("That's your current date");
    run(() => requestDateChangeAction(weddingId, date, note), { onSuccess: () => { onClose(); router.refresh(); } });
  };
  const free = daysToGo > 90;
  const level = avail?.level;
  return (
    <Modal open={open} onClose={onClose} size="md" icon={<span className="grid size-10 place-items-center rounded-2xl bg-blush-50 text-blush-600"><CalendarClock className="size-5" /></span>}
      title="Change your date" description={`Currently ${fmtLong(weddingDate)}. We'll check team availability and confirm.`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={send} loading={pending}>Send request</Button></>}>
      <div className="space-y-4">
        <Field label="New date" required error={err} htmlFor="cd-date">
          <Input id="cd-date" type="date" min={min} value={date} onChange={(e) => { setDate(e.target.value); setErr(""); }} aria-invalid={!!err} />
        </Field>
        {checking && <p className="text-[13px] text-muted">Checking availability…</p>}
        {!checking && level && (
          <div className={cn("rounded-2xl border p-3 text-sm", level === "available" ? "border-success-500/20 bg-success-50 text-success-700" : level === "limited" ? "border-warning-500/20 bg-warning-50 text-warning-700" : "border-danger-500/20 bg-danger-50 text-danger-700")}>
            <p className="font-medium">{level === "available" ? "Good availability on this date" : level === "limited" ? "Limited availability — request soon" : "This date is fully booked"}</p>
            {level !== "available" && avail!.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-[12px] opacity-80">Open nearby:</span>
                {avail!.suggestions.map((s) => <button key={s} type="button" onClick={() => setDate(s)} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-ink ring-1 ring-line hover:ring-midnight-200">{fmtDate(s, "EEE, MMM d")}</button>)}
              </div>
            )}
          </div>
        )}
        <Alert tone={free ? "info" : "warning"} icon={free ? Info : AlertTriangle}>
          {free ? "Date changes are free up to 90 days before your wedding." : "You're within 90 days of your wedding, so a change fee may apply. Your coordinator will confirm before anything changes."}
        </Alert>
        <p className="text-[12px] text-muted">Your team will be asked to re-confirm for the new date, and payment due dates move with it.</p>
        <Field label="Note for your coordinator" hint="Optional" htmlFor="cd-note">
          <Textarea id="cd-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Our venue moved us to this date" className="min-h-[72px]" maxLength={1000} />
        </Field>
      </div>
    </Modal>
  );
}

/* ───────────── Status of requests ───────────── */
export function ChangeRequestList({ requests }: { requests: ChangeReq[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const recent = requests.filter((r) => r.status === "pending" || ((r.status === "approved" || r.status === "declined") && r.decided_at && Date.now() - new Date(r.decided_at).getTime() < 14 * 86400000));
  if (!recent.length) return null;
  return (
    <div className="space-y-3">
      {recent.map((r) => {
        const what = r.kind === "package" ? `${r.from_package} → ${r.to_package}` : `${fmtDate(r.from_date!)} → ${fmtDate(r.to_date!)}`;
        const diff = r.total_after != null && r.total_before != null ? r.total_after - r.total_before : null;
        const label = r.kind === "package" ? "Package change" : "Date change";
        if (r.status === "pending")
          return (
            <Alert key={r.id} tone="blush" icon={Hourglass} title={`${label} requested · awaiting your coordinator`}
              action={<Button size="sm" variant="outline" icon={X} loading={pending} onClick={() => run(() => cancelChangeRequestAction(r.id), { onSuccess: () => router.refresh() })}>Cancel request</Button>}>
              {what}{r.kind === "package" && diff != null ? ` · ${signed(diff)}` : ""}
            </Alert>
          );
        return (
          <Alert key={r.id} tone={r.status === "approved" ? "success" : "danger"} icon={r.status === "approved" ? CheckCircle2 : XCircle} title={`${label} ${r.status === "approved" ? "approved" : "not approved"}`}>
            {what}{r.decision_note ? ` — “${r.decision_note}”` : ""}
          </Alert>
        );
      })}
    </div>
  );
}
