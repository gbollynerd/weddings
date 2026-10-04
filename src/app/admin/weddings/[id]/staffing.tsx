"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Camera, Video, UserPlus, CheckCircle2, XCircle, FileText, Download, AlertTriangle, Star, Navigation, Undo2, Repeat, ShieldCheck, ShieldAlert,
  Loader2, Search, Gift, Clock, History, RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardBody, Button, Badge, StatusBadge, Avatar, EmptyState, Field, Textarea, Input, Alert } from "@/components/ui";
import { Modal, useAction } from "@/components/ui/interactive";
import { approveRequestAction, declineRequestAction, candidatesAction, offerSlotAction, withdrawOfferAction, releaseMemberAction, keepMemberAction } from "@/lib/actions/staffing";
import type { Candidate, SlotRow } from "@/lib/services/staffing";
import { ChangeRow, ChangeDecisionModal, type ChangeRowData } from "../../change-requests";
import { describeRequest, type ChangeReq } from "@/app/client/changes";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { milesLabel, mileagePay, LONG_DISTANCE_MILES } from "@/lib/geo";
import { cn, fmtDate, fmtTime, ago } from "@/lib/utils";

type Slot = Omit<SlotRow, "expires_at" | "accepted_at" | "approved_at" | "offered_at"> & { expires_at: string | null; accepted_at: string | null; approved_at: string | null; offered_at: string | null };
type ContractItem = { id: string; role: string; signer_name: string; signed_at: string; template_version: number; status: "active" | "void"; void_reason: string | null; compensation: number };
type CancelItem = { id: string; role: string; reason: string; late: boolean; days_before: number; status: string; requested_at: string; decided_at: string | null; decision_note: string | null; full_name: string; replacement: string | null };

const pdf = (id: string) => `/api/contracts/${id}`;

export function StaffingBoard({ weddingId, past, slots, changes, contracts, cancellations }: {
  weddingId: string; past: boolean; slots: Slot[]; changes: ChangeRowData[]; contracts: ContractItem[]; cancellations: CancelItem[];
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const refresh = () => router.refresh();
  const [assign, setAssign] = React.useState<{ slot: Slot; release: boolean } | null>(null);
  const [decline, setDecline] = React.useState<Slot | null>(null);
  const [keep, setKeep] = React.useState<Slot | null>(null);
  const [note, setNote] = React.useState("");
  const [decide, setDecide] = React.useState<{ r: ChangeRowData; approve: boolean } | null>(null);
  const pendingChanges = changes.filter((c) => c.status === "pending");
  const pastChanges = changes.filter((c) => c.status !== "pending");
  const live = slots.filter((s) => !["cancelled", "filled"].includes(s.status));
  const closed = slots.filter((s) => ["cancelled", "filled"].includes(s.status));

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader title="Team" subtitle="Approve requests, offer slots directly, and handle cancellations" />
          <CardBody className="space-y-3">
            {live.length === 0 && <EmptyState icon={UserPlus} title="No team slots" className="py-6" />}
            {live.map((s) => (
              <SlotCard key={s.id} s={s} past={past} pending={pending}
                onApprove={() => run(() => approveRequestAction(s.id), { onSuccess: refresh })}
                onDecline={() => { setDecline(s); setNote(""); }}
                onAssign={() => setAssign({ slot: s, release: false })}
                onReplace={() => setAssign({ slot: s, release: true })}
                onWithdrawOffer={() => run(() => withdrawOfferAction(s.id), { onSuccess: refresh })}
                onKeep={() => { setKeep(s); setNote(""); }} />
            ))}
            {closed.length > 0 && (
              <details className="rounded-2xl border border-dashed border-line px-4 py-2 text-[13px] text-muted">
                <summary className="cursor-pointer py-1">{closed.length} closed slot{closed.length > 1 ? "s" : ""}</summary>
                <ul className="space-y-1 pb-2 pt-1">{closed.map((s) => <li key={s.id} className="flex justify-between"><span>{ROLE_LABEL[s.role]}{s.member ? ` · ${s.member.name}` : ""}</span><StatusBadge status={s.status} /></li>)}</ul>
              </details>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Client change requests" subtitle={pendingChanges.length ? `${pendingChanges.length} waiting for you` : "Nothing waiting"} />
          <CardBody className="space-y-3">
            {pendingChanges.map((r) => <ChangeRow key={r.id} r={r} showCouple={false} onDecide={(approve) => setDecide({ r, approve })} />)}
            {pastChanges.length > 0 && (
              <ul className="divide-y divide-line rounded-2xl border border-line text-[13px]">
                {pastChanges.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <span className="min-w-0 text-midnight-700"><span className="font-medium capitalize text-ink">{r.kind}</span> · {describeRequest(r as ChangeReq)}{r.decision_note ? <span className="text-muted"> — “{r.decision_note}”</span> : null}</span>
                    <span className="flex items-center gap-2 text-muted"><StatusBadge status={r.status === "approved" ? "accepted" : r.status} label={r.status === "approved" ? "Approved" : undefined} />{r.decided_at ? ago(r.decided_at) : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            {changes.length === 0 && <p className="text-sm text-muted">The couple hasn&apos;t requested any changes.</p>}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Signed agreements" subtitle="Frozen copy of what each person signed" />
          <CardBody>
            {contracts.length === 0 ? <p className="text-sm text-muted">No agreements signed for this wedding yet.</p> : (
              <ul className="space-y-2">
                {contracts.map((c) => (
                  <li key={c.id} className={cn("flex items-center gap-3 rounded-2xl border border-line p-3", c.status === "void" && "opacity-70")}>
                    <FileText className="size-5 shrink-0 text-midnight-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{c.signer_name}</p>
                      <p className="text-[12px] text-muted">{ROLE_LABEL[c.role]} · {fmtDate(c.signed_at)} · v{c.template_version}</p>
                      {c.status === "void" && <p className="text-[12px] text-danger-500">Void — {c.void_reason}</p>}
                    </div>
                    <a href={pdf(c.id)} className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-midnight-600 hover:bg-canvas" aria-label={`Download ${c.signer_name}'s agreement`} title="Download PDF"><Download className="size-4" /></a>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Cancellation history" />
          <CardBody>
            {cancellations.length === 0 ? <p className="text-sm text-muted">No one has asked to cancel.</p> : (
              <ul className="space-y-3 text-[13px]">
                {cancellations.map((c) => (
                  <li key={c.id} className="rounded-2xl bg-canvas p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-ink">{c.full_name} · {ROLE_LABEL[c.role]}</p>
                      <span className="flex gap-1.5">{c.late && <Badge tone="danger">Late · {c.days_before}d</Badge>}<Badge tone={c.status === "pending" ? "warning" : "neutral"} className="capitalize">{c.status}</Badge></span>
                    </div>
                    <p className="mt-1 text-midnight-700">“{c.reason}”</p>
                    <p className="mt-1 text-muted">Requested {fmtDate(c.requested_at)}{c.replacement ? ` · replaced by ${c.replacement}` : ""}{c.decision_note ? ` · ${c.decision_note}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <AssignModal state={assign} onClose={() => setAssign(null)} onDone={() => { setAssign(null); refresh(); }} />
      <ChangeDecisionModal decide={decide} onClose={() => setDecide(null)} />

      <Modal open={!!decline} onClose={() => setDecline(null)} size="sm" title="Decline this request?" description={decline?.member ? `${decline.member.name} · ${ROLE_LABEL[decline.role]}` : ""}
        footer={<><Button variant="outline" onClick={() => setDecline(null)}>Cancel</Button>
          <Button variant="danger" loading={pending} onClick={() => decline && run(() => declineRequestAction(decline.id, note), { onSuccess: () => { setDecline(null); refresh(); } })}>Decline</Button></>}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">The slot goes back on Open Weddings and their signed agreement is voided (the copy is kept).</p>
          <Field label="Message to them (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. We've gone with someone local for this one — thank you!" /></Field>
        </div>
      </Modal>

      <Modal open={!!keep} onClose={() => setKeep(null)} size="sm" title="Keep them on the wedding?" description={keep?.member ? `${keep.member.name} asked to cancel` : ""}
        footer={<><Button variant="outline" onClick={() => setKeep(null)}>Cancel</Button>
          <Button loading={pending} onClick={() => keep && run(() => keepMemberAction(keep.id, note), { onSuccess: () => { setKeep(null); refresh(); } })}>Decline cancellation</Button></>}>
        <Field label="Explain why (shared with them)" required><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. We can't find cover this close to the date — call me and we'll work something out." /></Field>
      </Modal>
    </div>
  );
}

function SlotCard({ s, past, pending, onApprove, onDecline, onAssign, onReplace, onWithdrawOffer, onKeep }: {
  s: Slot; past: boolean; pending: boolean; onApprove: () => void; onDecline: () => void; onAssign: () => void; onReplace: () => void; onWithdrawOffer: () => void; onKeep: () => void;
}) {
  const isPhoto = s.role.endsWith("photo");
  const m = s.member;
  const miles = m?.distance?.miles ?? null;
  return (
    <div className={cn("rounded-2xl border p-4", s.cancellation ? (s.cancellation.late ? "border-danger-500/40 bg-danger-50/40" : "border-warning-500/40 bg-warning-50/40") : s.status === "pending" ? "border-warning-500/30" : "border-line")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">{isPhoto ? <Camera className="size-4 text-blush-500" /> : <Video className="size-4 text-info-500" />}{ROLE_LABEL[s.role]}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
          <span>{fmtTime(s.call_time)} · {s.coverage_hours}h · {money(s.compensation)}</span>
          <StatusBadge status={s.status} label={s.status === "accepted" ? "Confirmed" : s.status === "pending" ? "Needs approval" : s.status === "offered" ? "Offered" : undefined} />
        </div>
      </div>

      {m ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Avatar name={m.name} src={m.avatar_url} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{m.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge><Star className="size-3 fill-blush-400 text-blush-400" />{m.rating.toFixed(1)}</Badge>
              <span title={m.distance?.exact ? "Straight line from their home address" : "Estimated from their home market"}><Badge><Navigation className="size-3" />{milesLabel(m.distance)}{miles != null && miles > LONG_DISTANCE_MILES ? " · long-distance" : ""}</Badge></span>
              {mileagePay(miles) > 0 && <Badge tone="info">+{money(mileagePay(miles))} mileage</Badge>}
              {m.docs_ok ? <Badge tone="success"><ShieldCheck className="size-3" />Docs OK</Badge> : <Badge tone="warning"><ShieldAlert className="size-3" />Docs missing</Badge>}
              {m.late_cancels > 0 && <Badge tone="danger">{m.late_cancels} late cancel{m.late_cancels > 1 ? "s" : ""}</Badge>}
              {s.contract ? <a href={pdf(s.contract.id)}><Badge tone="success"><FileText className="size-3" />Signed {fmtDate(s.contract.signed_at as unknown as string, "MMM d")}</Badge></a>
                : s.status === "offered" ? <Badge tone="blush"><Clock className="size-3" />Waiting for signature</Badge> : <Badge tone="warning">No signed agreement</Badge>}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">{s.status === "open" ? <>Open on Open Weddings{s.expires_at ? ` · ${new Date(s.expires_at) < new Date() ? "listing ended" : "closes"} ${ago(s.expires_at)}` : ""}</> : s.status === "expired" ? "Nobody took this slot before the listing ended — assign someone directly." : "Unassigned"}</p>
      )}

      {s.cancellation && (
        <Alert tone={s.cancellation.late ? "danger" : "warning"} icon={AlertTriangle} className="mt-3" title={`${s.cancellation.late ? "Late cancellation" : "Cancellation"} requested ${ago(s.cancellation.requested_at as unknown as string)} · ${s.cancellation.days_before} days out`}>
          “{s.cancellation.reason}” They stay on the wedding until you reassign or reopen the slot.
        </Alert>
      )}
      {s.status === "offered" && s.offered_at && <p className="mt-2 text-[12px] text-muted"><Gift className="mr-1 inline size-3.5" />Offered {ago(s.offered_at)}{s.offered_by_name ? ` by ${s.offered_by_name}` : ""}</p>}
      {s.status === "accepted" && s.approved_at && <p className="mt-2 text-[12px] text-muted">Approved {fmtDate(s.approved_at)}{s.approved_by_name ? ` by ${s.approved_by_name}` : ""}</p>}

      {!past && (
        <div className="mt-3 flex flex-wrap gap-2">
          {s.status === "pending" && <>
            <Button size="sm" icon={CheckCircle2} loading={pending} onClick={onApprove}>Approve</Button>
            <Button size="sm" variant="outline" icon={XCircle} onClick={onDecline}>Decline</Button>
          </>}
          {(s.status === "open" || s.status === "expired") && <Button size="sm" icon={UserPlus} onClick={onAssign}>Assign someone</Button>}
          {s.status === "offered" && <Button size="sm" variant="outline" icon={Undo2} loading={pending} onClick={onWithdrawOffer}>Withdraw offer</Button>}
          {s.status === "accepted" && (s.cancellation ? <>
            <Button size="sm" icon={Repeat} onClick={onReplace}>Release &amp; reassign</Button>
            <Button size="sm" variant="outline" onClick={onKeep}>Keep them on</Button>
          </> : <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onReplace}>Replace or remove</Button>)}
        </div>
      )}
    </div>
  );
}

/** Pick a team member for a slot. With release=true the current person is taken off first. */
function AssignModal({ state, onClose, onDone }: { state: { slot: Slot; release: boolean } | null; onClose: () => void; onDone: () => void }) {
  const { run, pending } = useAction();
  const [list, setList] = React.useState<Candidate[] | null>(null);
  const [pick, setPick] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"offer" | "reopen">("offer");
  const [q, setQ] = React.useState("");
  const [note, setNote] = React.useState("");
  const slot = state?.slot;
  React.useEffect(() => {
    if (!state) return;
    setList(null); setPick(null); setQ(""); setNote(""); setMode("offer");
    let live = true;
    candidatesAction(state.slot.id).then((r) => live && setList(r.data ?? []));
    return () => { live = false; };
  }, [state]);
  const shown = (list ?? []).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.city ?? "").toLowerCase().includes(q.toLowerCase()));
  const chosen = list?.find((c) => c.id === pick);
  const submit = () => {
    if (!slot) return;
    if (state!.release) run(() => releaseMemberAction(slot.id, mode === "offer" ? pick : null, note), { onSuccess: onDone });
    else if (pick) run(() => offerSlotAction(slot.id, pick, note), { onSuccess: onDone });
  };
  const canSubmit = state?.release ? mode === "reopen" || !!pick : !!pick;
  return (
    <Modal open={!!state} onClose={onClose} size="lg"
      title={state?.release ? `Replace ${slot?.member?.name ?? "team member"}` : `Assign ${slot ? ROLE_LABEL[slot.role].toLowerCase() : ""}`}
      description={state?.release ? "They're taken off the wedding, their agreement is voided, and they're notified." : "They'll be asked to sign the agreement; once signed they're confirmed."}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={pending} disabled={!canSubmit} onClick={submit}>
          {state?.release ? (mode === "reopen" ? "Release & reopen slot" : chosen ? `Release & offer to ${chosen.name.split(" ")[0]}` : "Choose a replacement") : chosen ? `Offer to ${chosen.name.split(" ")[0]}` : "Choose someone"}
        </Button></>}>
      <div className="space-y-4">
        {state?.release && (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What happens to the slot">
            {([["offer", "Offer to a specific person", "Pick a replacement below; they sign to confirm."], ["reopen", "Reopen on Open Weddings", "Anyone eligible can request it; you approve."]] as const).map(([v, t, d]) => (
              <label key={v} className={cn("cursor-pointer rounded-2xl border p-3 text-sm transition", mode === v ? "border-midnight-900 ring-2 ring-midnight-900/10" : "border-line hover:border-midnight-200")}>
                <input type="radio" name="release-mode" className="sr-only" checked={mode === v} onChange={() => setMode(v)} />
                <span className="block font-medium text-ink">{t}</span><span className="block text-[12px] text-muted">{d}</span>
              </label>
            ))}
          </div>
        )}
        {(!state?.release || mode === "offer") && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city" className="h-10 pl-9" aria-label="Search team" />
            </div>
            <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin" role="radiogroup" aria-label="Team members">
              {list === null ? <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted"><Loader2 className="size-4 animate-spin" />Finding who&apos;s free…</p>
                : shown.length === 0 ? <p className="py-8 text-center text-sm text-muted">No eligible team members.</p>
                : shown.map((c) => (
                  <label key={c.id} className={cn("flex items-center gap-3 rounded-2xl border p-3 transition", c.blocked ? "cursor-not-allowed border-line opacity-60" : pick === c.id ? "cursor-pointer border-midnight-900 ring-2 ring-midnight-900/10" : "cursor-pointer border-line hover:border-midnight-200")}>
                    <input type="radio" name="candidate" className="size-4 shrink-0 accent-midnight-900" disabled={!!c.blocked} checked={pick === c.id} onChange={() => setPick(c.id)} aria-label={c.name} />
                    <Avatar name={c.name} src={c.avatar_url} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                      <span className="block truncate text-[12px] text-muted">{c.city ?? "—"} · {c.upcoming} upcoming{c.declined ? " · declined this before" : ""}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <Badge><Navigation className="size-3" />{milesLabel(c.distance)}</Badge>
                        {c.blocked ? <Badge tone="danger">{c.blocked}</Badge> : c.calendar === "available" ? <Badge tone="success">Available</Badge> : <Badge>Calendar not set</Badge>}
                        {!c.docs_ok && <Badge tone="warning">Docs missing</Badge>}
                        {c.late_cancels > 0 && <Badge tone="danger">{c.late_cancels} late cancel{c.late_cancels > 1 ? "s" : ""}</Badge>}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[12px] text-muted"><Star className="mr-0.5 inline size-3 fill-blush-400 text-blush-400" />{c.rating.toFixed(1)}{c.mileage > 0 && <span className="block">+{money(c.mileage)}</span>}</span>
                  </label>
                ))}
            </div>
          </>
        )}
        <Field label={state?.release ? "Note to the person being released (optional)" : "Note with the offer (optional)"}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[64px]" placeholder={state?.release ? "e.g. Hope everything's OK — we've got it covered." : "e.g. You'd be a great fit — the couple loves documentary style."} />
        </Field>
        <p className="flex items-center gap-1.5 text-[12px] text-muted"><History className="size-3.5" />Distances are straight-line from each person&apos;s home base (≈). Mileage is paid beyond 100 mi.</p>
      </div>
    </Modal>
  );
}
