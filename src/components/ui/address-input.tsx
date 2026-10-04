"use client";
import * as React from "react";
import { MapPin, CheckCircle2, AlertTriangle, Loader2, Building2 } from "lucide-react";
import { Input } from "./index";
import { cn } from "@/lib/utils";
import { matchesHit } from "@/lib/address-match";
export { matchesHit };

export type AddressHit = { label: string; line1: string | null; name: string | null; city: string | null; state: string | null; postcode: string | null; kind: "address" | "place" | "street" };
/**
 * unchanged  – still the saved value; nothing to check
 * empty      – nothing typed
 * checking   – lookup in flight
 * verified   – picked from suggestions, matches a real address, or came from our venue list
 * ambiguous  – lookup found addresses, but none matches what was typed exactly
 * notfound   – lookup found nothing
 * unavailable– couldn't reach the lookup service (don't block the user)
 */
export type AddressStatus = "unchanged" | "empty" | "checking" | "verified" | "ambiguous" | "notfound" | "unavailable";
export const needsConfirmation = (s: AddressStatus) => s === "ambiguous" || s === "notfound";

type Props = {
  id: string; value: string; onChange: (v: string) => void; onStatus?: (s: AddressStatus) => void;
  initialValue?: string; trusted?: boolean; placeholder?: string; hint?: React.ReactNode; "aria-invalid"?: boolean;
};

export function AddressInput({ id, value, onChange, onStatus, initialValue = "", trusted, placeholder = "Street, city", hint, ...rest }: Props) {
  const [hits, setHits] = React.useState<AddressHit[]>([]);
  const [status, setStatus] = React.useState<AddressStatus>(value ? "unchanged" : "empty");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [match, setMatch] = React.useState<AddressHit | null>(null);
  const picked = React.useRef<string | null>(null);
  const focused = React.useRef(false);
  const listId = `${id}-list`;

  const onStatusRef = React.useRef(onStatus);
  React.useEffect(() => { onStatusRef.current = onStatus; });
  const report = React.useCallback((s: AddressStatus) => { setStatus(s); onStatusRef.current?.(s); }, []);

  // Look the address up shortly after typing stops
  React.useEffect(() => {
    const v = value.trim();
    if (!v) { setHits([]); setMatch(null); report("empty"); return; }
    if (v === initialValue.trim() && picked.current === null) { report("unchanged"); return; }
    if (picked.current === v || trusted) { report("verified"); return; }
    if (v.length < 6 || !/[a-z]/i.test(v)) { setHits([]); report("checking"); return; }
    report("checking");
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/address?q=${encodeURIComponent(v)}`, { signal: ctrl.signal });
        const data = (await r.json()) as { ok: boolean; hits?: AddressHit[] };
        if (!data.ok) { setHits([]); report("unavailable"); return; }
        const list = data.hits ?? [];
        setHits(list); setActive(-1);
        const m = list.find((h) => matchesHit(v, h)) ?? null;
        setMatch(m);
        report(m ? "verified" : list.length ? "ambiguous" : "notfound");
        // Offer the full, formatted address even when what they typed already matches
        if (focused.current && list.length) setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") report("unavailable");
      }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value, initialValue, trusted, report]);

  const choose = (h: AddressHit) => {
    picked.current = h.label;
    onChange(h.label);
    setMatch(h); setOpen(false); setActive(-1);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !hits.length) { if (e.key === "ArrowDown" && hits.length) { setOpen(true); e.preventDefault(); } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? hits.length - 1 : a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(hits[active]); }
    else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
  };

  const where = (h: AddressHit | null) => (h ? [h.city, [h.state, h.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "");
  const msg: Record<AddressStatus, React.ReactNode> = {
    unchanged: hint, empty: hint,
    checking: value.trim().length >= 6 ? <span className="flex items-center gap-1.5 text-muted"><Loader2 className="size-3.5 animate-spin" />Checking address…</span> : <span className="text-muted">Keep typing — include the street number and city</span>,
    verified: <span className="flex items-center gap-1.5 font-medium text-success-700"><CheckCircle2 className="size-3.5" />Verified address{where(match) ? ` · ${where(match)}` : ""}</span>,
    ambiguous: <span className="flex items-center gap-1.5 text-warning-700"><AlertTriangle className="size-3.5" />Pick a matching address from the list to verify it</span>,
    notfound: <span className="flex items-center gap-1.5 text-warning-700"><AlertTriangle className="size-3.5" />We couldn&apos;t find this address — check the street number, street and city</span>,
    unavailable: <span className="text-muted">We couldn&apos;t check this address right now — you can still save it</span>,
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input id={id} value={value} placeholder={placeholder} autoComplete="off" role="combobox" aria-autocomplete="list"
          aria-expanded={open && hits.length > 0} aria-controls={listId} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={`${id}-status`} aria-invalid={rest["aria-invalid"] || status === "notfound" || undefined}
          className={cn("pr-10", status === "verified" && "border-success-500/50", (status === "notfound" || status === "ambiguous") && "border-warning-500/60")}
          onChange={(e) => { picked.current = null; onChange(e.target.value); }}
          onFocus={() => { focused.current = true; if (hits.length && status !== "verified") setOpen(true); }}
          onBlur={() => { focused.current = false; setTimeout(() => setOpen(false), 120); }}
          onKeyDown={onKey} />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
          {status === "checking" && value.trim().length >= 6 ? <Loader2 className="size-4 animate-spin text-midnight-300" />
            : status === "verified" ? <CheckCircle2 className="size-4 text-success-500" />
            : status === "notfound" || status === "ambiguous" ? <AlertTriangle className="size-4 text-warning-500" />
            : <MapPin className="size-4 text-midnight-300" />}
        </span>
      </div>
      {open && hits.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Address suggestions" className="absolute inset-x-0 z-50 mt-1.5 max-h-64 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)]">
          {hits.map((h, i) => (
            <li key={h.label} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(h); }} onMouseMove={() => active !== i && setActive(i)}
              className={cn("flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 text-sm", i === active ? "bg-midnight-50" : "hover:bg-canvas")}>
              {h.kind === "place" ? <Building2 className="mt-0.5 size-4 shrink-0 text-midnight-300" /> : <MapPin className="mt-0.5 size-4 shrink-0 text-midnight-300" />}
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{h.name ?? h.line1 ?? h.label}</span>
                <span className="block truncate text-[12px] text-muted">{[h.name ? h.line1 : null, where(h)].filter(Boolean).join(", ")}</span>
              </span>
            </li>
          ))}
          <li className="px-3 pb-1 pt-2 text-[10px] text-midnight-300" aria-hidden="true">Address data © OpenStreetMap contributors</li>
        </ul>
      )}
      <p id={`${id}-status`} className="mt-1.5 min-h-[18px] text-[12px]" aria-live="polite">{msg[status]}</p>
    </div>
  );
}
