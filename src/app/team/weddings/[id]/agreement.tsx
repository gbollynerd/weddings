"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Download, AlertTriangle, LifeBuoy, Undo2, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, CardBody, Button, Field, Textarea, Alert, Badge } from "@/components/ui";
import { Modal, useAction, useToast } from "@/components/ui/interactive";
import { SignContractModal } from "@/components/contracts/sign-modal";
import { signExistingAction, requestCancellationAction, withdrawCancellationAction, withdrawRequestAction } from "@/lib/actions/team";
import { fmtDate, ago } from "@/lib/utils";

type Cancellation = { id: string; reason: string; late: boolean; days_before: number; status: string; requested_at: string; decided_at: string | null; decision_note: string | null } | null;

export function AgreementCard({ assignmentId, status, past, daysOut, contract, cancellation, memberName, couple }: {
  assignmentId: string; status: string; past: boolean; daysOut: number; memberName: string; couple: string;
  contract: { id: string; signed_at: string; template_version: number } | null; cancellation: Cancellation;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const toast = useToast();
  const [sign, setSign] = React.useState(false);
  const [cancel, setCancel] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const late = daysOut < 14;
  const pendingCancel = cancellation?.status === "pending" ? cancellation : null;
  const kept = cancellation?.status === "kept" ? cancellation : null;

  return (
    <Card>
      <CardHeader title="Your agreement" subtitle="Independent contractor agreement for this wedding" />
      <CardBody className="space-y-4">
        {contract ? (
          <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-midnight-600 shadow-sm"><FileSignature className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">Signed {fmtDate(contract.signed_at)}</p>
              <p className="text-[12px] text-muted">Version {contract.template_version} · {status === "pending" ? "takes effect when approved" : "in effect"}</p>
            </div>
            <a href={`/api/contracts/${contract.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-semibold text-midnight-700 transition hover:bg-white" download>
              <Download className="size-4" />PDF
            </a>
          </div>
        ) : past ? (
          <p className="text-[13px] text-muted">No signed agreement on file for this wedding.</p>
        ) : (
          <Alert tone="warning" icon={FileSignature} title="Agreement not signed yet"
            action={<Button size="sm" onClick={() => setSign(true)}>Review &amp; sign</Button>}>
            You were booked before signed agreements were required. Please sign so we have it on file.
          </Alert>
        )}

        {status === "pending" && !past && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-line p-3 text-[13px] text-muted">
            <span className="flex items-center gap-1.5"><Clock className="size-4" />Waiting for a coordinator to approve you.</span>
            <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => withdrawRequestAction(assignmentId), { onSuccess: () => router.push("/team/open") })}>Withdraw request</Button>
          </div>
        )}

        {status === "accepted" && !past && (pendingCancel ? (
          <Alert tone={pendingCancel.late ? "danger" : "warning"} icon={AlertTriangle} title="Cancellation requested"
            action={<Button size="sm" variant="outline" icon={Undo2} loading={pending} onClick={() => run(() => withdrawCancellationAction(assignmentId), { onSuccess: () => router.refresh() })}>Withdraw</Button>}>
            Sent {ago(pendingCancel.requested_at)}. You&apos;re still on this wedding until your coordinator confirms a replacement or releases you.
            {pendingCancel.late && " Because it's within 14 days of the wedding, it will be noted on your record if approved."}
          </Alert>
        ) : (
          <div className="space-y-3">
            {kept && <Alert tone="info" icon={CheckCircle2} title="You're still on this wedding">Your coordinator couldn&apos;t release you: {kept.decision_note}</Alert>}
            <button onClick={() => { setCancel(true); setReason(""); }} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted underline-offset-4 hover:text-danger-500 hover:underline">
              <LifeBuoy className="size-4" />Can&apos;t make it? Request to cancel
            </button>
          </div>
        ))}
      </CardBody>

      <SignContractModal assignmentId={assignmentId} open={sign} onClose={() => setSign(false)} memberName={memberName}
        title="Sign your agreement" signLabel="Sign agreement" sign={(sig) => signExistingAction(assignmentId, sig)}
        onSigned={(_d, message) => { setSign(false); toast({ tone: "success", title: message ?? "Agreement signed" }); router.refresh(); }} footnote="Your signed copy is saved with the wedding and your coordinator can see it." />

      <Modal open={cancel} onClose={() => setCancel(false)} size="sm" title="Request to cancel" description={couple}
        footer={<><Button variant="outline" onClick={() => setCancel(false)}>Keep the wedding</Button>
          <Button variant="danger" loading={pending} onClick={() => run(() => requestCancellationAction(assignmentId, reason), {
            onSuccess: () => { setCancel(false); router.refresh(); },
          })}>Send request</Button></>}>
        <div className="space-y-4 text-sm">
          {late
            ? <Alert tone="danger" icon={AlertTriangle} title={`The wedding is ${daysOut === 0 ? "today" : `in ${daysOut} day${daysOut === 1 ? "" : "s"}`}`}>Cancellations within 14 days are noted on your record (except genuine emergencies) and can affect future assignments.</Alert>
            : <Badge tone="info">{daysOut} days before the wedding</Badge>}
          <p className="text-muted">Your coordinator will find a replacement or reopen the spot. Until they confirm, <b className="text-ink">you&apos;re still responsible for this wedding</b>.</p>
          <Field label="Why do you need to cancel?" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family emergency — I need to travel out of state that weekend." />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
