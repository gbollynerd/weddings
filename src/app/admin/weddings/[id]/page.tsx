import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Users, Clock, Mail, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { adminWedding } from "@/lib/services/staffing";
import { checkAvailability } from "@/lib/services/catalog";
import { Card, CardHeader, CardBody, StatusBadge, Badge, DescList } from "@/components/ui";
import { weddingPlaces, placeLine } from "@/lib/venues";
import { money } from "@/lib/pricing";
import { fmtLong, fmtTime, daysUntil } from "@/lib/utils";
import { StaffingBoard } from "./staffing";
import { ClientMessages } from "./client-messages";
import { clientThreadsForWedding } from "@/lib/services/messages";

export const metadata = { title: "Wedding" };
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

export default async function AdminWeddingPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser(["coordinator", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await adminWedding(id);
  if (!data) notFound();
  const { wedding: w, slots, changes, contracts, cancellations } = data;
  const d = daysUntil(w.wedding_date);
  const threads = w.client_email ? await clientThreadsForWedding(id, me.id) : [];
  const places = weddingPlaces(w as never);
  const changeRows = await Promise.all(changes.map(async (c) => ({
    ...c, couple: w.couple, booking_number: w.booking_number, created_at: iso(c.created_at), decided_at: iso(c.decided_at),
    availability: c.kind === "date" && c.status === "pending" ? (await checkAvailability(w.market_slug, c.to_date, w.service_slug ?? "photo")).level : null,
    days_out: c.kind === "date" ? d : null,
  })));
  const confirmed = slots.filter((s) => s.status === "accepted" || s.status === "completed").length;
  const active = slots.filter((s) => !["cancelled", "expired", "filled"].includes(s.status)).length;

  return (
    <div className="space-y-6">
      <Link href="/admin/weddings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" />Weddings</Link>
      <div className="card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={w.status} />
              {w.booking_number && <Badge>{w.booking_number}</Badge>}
              <Badge tone={confirmed === active && active > 0 ? "success" : "warning"}><Users className="size-3" />{confirmed}/{active} confirmed</Badge>
              {d >= 0 && <Badge>{d === 0 ? "Today" : `In ${d} days`}</Badge>}
            </div>
            <h1 className="mt-3 font-serif text-3xl text-ink">{w.couple}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-midnight-600">
              <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-midnight-300" />{fmtLong(w.wedding_date)}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-4 text-midnight-300" />Starts {fmtTime(w.start_time)}</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-4 text-midnight-300" />{placeLine(places.ceremony)}{places.same ? "" : ` → ${placeLine(places.reception)}`} · {w.city}, {w.state}</span>
            </div>
          </div>
          {w.client_email && (
            <div className="w-full shrink-0 space-y-1 rounded-2xl bg-canvas p-4 text-[13px] md:w-72">
              <p className="font-medium text-ink">{w.partner_one} &amp; {w.partner_two}</p>
              <a href={`mailto:${w.client_email}`} className="flex items-center gap-1.5 text-midnight-600 hover:underline"><Mail className="size-3.5" />{w.client_email}</a>
              {w.client_phone && <a href={`tel:${w.client_phone}`} className="flex items-center gap-1.5 text-midnight-600 hover:underline"><Phone className="size-3.5" />{w.client_phone}</a>}
              <div className="pt-2">
                <ClientMessages weddingId={id} couple={w.couple} firstName={(w.partner_one ?? "").split(" ")[0] || "there"} canMessage={w.client_status === "active"}
                  threads={threads.map((t) => ({ ...t, last_message_at: new Date(t.last_message_at).toISOString() }))} />
              </div>
            </div>
          )}
        </div>
      </div>

      <StaffingBoard
        weddingId={id}
        past={d < 0}
        slots={slots.map((s) => ({ ...s, expires_at: iso(s.expires_at), accepted_at: iso(s.accepted_at), approved_at: iso(s.approved_at), offered_at: iso(s.offered_at) })) as never}
        changes={changeRows as never}
        contracts={contracts.map((c) => ({ ...c, signed_at: iso(c.signed_at) })) as never}
        cancellations={cancellations.map((c) => ({ ...c, requested_at: iso(c.requested_at), decided_at: iso(c.decided_at) })) as never}
      />

      <Card>
        <CardHeader title="Wedding details" />
        <CardBody>
          <DescList cols={3} items={[
            ["Package", `${w.package ?? "—"}${w.total ? ` · ${money(w.total)}` : ""}`],
            ["Guests", w.guest_count],
            ["Style", w.wedding_type],
            ["Ceremony", `${placeLine(places.ceremony)}${places.ceremony.address ? ` — ${places.ceremony.address}` : ""}`],
            ["Reception", places.same ? (places.reception.area ? `Same venue · ${places.reception.area}` : "Same venue") : `${placeLine(places.reception)}${places.reception.address ? ` — ${places.reception.address}` : ""}`],
            ["Venue on map", w.venue_lat != null ? "Geocoded" : "City centre (address not geocoded yet)"],
            ["Special requests", w.special_requests ?? "—"],
            ["Notes", w.notes ?? "—"],
          ]} />
        </CardBody>
      </Card>
    </div>
  );
}
