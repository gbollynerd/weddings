import Link from "next/link";
import { Heart, MapPin, Clock, Camera, Video, ChevronRight, CalendarX2 } from "lucide-react";
import { requireActiveMember } from "@/lib/services/me";
import { myAssignments, weddingCounts } from "@/lib/services/team";
import { LinkTabs, StatusBadge, EmptyState, ButtonLink, Badge } from "@/components/ui";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { fmtDate, fmtTime, daysUntil } from "@/lib/utils";

export const metadata = { title: "My Weddings" };

export default async function MyWeddings({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { member } = await requireActiveMember();
  const tab = ((await searchParams).tab ?? "upcoming") as "upcoming" | "completed" | "cancelled";
  const [rows, counts] = await Promise.all([myAssignments(member.id, tab), weddingCounts(member.id)]);
  return (
    <div>
      <LinkTabs active={`/team/weddings?tab=${tab}`} tabs={[
        { href: "/team/weddings?tab=upcoming", label: "Upcoming", count: counts.upcoming },
        { href: "/team/weddings?tab=completed", label: "Completed", count: counts.completed },
        { href: "/team/weddings?tab=cancelled", label: "Cancelled", count: counts.cancelled },
      ]} />
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={tab === "cancelled" ? CalendarX2 : Heart}
            title={tab === "upcoming" ? "No upcoming weddings" : tab === "completed" ? "No completed weddings yet" : "No cancelled weddings"}
            description={tab === "upcoming" ? "Accept an open wedding or keep your availability current so coordinators can staff you." : undefined}
            action={tab === "upcoming" ? <ButtonLink href="/team/open">Browse open weddings</ButtonLink> : undefined} />
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const d = daysUntil(a.wedding_date);
            const status = a.wedding_status === "cancelled" ? "cancelled" : tab === "completed" ? "completed" : a.status === "accepted" ? "confirmed" : a.status;
            return (
              <li key={a.id}>
                <Link href={`/team/weddings/${a.wedding_id}`} className="card group flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] sm:p-5 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-4 lg:w-[300px] lg:shrink-0">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-midnight-50 text-center leading-none">
                      <span className="text-[10px] font-semibold uppercase text-muted">{fmtDate(a.wedding_date, "MMM")}</span>
                      <span className="text-xl font-semibold text-ink">{fmtDate(a.wedding_date, "d")}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-lg text-ink">{a.couple}</p>
                      <p className="text-[12px] text-muted">{fmtDate(a.wedding_date, "EEEE, MMM d, yyyy")}{tab === "upcoming" && d >= 0 ? ` · in ${d} day${d === 1 ? "" : "s"}` : ""}</p>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-3 text-[13px] text-midnight-600 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    <span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-4 shrink-0 text-midnight-300" /><span className="truncate">{a.venue_name}, {a.city}</span></span>
                    <span className="flex items-center gap-1.5">{a.role.includes("photo") ? <Camera className="size-4 text-midnight-300" /> : <Video className="size-4 text-midnight-300" />}{ROLE_LABEL[a.role]}</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="size-4 shrink-0 text-midnight-300" />{fmtTime(a.call_time)} · {a.coverage_hours}h</span>
                    <span className="font-medium text-success-700">{money(a.compensation)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    {tab === "upcoming" && a.status === "accepted" && !a.prep_confirmed_at && d <= 45 && <Badge tone="warning">Review timeline</Badge>}
                    <StatusBadge status={status} />
                    <ChevronRight className="size-5 text-midnight-300 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
