import Link from "next/link";
import { Search, ChevronRight, AlertTriangle, Users, RefreshCw } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { adminWeddings } from "@/lib/services/staffing";
import { LinkTabs, Card, Badge, StatusBadge, EmptyState, Input, Button } from "@/components/ui";
import { fmtDate, daysUntil } from "@/lib/utils";

export const metadata = { title: "Weddings" };
const VIEWS = { attention: "Needs attention", upcoming: "Upcoming", past: "Past", all: "All" } as const;
type View = keyof typeof VIEWS;

export default async function AdminWeddings({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  await requireUser(["coordinator", "admin"]);
  const sp = await searchParams;
  const view: View = (sp.view && sp.view in VIEWS ? sp.view : "attention") as View;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const rows = await adminWeddings(view, q);
  const href = (v: View) => `/admin/weddings?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-muted">Staff each wedding, approve team requests, handle cancellations and client changes.</p>
        {
          <form className="relative w-full sm:w-auto" action="/admin/weddings">
            <input type="hidden" name="view" value={view} />
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
            <Input name="q" defaultValue={q} placeholder="Couple, venue, city, booking #" className="h-10 w-full pl-9 sm:w-64" aria-label="Search weddings" />
            <Button type="submit" className="sr-only">Search</Button>
          </form>
        }
      </div>
      <LinkTabs active={href(view)} tabs={(Object.keys(VIEWS) as View[]).map((v) => ({ href: href(v), label: VIEWS[v], count: v === view ? rows.length : undefined }))} />
      {rows.length === 0 ? (
        <Card><EmptyState icon={view === "attention" ? Users : Search} title={view === "attention" ? "Every wedding is staffed" : "No weddings found"}
          description={view === "attention" ? "Nothing needs a decision right now." : q ? "Try a different search." : undefined} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((w) => {
              const d = daysUntil(w.wedding_date);
              const staffed = w.slots > 0 && w.confirmed === w.slots;
              return (
                <li key={w.id}>
                  <Link href={`/admin/weddings/${w.id}`} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 transition hover:bg-canvas/70 md:grid-cols-[64px_1.4fr_1fr_1.2fr_auto]">
                    <div className="rounded-xl bg-white text-center shadow-sm ring-1 ring-line">
                      <div className="rounded-t-xl bg-midnight-900 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">{fmtDate(w.wedding_date, "MMM")}</div>
                      <div className="py-1 font-serif text-xl leading-none text-ink">{fmtDate(w.wedding_date, "d")}<div className="text-[10px] font-sans text-muted">{fmtDate(w.wedding_date, "yyyy")}</div></div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{w.couple}</p>
                      <p className="truncate text-[13px] text-muted">{w.venue_name}{w.reception_venue_name ? ` + ${w.reception_venue_name}` : ""} · {w.city}, {w.state}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 md:hidden"><Flags w={w} staffed={staffed} /></div>
                    </div>
                    <div className="hidden text-[13px] text-muted md:block">
                      <p className="text-midnight-700">{w.package ?? "—"}</p>
                      <p className="font-mono text-[12px]">{w.booking_number ?? ""}</p>
                    </div>
                    <div className="hidden flex-wrap gap-1.5 md:flex"><Flags w={w} staffed={staffed} /></div>
                    <div className="flex items-center gap-2 text-[12px] text-muted">
                      <span className="hidden whitespace-nowrap sm:inline">{w.status === "cancelled" ? <StatusBadge status="cancelled" /> : d < 0 ? "Past" : d === 0 ? "Today" : `${d} days`}</span>
                      <ChevronRight className="size-4 text-midnight-300" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Flags({ w, staffed }: { w: Record<string, number | string | null>; staffed: boolean }) {
  return (
    <>
      {staffed ? <Badge tone="success">Fully staffed</Badge> : <Badge>{w.confirmed}/{w.slots} confirmed</Badge>}
      {Number(w.pending) > 0 && <Badge tone="warning">{w.pending} to approve</Badge>}
      {Number(w.offered) > 0 && <Badge tone="blush">{w.offered} offered</Badge>}
      {Number(w.open) > 0 && <Badge tone="info">{w.open} open</Badge>}
      {Number(w.cancellations) > 0 && <Badge tone="danger"><AlertTriangle className="size-3" />Cancellation</Badge>}
      {Number(w.changes) > 0 && <Badge tone="warning"><RefreshCw className="size-3" />Client change</Badge>}
    </>
  );
}
