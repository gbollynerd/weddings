"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths, subWeeks, isBefore, startOfDay, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Repeat, CheckCircle2, XCircle, Heart, Eraser, CalendarDays, Trash2, StickyNote, X, MousePointerClick, Lock } from "lucide-react";
import { Button, Card, CardHeader, CardBody, Badge, Field, Input, Select, EmptyState, StatusBadge } from "@/components/ui";
import { Modal, Tabs, useAction, useToast, ConfirmModal } from "@/components/ui/interactive";
import { setAvailabilityAction, addRecurringAction, deleteRuleAction } from "@/lib/actions/team";
import { cn, fmtDate } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/pricing";

type Day = { date: string; status: string; note: string | null; source: string };
type Booking = { date: string; couple: string; role: string; status: string; weddingId: string; city: string; start: string };
type Rule = { id: string; weekdays: number[]; status: string; start: string; end: string; note: string | null };
type View = "month" | "week" | "list";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => format(d, "yyyy-MM-dd");

const cellTone: Record<string, string> = {
  available: "bg-success-50 border-success-500/25 text-success-700",
  unavailable: "bg-[repeating-linear-gradient(135deg,#f5f6fa,#f5f6fa_6px,#eceef5_6px,#eceef5_12px)] border-line text-muted",
  personal: "bg-blush-50 border-blush-200 text-blush-700",
};

export function AvailabilityCalendar({ days, bookings, rules }: { days: Day[]; bookings: Booking[]; rules: Rule[] }) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useAction();
  const [view, setView] = React.useState<View>("month");
  const [cursor, setCursor] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [note, setNote] = React.useState("");
  const [recurring, setRecurring] = React.useState(false);
  const [ruleToDelete, setRuleToDelete] = React.useState<Rule | null>(null);
  const [focus, setFocus] = React.useState<string | null>(null);
  const today = startOfDay(new Date());
  const dayMap = React.useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const bookMap = React.useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of bookings) m.set(b.date, [...(m.get(b.date) ?? []), b]);
    return m;
  }, [bookings]);

  const toggle = (d: string, e?: React.MouseEvent) => {
    if (isBefore(parseISO(d), today)) return;
    setSelected((prev) => {
      const next = new Set(e?.shiftKey || e?.metaKey || prev.size ? prev : []);
      if (e?.shiftKey && prev.size) {
        const last = [...prev].sort().at(-1)!;
        let a = parseISO(last < d ? last : d);
        const b = parseISO(last < d ? d : last);
        while (a <= b) { next.add(iso(a)); a = addDays(a, 1); }
        return next;
      }
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  const apply = (status: "available" | "unavailable" | "personal" | "clear") => {
    const dates = [...selected];
    const booked = dates.filter((d) => bookMap.get(d)?.some((b) => b.status !== "completed"));
    if (status !== "available" && booked.length === dates.length) {
      toast({ tone: "warning", title: "Those dates are booked", body: "You can't block a date you're already booked for. Message your coordinator if something changed." });
      return;
    }
    run(() => setAvailabilityAction(dates, status, note || undefined), {
      onSuccess: (d) => {
        if (d?.conflicts.length) toast({ tone: "warning", title: "Some dates were skipped", body: `Booked: ${d.conflicts.join(", ")}` });
        setSelected(new Set()); setNote(""); router.refresh();
      },
    });
  };

  // Stats for next 30 days
  const next30 = Array.from({ length: 30 }, (_, i) => iso(addDays(today, i + 1)));
  const stats = {
    available: next30.filter((d) => dayMap.get(d)?.status === "available" && !bookMap.has(d)).length,
    booked: next30.filter((d) => bookMap.get(d)?.some((b) => b.status === "accepted")).length,
    pending: next30.filter((d) => bookMap.get(d)?.some((b) => b.status === "pending")).length,
    blocked: next30.filter((d) => ["unavailable", "personal"].includes(dayMap.get(d)?.status ?? "")).length,
  };
  const weekends = next30.filter((d) => [5, 6].includes(parseISO(d).getDay()));
  const unsetWeekends = weekends.filter((d) => !dayMap.has(d) && !bookMap.has(d)).length;

  const title = view === "week" ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}` : format(cursor, "MMMM yyyy");
  const prev = () => setCursor((c) => (view === "week" ? subWeeks(c, 1) : subMonths(c, 1)));
  const nextP = () => setCursor((c) => (view === "week" ? addWeeks(c, 1) : addMonths(c, 1)));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Available", stats.available, "bg-success-50 text-success-500", CheckCircle2],
          ["Booked", stats.booked, "bg-midnight-50 text-midnight-700", CalendarDays],
          ["Pending", stats.pending, "bg-warning-50 text-warning-500", Repeat],
          ["Blocked", stats.blocked, "bg-blush-50 text-blush-500", XCircle],
        ].map(([label, v, tone, I]) => {
          const Icon = I as typeof CheckCircle2;
          return (
            <Card key={label as string} className="flex items-center gap-4 p-5">
              <span className={cn("grid size-12 place-items-center rounded-full", tone as string)}><Icon className="size-5" /></span>
              <div><p className="text-[13px] text-muted">{label as string} · next 30 days</p><p className="text-xl font-semibold text-ink">{v as number} day{v === 1 ? "" : "s"}</p></div>
            </Card>
          );
        })}
      </div>

      {unsetWeekends > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning-500/20 bg-warning-50 px-4 py-3 text-sm text-warning-700 sm:flex-row sm:items-center sm:justify-between">
          <span><b>{unsetWeekends} weekend day{unsetWeekends > 1 ? "s" : ""}</b> in the next 30 days {unsetWeekends > 1 ? "have" : "has"} no availability set. Coordinators can&apos;t staff you on unset dates.</span>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set(weekends.filter((d) => !dayMap.has(d) && !bookMap.has(d))))}>Select them</Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prev} aria-label="Previous"><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="icon" onClick={nextP} aria-label="Next"><ChevronRight className="size-4" /></Button>
              <h2 className="ml-2 text-lg font-semibold text-ink">{title}</h2>
              <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
            </div>
            <Tabs value={view} onChange={setView} items={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }, { value: "list", label: "List" }]} />
          </div>

          {view === "month" && <MonthGrid cursor={cursor} today={today} dayMap={dayMap} bookMap={bookMap} selected={selected} onToggle={toggle} onFocus={setFocus} />}
          {view === "week" && <WeekView cursor={cursor} today={today} dayMap={dayMap} bookMap={bookMap} selected={selected} onToggle={toggle} />}
          {view === "list" && <ListView today={today} dayMap={dayMap} bookings={bookings} />}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-3 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-success-50 ring-1 ring-success-500/30" />Available</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-midnight-900" />Booked</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-warning-50 ring-1 ring-warning-500/40" />Pending</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-midnight-100" />Unavailable</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-blush-100 ring-1 ring-blush-200" />Personal</span>
            <span className="ml-auto hidden items-center gap-1.5 md:flex"><MousePointerClick className="size-3.5" />Click to select · Shift-click for a range</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={selected.size ? `${selected.size} date${selected.size > 1 ? "s" : ""} selected` : "Update dates"} subtitle={selected.size ? [...selected].sort().slice(0, 3).map((d) => fmtDate(d, "MMM d")).join(", ") + (selected.size > 3 ? "…" : "") : "Select days on the calendar"}
              action={selected.size ? <button onClick={() => setSelected(new Set())} className="text-muted hover:text-ink" aria-label="Clear selection"><X className="size-4" /></button> : undefined} />
            <CardBody className="space-y-3">
              <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Available after 2 PM" disabled={!selected.size} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="bg-success-50 text-success-700 hover:bg-success-50/70" icon={CheckCircle2} disabled={!selected.size} loading={pending} onClick={() => apply("available")}>Available</Button>
                <Button variant="secondary" icon={XCircle} disabled={!selected.size} onClick={() => apply("unavailable")}>Unavailable</Button>
                <Button variant="secondary" className="bg-blush-50 text-blush-700 hover:bg-blush-100" icon={Heart} disabled={!selected.size} onClick={() => apply("personal")}>Personal</Button>
                <Button variant="ghost" icon={Eraser} disabled={!selected.size} onClick={() => apply("clear")}>Clear</Button>
              </div>
              <p className="flex items-start gap-1.5 text-[12px] text-muted"><Lock className="mt-0.5 size-3 shrink-0" />Booked dates can&apos;t be blocked. Contact your coordinator to change a confirmed wedding.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recurring availability" action={<Button size="sm" variant="outline" icon={Repeat} onClick={() => setRecurring(true)}>Add</Button>} />
            <CardBody>
              {rules.length === 0 ? <p className="text-sm text-muted">No recurring rules yet.</p> : (
                <ul className="space-y-2">
                  {rules.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
                      <Repeat className="mt-0.5 size-4 text-midnight-400" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium text-ink">{r.weekdays.map((w) => DOW[w]).join(", ")} · <span className={r.status === "available" ? "text-success-700" : "text-muted"}>{r.status}</span></p>
                        <p className="text-[12px] text-muted">{fmtDate(r.start, "MMM d")} – {fmtDate(r.end, "MMM d, yyyy")}{r.note ? ` · ${r.note}` : ""}</p>
                      </div>
                      <button onClick={() => setRuleToDelete(r)} className="-m-2 grid size-9 shrink-0 place-items-center rounded-lg text-midnight-300 hover:bg-danger-50 hover:text-danger-500" aria-label="Delete rule"><Trash2 className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {focus && <DayPanel date={focus} day={dayMap.get(focus)} bookings={bookMap.get(focus) ?? []} onClose={() => setFocus(null)} />}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-midnight-900 p-2 pl-4 text-white shadow-[var(--shadow-pop)] animate-pop-in lg:left-[256px] xl:hidden">
          <span className="flex-1 text-sm">{selected.size} selected</span>
          <Button size="sm" variant="blush" onClick={() => apply("available")} loading={pending}>Available</Button>
          <Button size="sm" variant="secondary" onClick={() => apply("unavailable")}>Unavailable</Button>
        </div>
      )}

      <RecurringModal open={recurring} onClose={() => setRecurring(false)} onDone={() => { setRecurring(false); router.refresh(); }} />
      <ConfirmModal open={!!ruleToDelete} onClose={() => setRuleToDelete(null)} title="Remove recurring rule?" description="Dates already on your calendar stay as they are." confirmLabel="Remove" tone="danger" loading={pending}
        onConfirm={() => ruleToDelete && run(() => deleteRuleAction(ruleToDelete.id), { onSuccess: () => { setRuleToDelete(null); router.refresh(); } })} />
    </div>
  );
}

function DayCell({ d, today, day, books, selected, muted, onToggle, onFocus, tall }: { d: Date; today: Date; day?: Day; books: Booking[]; selected: boolean; muted?: boolean; onToggle: (d: string, e?: React.MouseEvent) => void; onFocus?: (d: string) => void; tall?: boolean }) {
  const key = iso(d);
  const past = isBefore(d, today);
  const booked = books.find((b) => b.status === "accepted" || b.status === "completed");
  const pend = books.find((b) => b.status === "pending");
  const isToday = key === iso(today);
  return (
    <button type="button" onClick={(e) => { onToggle(key, e); onFocus?.(key); }} disabled={past && !books.length} aria-pressed={selected}
      aria-label={`${format(d, "EEEE MMMM d")}: ${booked ? "booked " + booked.couple : pend ? "pending" : day?.status ?? "not set"}`}
      className={cn("group relative flex flex-col items-stretch rounded-xl border p-1.5 text-left transition sm:p-2",
        tall ? "min-h-[140px]" : "min-h-[72px] sm:min-h-[96px]",
        booked ? "border-midnight-900 bg-midnight-900 text-white" : pend ? "border-warning-500/40 bg-warning-50 text-warning-700" : day ? cellTone[day.status] : "border-line bg-white text-midnight-700",
        muted && "opacity-40", past && "cursor-default opacity-50", !past && "hover:ring-2 hover:ring-midnight-200",
        selected && "ring-2 ring-blush-400 ring-offset-1")}>
      <span className={cn("grid size-6 place-items-center rounded-full text-[12px] font-semibold", isToday && "bg-blush-400 text-white")}>{format(d, "d")}</span>
      {booked && <span className="mt-auto truncate text-[11px] font-medium leading-tight sm:text-[12px]">{booked.couple}</span>}
      {!booked && pend && <span className="mt-auto truncate text-[11px] font-medium">Pending · {pend.couple}</span>}
      {!booked && !pend && day && <span className="mt-auto hidden truncate text-[11px] capitalize sm:block">{day.note ?? day.status}</span>}
      {day?.source === "recurring" && !booked && <Repeat className="absolute right-1.5 top-1.5 size-3 opacity-50" />}
      {day?.note && !booked && <StickyNote className="absolute right-1.5 bottom-1.5 size-3 opacity-50 sm:hidden" />}
    </button>
  );
}

function MonthGrid({ cursor, today, dayMap, bookMap, selected, onToggle, onFocus }: { cursor: Date; today: Date; dayMap: Map<string, Day>; bookMap: Map<string, Booking[]>; selected: Set<string>; onToggle: (d: string, e?: React.MouseEvent) => void; onFocus: (d: string) => void }) {
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const cells: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) cells.push(d);
  return (
    <div className="p-3 sm:p-5">
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted sm:gap-2">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((d) => <DayCell key={iso(d)} d={d} today={today} day={dayMap.get(iso(d))} books={bookMap.get(iso(d)) ?? []} selected={selected.has(iso(d))} muted={!isSameMonth(d, cursor)} onToggle={onToggle} onFocus={onFocus} />)}
      </div>
    </div>
  );
}

function WeekView({ cursor, today, dayMap, bookMap, selected, onToggle }: { cursor: Date; today: Date; dayMap: Map<string, Day>; bookMap: Map<string, Booking[]>; selected: Set<string>; onToggle: (d: string, e?: React.MouseEvent) => void }) {
  const start = startOfWeek(cursor);
  const ds = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-2 p-3 sm:grid-cols-7 sm:p-5">
      {ds.map((d) => {
        const books = bookMap.get(iso(d)) ?? [];
        return (
          <div key={iso(d)}>
            <p className="mb-1.5 text-center text-[12px] font-medium text-muted">{format(d, "EEE d")}</p>
            <DayCell d={d} today={today} day={dayMap.get(iso(d))} books={books} selected={selected.has(iso(d))} onToggle={onToggle} tall />
            {books.map((b) => (
              <Link key={b.weddingId} href={`/team/weddings/${b.weddingId}`} className="mt-1.5 block rounded-lg bg-canvas px-2 py-1.5 text-[11px] text-midnight-700 hover:bg-midnight-50">
                {b.city} · {ROLE_LABEL[b.role]}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ListView({ today, dayMap, bookings }: { today: Date; dayMap: Map<string, Day>; bookings: Booking[] }) {
  const rows = [
    ...bookings.filter((b) => !isBefore(parseISO(b.date), today)).map((b) => ({ date: b.date, kind: b.status === "pending" ? "pending" : "booked", label: b.couple, sub: `${ROLE_LABEL[b.role]} · ${b.city}`, href: `/team/weddings/${b.weddingId}` })),
    ...[...dayMap.values()].filter((d) => !isBefore(parseISO(d.date), today) && !bookings.some((b) => b.date === d.date)).map((d) => ({ date: d.date, kind: d.status, label: d.status === "available" ? "Available" : d.status === "personal" ? "Personal day" : "Unavailable", sub: d.note ?? (d.source === "recurring" ? "Recurring rule" : ""), href: "" })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 60);
  if (!rows.length) return <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Select dates in Month view to set your availability." />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-3">
          <div className="w-24 shrink-0"><p className="text-sm font-semibold text-ink">{fmtDate(r.date, "EEE, MMM d")}</p></div>
          <div className="min-w-0 flex-1">
            {r.href ? <Link href={r.href} className="text-sm font-medium text-ink hover:underline">{r.label}</Link> : <p className="text-sm font-medium text-ink">{r.label}</p>}
            {r.sub && <p className="truncate text-[12px] text-muted">{r.sub}</p>}
          </div>
          <StatusBadge status={r.kind} />
        </li>
      ))}
    </ul>
  );
}

function DayPanel({ date, day, bookings, onClose }: { date: string; day?: Day; bookings: Booking[]; onClose: () => void }) {
  return (
    <Card className="animate-pop-in">
      <CardHeader title={fmtDate(date, "EEEE, MMMM d")} action={<button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close"><X className="size-4" /></button>} />
      <CardBody className="space-y-3 text-sm">
        {bookings.map((b) => (
          <Link key={b.weddingId} href={`/team/weddings/${b.weddingId}`} className="block rounded-2xl bg-midnight-900 p-3 text-white">
            <p className="font-medium">{b.couple}</p><p className="text-[12px] text-white/70">{ROLE_LABEL[b.role]} · {b.city} · {b.status}</p>
          </Link>
        ))}
        <div className="flex items-center gap-2"><span className="text-muted">Status:</span>{day ? <StatusBadge status={day.status} /> : <Badge>Not set</Badge>}{day?.source === "recurring" && <Badge><Repeat className="size-3" />Recurring</Badge>}</div>
        {day?.note && <p className="rounded-xl bg-canvas p-3 text-midnight-700">{day.note}</p>}
      </CardBody>
    </Card>
  );
}

function RecurringModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { run, pending } = useAction();
  const [weekdays, setWeekdays] = React.useState<number[]>([6]);
  const [status, setStatus] = React.useState<"available" | "unavailable">("available");
  const [start, setStart] = React.useState(iso(addDays(new Date(), 1)));
  const [end, setEnd] = React.useState(iso(addMonths(new Date(), 3)));
  const [note, setNote] = React.useState("");
  const count = React.useMemo(() => {
    let n = 0;
    for (let d = parseISO(start); d <= parseISO(end) && n < 999; d = addDays(d, 1)) if (weekdays.includes(d.getDay())) n++;
    return n;
  }, [weekdays, start, end]);
  return (
    <Modal open={open} onClose={onClose} title="Set recurring availability" description="Applies to dates without a manual entry. Booked dates are never changed."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={pending} disabled={!weekdays.length || end < start} onClick={() => run(() => addRecurringAction({ weekdays, status, start, end, note }), { onSuccess: onDone })}>Apply to {count} dates</Button></>}>
      <div className="space-y-5">
        <Field label="Repeat on">
          <div className="flex flex-wrap gap-2">
            {DOW.map((d, i) => (
              <button key={d} type="button" aria-pressed={weekdays.includes(i)} onClick={() => setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i]))}
                className={cn("h-10 w-12 rounded-xl border text-sm font-medium transition", weekdays.includes(i) ? "border-midnight-900 bg-midnight-900 text-white" : "border-line text-midnight-600 hover:bg-canvas")}>{d}</button>
            ))}
          </div>
        </Field>
        <Field label="Mark as"><Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="available">Available</option><option value="unavailable">Unavailable</option></Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={start} min={iso(new Date())} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Until" error={end < start ? "Must be after start" : null}><Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Saturdays all season" /></Field>
      </div>
    </Modal>
  );
}
