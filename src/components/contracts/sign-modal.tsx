"use client";
import * as React from "react";
import { FileSignature, Loader2, ShieldCheck } from "lucide-react";
import { Button, Input, Field, Checkbox, Alert } from "@/components/ui";
import { Modal, useToast } from "@/components/ui/interactive";
import { contractPreviewAction, type SignInput } from "@/lib/actions/team";
import type { ActionResult } from "@/lib/actions/types";
import { ContractText } from "./contract-text";

type Sign<T> = (sig: SignInput) => Promise<ActionResult<T>>;

/**
 * Shows the filled-in contractor agreement for a slot and collects an electronic signature
 * (typed full name + agreement). Used when accepting a wedding, an offer, or catching up on an older booking.
 */
export function SignContractModal<T>({ assignmentId, open, onClose, memberName, title, summary, signLabel, footnote, sign, onSigned }: {
  assignmentId: string | null; open: boolean; onClose: () => void; memberName: string; title: string; summary?: React.ReactNode;
  signLabel: string; footnote?: React.ReactNode; sign: Sign<T>; onSigned: (data: T | undefined, message?: string) => void;
}) {
  const toast = useToast();
  const [doc, setDoc] = React.useState<{ version: number; title: string; body: string } | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async (id: string) => {
    setDoc(null); setLoadError(null);
    const r = await contractPreviewAction(id);
    if (r.ok && r.data) setDoc(r.data); else setLoadError(r.message ?? "Couldn't load the agreement.");
  }, []);
  React.useEffect(() => {
    if (open && assignmentId) { setName(""); setAgree(false); setError(null); load(assignmentId); }
  }, [open, assignmentId, load]);

  const submit = async () => {
    if (!doc || !assignmentId) return;
    if (!agree) { setError("Tick the box to confirm you agree to the terms."); return; }
    if (!name.trim()) { setError("Type your full name to sign."); return; }
    setBusy(true); setError(null);
    try {
      const r = await sign({ name, agree, version: doc.version });
      if (r.ok) { onSigned(r.data, r.message); return; }
      const stale = (r.data as { stale?: boolean } | undefined)?.stale;
      if (stale) { toast({ tone: "info", title: "The terms were just updated", body: "Please review the new version." }); await load(assignmentId); }
      setError(r.message ?? "Couldn't sign the agreement.");
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={title}
      icon={<span className="grid size-11 place-items-center rounded-full bg-blush-50 text-blush-600"><FileSignature className="size-5" /></span>}
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={busy}>Not now</Button>
        <Button icon={ShieldCheck} loading={busy} disabled={!doc} onClick={submit}>{signLabel}</Button>
      </>}>
      <div className="space-y-4">
        {summary}
        <div className="rounded-2xl border border-line">
          <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-2.5">
            <p className="text-sm font-semibold text-ink">{doc?.title ?? "Contractor agreement"}</p>
            {doc && <span className="text-[11px] text-muted">Version {doc.version}</span>}
          </div>
          <div className="max-h-[min(46vh,420px)] overflow-y-auto px-4 py-3 scrollbar-thin" tabIndex={0} aria-label="Agreement text">
            {doc ? <ContractText body={doc.body} />
              : loadError ? <p className="py-6 text-center text-sm text-danger-500">{loadError}</p>
              : <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted"><Loader2 className="size-4 animate-spin" />Loading agreement…</p>}
          </div>
        </div>
        <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} id="sign-agree" className="items-start [&>input]:mt-0.5"
          label={<span>I&apos;ve read this agreement and agree to abide by it, the Team Handbook and all Visual Weddings terms for this wedding.</span>} />
        <Field label="Type your full name to sign" htmlFor="sign-name" hint={`As it appears on your profile: ${memberName}`}>
          <Input id="sign-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={memberName}
            className="font-serif text-lg" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        {footnote && <p className="text-[12px] text-muted">{footnote}</p>}
      </div>
    </Modal>
  );
}
