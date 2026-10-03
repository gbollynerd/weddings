"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Upload, FileText, IdCard, Building2, Umbrella, Receipt, Award, CheckCircle2, AlertTriangle, Clock, XCircle, Loader2, Info } from "lucide-react";
import { Card, CardHeader, Button, StatusBadge, Field, Select, Input, Alert, Progress, Badge } from "@/components/ui";
import { Modal, useAction, useToast } from "@/components/ui/interactive";
import { submitLicenseAction } from "@/lib/actions/team";
import { uploadFile } from "@/lib/client-upload";
import { cn, fmtDate, ago, bytes, daysUntil } from "@/lib/utils";

type Row = { id: string; doc_type: string; label: string | null; file_name: string; status: string; expires_on: string | null; uploaded_at: string; reviewed_at: string | null; rejection_reason: string | null };
type Req = { type: string; label: string; required: boolean; status: string; current: Row | null };
const ICON: Record<string, typeof IdCard> = { drivers_license: IdCard, business_license: Building2, insurance: Umbrella, w9: Receipt, other: Award };
const NEEDS_EXPIRY = ["drivers_license", "insurance", "business_license"];
const HELP: Record<string, string> = {
  drivers_license: "Front of a valid government-issued driver's license.",
  insurance: "Certificate of general liability insurance — $1M per occurrence minimum.",
  w9: "Signed IRS Form W-9 for 1099 reporting.",
  business_license: "Local business license, if your city requires one.",
  other: "Additional certifications such as FAA Part 107 for drone work.",
};

export function LicensesView({ required, history }: { required: Req[]; history: Row[] }) {
  const [uploadFor, setUploadFor] = React.useState<string | null>(null);
  const verified = required.filter((r) => r.required && ["verified", "expiring_soon"].includes(r.status)).length;
  const reqCount = required.filter((r) => r.required).length;
  const eligible = verified === reqCount;
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center">
          <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", eligible ? "bg-success-50 text-success-500" : "bg-warning-50 text-warning-500")}>{eligible ? <ShieldCheck className="size-7" /> : <AlertTriangle className="size-7" />}</span>
          <div className="flex-1">
            <p className="text-lg font-semibold text-ink">{eligible ? "You're compliant and eligible for assignments" : "Action needed to stay eligible"}</p>
            <p className="text-sm text-muted">{verified} of {reqCount} required documents verified. Our team reviews new uploads within 2 business days.</p>
            <Progress value={(verified / reqCount) * 100} tone={eligible ? "success" : "blush"} className="mt-3 max-w-md" />
          </div>
          <Button icon={Upload} onClick={() => setUploadFor("")}>Upload document</Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {required.map((r) => {
          const I = ICON[r.type] ?? FileText;
          const d = r.current?.expires_on ? daysUntil(r.current.expires_on) : null;
          return (
            <Card key={r.type} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-midnight-50 text-midnight-600"><I className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="font-semibold text-ink">{r.label}</p><StatusBadge status={r.status} /></div>
                  <p className="text-[12px] text-muted">{r.required ? "Required" : "Optional"} · {HELP[r.type]}</p>
                </div>
              </div>
              <div className="mt-4 flex-1 space-y-1.5 text-[13px]">
                {r.current ? (
                  <>
                    <p className="flex items-center gap-2 text-midnight-700"><FileText className="size-3.5 text-midnight-300" /><span className="truncate">{r.current.file_name}</span></p>
                    <p className="text-muted">Uploaded {fmtDate(r.current.uploaded_at)}{r.current.expires_on ? ` · Expires ${fmtDate(r.current.expires_on)}` : ""}</p>
                    {d !== null && d >= 0 && d <= 30 && <p className="font-medium text-warning-700">Expires in {d} days — upload a renewal.</p>}
                    {r.status === "expired" && <p className="font-medium text-danger-500">Expired {Math.abs(d ?? 0)} days ago.</p>}
                    {r.status === "rejected" && r.current.rejection_reason && <p className="rounded-lg bg-danger-50 px-2.5 py-1.5 text-danger-700">{r.current.rejection_reason}</p>}
                  </>
                ) : <p className="text-muted">Nothing uploaded yet.</p>}
              </div>
              <Button variant={["rejected", "expired", "expiring_soon"].includes(r.status) || (r.required && r.status === "not_submitted") ? "primary" : "outline"} size="sm" className="mt-4" icon={Upload} onClick={() => setUploadFor(r.type)}>
                {r.status === "not_submitted" ? "Upload" : ["expired", "expiring_soon"].includes(r.status) ? "Upload renewal" : r.status === "rejected" ? "Re-upload" : "Replace"}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Submission history" subtitle="Every document you've submitted and its review outcome" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-y border-line bg-canvas/60 text-left text-[12px] uppercase tracking-wide text-muted">
              <th className="px-6 py-3 font-medium">Document type</th><th className="px-4 py-3 font-medium">File</th><th className="px-4 py-3 font-medium">Uploaded</th><th className="px-4 py-3 font-medium">Expires</th><th className="px-4 py-3 font-medium">Verification</th>
            </tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-line/70 last:border-0">
                  <td className="px-6 py-3.5 font-medium text-ink">{required.find((r) => r.type === h.doc_type)?.label ?? h.doc_type}</td>
                  <td className="max-w-[220px] truncate px-4 py-3.5 text-midnight-600">{h.file_name}</td>
                  <td className="px-4 py-3.5 text-midnight-600">{fmtDate(h.uploaded_at)}</td>
                  <td className="px-4 py-3.5 text-midnight-600">{h.expires_on ? fmtDate(h.expires_on) : "—"}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={h.status} />{h.reviewed_at && <span className="ml-2 text-[11px] text-muted">reviewed {ago(h.reviewed_at)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <UploadLicenseModal open={uploadFor !== null} initialType={uploadFor ?? ""} onClose={() => setUploadFor(null)} required={required} />
    </div>
  );
}

function UploadLicenseModal({ open, onClose, initialType, required }: { open: boolean; onClose: () => void; initialType: string; required: Req[] }) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useAction();
  const [type, setType] = React.useState(initialType);
  const [expires, setExpires] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [up, setUp] = React.useState<{ pct: number; state: "idle" | "uploading" | "done" | "error"; key?: string | null; error?: string }>({ pct: 0, state: "idle" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (open) { setType(initialType); setExpires(""); setLabel(""); setFile(null); setUp({ pct: 0, state: "idle" }); setErrors({}); } }, [open, initialType]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!/\.(pdf|jpe?g|png|heic)$/i.test(f.name)) { setErrors({ file: "Upload a PDF, JPG or PNG." }); return; }
    if (f.size > 15 * 1024 * 1024) { setErrors({ file: "Files must be under 15 MB." }); return; }
    setErrors({});
    setFile(f);
    setUp({ pct: 0, state: "uploading" });
    uploadFile(f, { weddingId: null, assignmentId: null, kind: "document", category: "license", retryOf: null }, (pct) => setUp((u) => ({ ...u, pct }))).promise
      .then((r) => setUp(r.ok ? { pct: 100, state: "done", key: r.key ?? null } : { pct: 0, state: "error", error: r.error }));
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!type) e.type = "Choose a document type";
    if (!file) e.file = "Attach a file";
    if (NEEDS_EXPIRY.includes(type) && type !== "business_license" && !expires) e.expires = "Expiration date is required";
    if (up.state === "uploading") e.file = "Wait for the upload to finish";
    if (up.state === "error") e.file = "Upload failed — choose the file again";
    setErrors(e);
    if (Object.keys(e).length) return;
    run(() => submitLicenseAction({ docType: type, label, fileName: file!.name, storageKey: up.key ?? null, expiresOn: expires || null }), {
      onSuccess: () => { onClose(); router.refresh(); toast({ tone: "info", title: "We'll review it within 2 business days" }); },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload a compliance document" description="Documents are stored privately and only visible to Visual Weddings staff."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={pending} disabled={up.state === "uploading"} onClick={submit}>Submit for review</Button></>}>
      <div className="space-y-4">
        <Field label="Document type" error={errors.type} required>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-invalid={!!errors.type}>
            <option value="">Select…</option>
            {required.map((r) => <option key={r.type} value={r.type}>{r.label}{r.required ? "" : " (optional)"}</option>)}
          </Select>
        </Field>
        {type && <p className="-mt-2 flex items-start gap-1.5 text-[12px] text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />{HELP[type]}</p>}
        {type === "other" && <Field label="Name of certification"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. FAA Part 107" /></Field>}
        <Field label="File" error={errors.file} required>
          <button type="button" onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
            className={cn("flex w-full items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-left transition", errors.file ? "border-danger-500/50 bg-danger-50" : "border-midnight-100 hover:border-midnight-200 hover:bg-canvas")}>
            <span className="grid size-10 place-items-center rounded-xl bg-white text-midnight-600 ring-1 ring-line">
              {up.state === "uploading" ? <Loader2 className="size-5 animate-spin" /> : up.state === "done" ? <CheckCircle2 className="size-5 text-success-500" /> : up.state === "error" ? <XCircle className="size-5 text-danger-500" /> : <Upload className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{file ? file.name : "Choose a file or drag it here"}</span>
              <span className="block text-[12px] text-muted">{file ? `${bytes(file.size)} · ${up.state === "uploading" ? `${Math.round(up.pct)}%` : up.state === "done" ? "Uploaded securely" : up.error ?? ""}` : "PDF, JPG or PNG · max 15 MB"}</span>
            </span>
          </button>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          {up.state === "uploading" && <Progress value={up.pct} className="mt-2 h-1.5" />}
        </Field>
        {NEEDS_EXPIRY.includes(type) && (
          <Field label="Expiration date" error={errors.expires} required={type !== "business_license"} hint="We'll remind you 30 days before it expires.">
            <Input type="date" value={expires} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setExpires(e.target.value)} aria-invalid={!!errors.expires} />
          </Field>
        )}
        <Alert tone="info" icon={Clock}>New documents show as <Badge tone="warning">Pending review</Badge> until a coordinator verifies them.</Alert>
      </div>
    </Modal>
  );
}
