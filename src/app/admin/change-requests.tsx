"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package as PackageIcon, CalendarClock, AlertTriangle, MapPin, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Button, Field, Textarea, Badge } from "@/components/ui";
import { Modal, useAction } from "@/components/ui/interactive";
import { decideChangeRequestAction } from "@/lib/actions/changes";
import { describeRequest, type ChangeReq } from "@/app/client/changes";
import { money } from "@/lib/pricing";
import { fmtDate, ago } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChangeRowData = Record<string, any>;
const ICON = { package: PackageIcon, date: CalendarClock, venue: MapPin, details: SlidersHorizontal } as const;
const LABEL: Record<string, string> = { package: "package", date: "date", venue: "venue", details: "details" };

export function ChangeRow({ r, onDecide, showCouple = true }: { r: ChangeRowData; onDecide: (approve: boolean) => void; showCouple?: boolean }) {
  const Icon = ICON[r.kind as keyof typeof ICON] ?? SlidersHorizontal;
  const diff = r.kind === "package" ? Number(r.total_after) - Number(r.total_before) : 0;
  const avail = r.availability as string | null;
  const removed = (r.removed_addons as string[] | null) ?? [];
  const what = describeRequest(r as ChangeReq);
  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink"><Icon className="size-4 text-midnight-400" />
          {showCouple ? (r.wedding_id ? <Link href={`/admin/weddings/${r.wedding_id}`} className="hover:underline">{r.couple}</Link> : r.couple) : <span className="capitalize">{LABEL[r.kind]} change</span>}
        </p>
        <span className="shrink-0 text-[12px] text-muted">{ago(r.created_at as string)}</span>
      </div>
      <p className="mt-1 text-[13px] text-midnight-700">
        {what}
        {r.kind === "package" && <> · <span className={diff < 0 ? "text-success-700" : ""}>{diff === 0 ? "no price change" : `${diff > 0 ? "+" : "−"}${money(Math.abs(diff))}`}</span></>}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {showCouple && <Badge className="capitalize">{LABEL[r.kind]}</Badge>}
        {r.booking_number && <Badge>{r.booking_number}</Badge>}{r.city && <Badge>{r.city}</Badge>}
        {avail && <Badge tone={avail === "available" ? "success" : avail === "limited" ? "warning" : "danger"}>{avail === "available" ? "Team available" : avail === "limited" ? "Limited availability" : "Date fully booked"}</Badge>}
        {r.days_out != null && Number(r.days_out) <= 90 && <Badge tone="warning">Within 90 days</Badge>}
      </div>
      {removed.length > 0 && <p className="mt-2 flex items-start gap-1.5 text-[12px] text-warning-700"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />Removes {removed.join(", ")}</p>}
      {r.note && <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-[13px] text-midnight-700">“{r.note}”</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => onDecide(true)}>Approve</Button>
        <Button size="sm" variant="outline" onClick={() => onDecide(false)}>Decline</Button>
      </div>
    </div>
  );
}

/** Approve / decline a couple's change request, explaining exactly what approval does. */
export function ChangeDecisionModal({ decide, onClose }: { decide: { r: ChangeRowData; approve: boolean } | null; onClose: () => void }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [note, setNote] = React.useState("");
  React.useEffect(() => { if (decide) setNote(""); }, [decide]);
  const r = decide?.r;
  const p = (r?.payload ?? {}) as Record<string, unknown>;
  return (
    <Modal open={!!decide} onClose={onClose} size="sm"
      title={decide && r ? `${decide.approve ? "Approve" : "Decline"} ${LABEL[r.kind]} change` : ""}
      description={r ? `${r.couple ?? ""}${r.booking_number ? ` · ${r.booking_number}` : ""}` : ""}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant={decide?.approve ? "primary" : "danger"} loading={pending}
          onClick={() => decide && run(() => decideChangeRequestAction(decide.r.id as string, decide.approve, note), { onSuccess: () => { onClose(); router.refresh(); } })}>
          {decide?.approve ? "Approve change" : "Decline"}</Button></>}>
      {decide && r && (
        <div className="space-y-4">
          {decide.approve && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-midnight-700">
              {r.kind === "package" ? <>
                <li>Booking moves to <b>{r.to_package}</b> and the total becomes {money(r.total_after as number)}.</li>
                <li>The difference is applied to the remaining payment schedule{Number(r.total_after) < Number(r.total_before) ? " (overpayment is refunded)" : ""}.</li>
                <li>Team slots and coverage hours are updated; affected team members are notified.</li>
              </> : r.kind === "date" ? <>
                <li>The wedding moves to <b>{fmtDate(r.to_date as string)}</b> and payment due dates follow.</li>
                <li>Assigned team members are released, their agreements are voided, and they&apos;re asked to re-accept for the new date.</li>
              </> : r.kind === "venue" ? <>
                <li>{describeRequest(r as ChangeReq)}.</li>
                <li>The team&apos;s venue sheet and directions update, and distances/mileage are re-measured.</li>
                <li>Everyone on the wedding is notified.</li>
              </> : <>
                <li>{describeRequest(r as ChangeReq)}.</li>
                {p.start_time != null && <li>The timeline and every team call time shift by the same amount.</li>}
                <li>Everyone on the wedding is notified.</li>
              </>}
            </ul>
          )}
          <Field label={decide.approve ? "Note to the couple (optional)" : "Reason (shared with the couple)"} required={!decide.approve}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={decide.approve ? "e.g. All set — we've let your team know!" : "e.g. We don't have a full team that day — could you look at the 14th?"} />
          </Field>
          {r.wedding_id && <Link href={`/admin/weddings/${r.wedding_id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-midnight-700 hover:underline">Open the wedding<ArrowRight className="size-3.5" /></Link>}
        </div>
      )}
    </Modal>
  );
}
