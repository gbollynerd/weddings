"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, FileText, Star, Camera, Video } from "lucide-react";
import { Card, CardHeader, CardBody, StatusBadge, Button, EmptyState, Field, Textarea, Avatar, Badge } from "@/components/ui";
import { Modal, Tabs, useAction } from "@/components/ui/interactive";
import { reviewLicenseAction, decideRequestAction, markPayoutAction } from "@/lib/actions/admin";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { fmtDate, ago } from "@/lib/utils";

type Any = Record<string, never> & Record<string, string | number | null>;
const DOC: Record<string, string> = { drivers_license: "Driver's license", insurance: "Liability insurance", w9: "W-9", business_license: "Business license", other: "Other" };

export function AdminBoard({ bookings, licenses, requests, payouts, open, team }: { bookings: Any[]; licenses: Any[]; requests: Any[]; payouts: Any[]; open: Any[]; team: Any[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [tab, setTab] = React.useState<"queue" | "bookings" | "slots" | "team">("queue");
  const [reject, setReject] = React.useState<Any | null>(null);
  const [reason, setReason] = React.useState("");
  const done = () => router.refresh();
  const queueCount = licenses.length + requests.length + payouts.length;
  return (
    <div id="bookings" className="space-y-5">
      <Tabs value={tab} onChange={setTab} items={[{ value: "queue", label: "Action queue", count: queueCount }, { value: "bookings", label: "Bookings", count: bookings.length }, { value: "slots", label: "Open slots", count: open.length }, { value: "team", label: "Team", count: team.length }]} />

      {tab === "queue" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader title="License review" subtitle="Verify compliance documents" />
            <CardBody className="space-y-3">
              {licenses.length === 0 && <EmptyState icon={CheckCircle2} title="Nothing to review" className="py-6" />}
              {licenses.map((l) => (
                <div key={l.id as string} className="rounded-2xl border border-line p-3">
                  <p className="text-sm font-medium text-ink">{l.full_name} · {DOC[l.doc_type as string]}</p>
                  <p className="flex items-center gap-1.5 text-[12px] text-muted"><FileText className="size-3.5" />{l.file_name} · {l.expires_on ? `exp. ${fmtDate(l.expires_on as string)}` : "no expiry"} · {ago(l.uploaded_at as string)}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" icon={CheckCircle2} loading={pending} onClick={() => run(() => reviewLicenseAction(l.id as string, "verified"), { onSuccess: done })}>Verify</Button>
                    <Button size="sm" variant="outline" icon={XCircle} onClick={() => { setReject(l); setReason(""); }}>Reject</Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Assignment requests" subtitle="Travel weddings needing approval" />
            <CardBody className="space-y-3">
              {requests.length === 0 && <EmptyState icon={CheckCircle2} title="No pending requests" className="py-6" />}
              {requests.map((r) => (
                <div key={r.id as string} className="rounded-2xl border border-line p-3">
                  <p className="text-sm font-medium text-ink">{r.full_name} → {r.couple}</p>
                  <p className="text-[12px] text-muted">{ROLE_LABEL[r.role as string]} · {fmtDate(r.wedding_date as string)} · {r.city} · {money(r.compensation as number)}{r.travel_miles ? ` · ${r.travel_miles} mi` : ""}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" loading={pending} onClick={() => run(() => decideRequestAction(r.id as string, true), { onSuccess: done })}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => run(() => decideRequestAction(r.id as string, false), { onSuccess: done })}>Decline</Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Payouts" subtitle="Requested by the team" />
            <CardBody className="space-y-3">
              {payouts.length === 0 && <EmptyState icon={CheckCircle2} title="All paid" className="py-6" />}
              {payouts.map((p) => (
                <div key={p.id as string} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center justify-between"><p className="text-sm font-medium text-ink">{p.full_name}</p><StatusBadge status={p.status as string} /></div>
                  <p className="text-[12px] text-muted">{p.couple ?? "—"} · {money(Number(p.total))} · requested {p.requested_at ? ago(p.requested_at as string) : "—"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.status !== "processing" && <Button size="sm" variant="outline" onClick={() => run(() => markPayoutAction(p.id as string, "processing"), { onSuccess: done })}>Processing</Button>}
                    <Button size="sm" loading={pending} onClick={() => run(() => markPayoutAction(p.id as string, "paid"), { onSuccess: done })}>Mark paid</Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "bookings" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-line bg-canvas/60 text-left text-[12px] uppercase tracking-wide text-muted"><th className="px-6 py-3 font-medium">Booking</th><th className="px-4 py-3 font-medium">Couple</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Location</th><th className="px-4 py-3 font-medium">Package</th><th className="px-4 py-3 font-medium">Paid</th><th className="px-4 py-3 font-medium">Team</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
              <tbody>{bookings.map((b) => (
                <tr key={b.booking_number as string} className="border-b border-line/70 last:border-0">
                  <td className="px-6 py-3 font-mono text-[12px] text-midnight-600">{b.booking_number}</td><td className="px-4 py-3 font-medium text-ink">{b.couple}</td><td className="px-4 py-3">{fmtDate(b.wedding_date as string)}</td>
                  <td className="px-4 py-3">{b.city}, {b.state}</td><td className="px-4 py-3">{b.package}</td><td className="px-4 py-3">{money(b.paid as number)} / {money(b.total as number)}</td>
                  <td className="px-4 py-3">{Number(b.open_slots) ? <Badge tone="warning">{b.open_slots} open</Badge> : <Badge tone="success">Staffed</Badge>}</td><td className="px-4 py-3"><StatusBadge status={b.status as string} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "slots" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {open.map((o) => (
            <Card key={o.id as string} className="p-5">
              <div className="flex items-center justify-between"><p className="font-medium text-ink">{o.couple}</p><StatusBadge status="open" /></div>
              <p className="mt-1 text-[13px] text-muted">{fmtDate(o.wedding_date as string, "EEE, MMM d")} · {o.city}, {o.state}</p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-midnight-700">{String(o.role).includes("photo") ? <Camera className="size-4" /> : <Video className="size-4" />}{ROLE_LABEL[o.role as string]} · {money(o.compensation as number)}</p>
              {o.expires_at && <p className="mt-1 text-[12px] text-muted">Offer closes {ago(o.expires_at as string)}</p>}
            </Card>
          ))}
        </div>
      )}

      {tab === "team" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {team.map((t) => (
            <Card key={t.full_name as string} className="flex items-center gap-3 p-4">
              <Avatar name={t.full_name as string} src={t.avatar_url as string | null} size={44} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium text-ink">{t.full_name}</p><p className="text-[12px] text-muted">{t.discipline === "photo" ? "Photographer" : "Videographer"} · {t.city}</p></div>
              <div className="text-right text-[12px]"><p className="flex items-center gap-1 text-ink"><Star className="size-3 fill-blush-400 text-blush-400" />{Number(t.rating).toFixed(1)}</p><p className="text-muted">{t.upcoming} upcoming</p></div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!reject} onClose={() => setReject(null)} size="sm" title="Reject document" description={reject ? `${reject.full_name} · ${reject.file_name}` : ""}
        footer={<><Button variant="outline" onClick={() => setReject(null)}>Cancel</Button><Button variant="danger" loading={pending} onClick={() => reject && run(() => reviewLicenseAction(reject.id as string, "rejected", reason), { onSuccess: () => { setReject(null); done(); } })}>Reject</Button></>}>
        <Field label="Reason (shared with the team member)"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The certificate is expired — please upload the current policy." /></Field>
      </Modal>
    </div>
  );
}
