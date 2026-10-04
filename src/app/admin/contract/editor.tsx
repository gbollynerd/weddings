"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, PencilLine, Scale, History, Save } from "lucide-react";
import { Card, CardHeader, CardBody, Button, Field, Input, Textarea, Alert, Badge } from "@/components/ui";
import { Tabs, useAction } from "@/components/ui/interactive";
import { ContractText } from "@/components/contracts/contract-text";
import { publishContractAction } from "@/lib/actions/contracts";
import { fillTemplate } from "@/lib/contract-fill";
import { fmtDate } from "@/lib/utils";

const SAMPLE = {
  contractor_name: "Jordan Lee", contractor_email: "jordan@example.com", discipline: "photo" as const, role: "lead_photo", couple: "Sarah Mitchell & James Carter",
  wedding_date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), venue: "The Ivory Atrium, 401 S Tryon St, Charlotte, NC", city: "Charlotte, NC",
  call_time: "13:30", coverage_hours: 8, compensation: 1200, miles: 142,
};

export function ContractEditor({ current, placeholders, history }: {
  current: { version: number; title: string; body: string; created_at: string; created_by_name: string | null };
  placeholders: [string, string][];
  history: { version: number; title: string; change_note: string | null; created_at: string; created_by_name: string | null; signed: number }[];
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [title, setTitle] = React.useState(current.title);
  const [body, setBody] = React.useState(current.body);
  const [note, setNote] = React.useState("");
  const [view, setView] = React.useState<"edit" | "preview">("edit");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { setTitle(current.title); setBody(current.body); setNote(""); }, [current.version, current.title, current.body]);
  const dirty = title !== current.title || body !== current.body;
  const insert = (k: string) => {
    const el = ref.current; const tag = `{{${k}}}`;
    if (!el) { setBody((b) => b + tag); return; }
    const [a, b] = [el.selectionStart, el.selectionEnd];
    setBody((x) => x.slice(0, a) + tag + x.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + tag.length, a + tag.length); });
  };
  const publish = () => run(async () => {
    const r = await publishContractAction(title, body, note);
    setErrors(r.fieldErrors ?? {});
    return r;
  }, { onSuccess: () => router.refresh() });

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Alert tone="info" icon={Scale} title="Have a lawyer review this">
          The starting text is a practical template, not legal advice. Contractor classification, ownership of work and non-solicitation rules vary by state — ask a lawyer licensed where you operate to review it before relying on it.
        </Alert>
        <Card>
          <CardHeader title={`Version ${current.version}${dirty ? " · unsaved changes" : ""}`} subtitle={`Published ${fmtDate(current.created_at)}${current.created_by_name ? ` by ${current.created_by_name}` : ""}`}
            action={<Tabs value={view} onChange={setView} items={[{ value: "edit", label: "Edit" }, { value: "preview", label: "Preview" }]} />} />
          <CardBody className="space-y-4">
            {view === "edit" ? (
              <>
                <Field label="Title" error={errors.title} htmlFor="ct-title"><Input id="ct-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
                <Field label="Agreement" error={errors.body} htmlFor="ct-body" hint="Use ## for section headings, - for bullet points and a blank line between paragraphs.">
                  <Textarea id="ct-body" ref={ref} value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[56vh] font-mono text-[13px] leading-6" spellCheck />
                </Field>
              </>
            ) : (
              <div className="rounded-2xl border border-line p-5">
                <p className="mb-1 flex items-center gap-1.5 text-[12px] text-muted"><Eye className="size-3.5" />Preview with sample wedding details</p>
                <h3 className="mb-3 font-serif text-2xl text-ink">{fillTemplate(title, SAMPLE)}</h3>
                <ContractText body={fillTemplate(body, SAMPLE)} />
              </div>
            )}
            <Field label="What changed? (optional)" htmlFor="ct-note"><Input id="ct-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Updated delivery window to 72 hours" /></Field>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {dirty && <Button variant="ghost" icon={PencilLine} onClick={() => { setTitle(current.title); setBody(current.body); setErrors({}); }}>Discard changes</Button>}
              <Button icon={Save} loading={pending} disabled={!dirty} onClick={publish}>Publish version {current.version + 1}</Button>
            </div>
          </CardBody>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Placeholders" subtitle="Filled in for each wedding when someone signs" />
          <CardBody>
            <ul className="space-y-1.5">
              {placeholders.map(([k, d]) => (
                <li key={k}>
                  <button type="button" onClick={() => { setView("edit"); insert(k); }} className="w-full rounded-xl px-2.5 py-1.5 text-left transition hover:bg-canvas">
                    <code className="text-[12px] font-semibold text-midnight-800">{`{{${k}}}`}</code>
                    <span className="block text-[12px] text-muted">{d}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Versions" />
          <CardBody>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.version} className="rounded-2xl bg-canvas p-3 text-[13px]">
                  <div className="flex items-center justify-between gap-2"><p className="font-medium text-ink">Version {h.version}</p>{h.version === current.version ? <Badge tone="success">Current</Badge> : <Badge><History className="size-3" />Past</Badge>}</div>
                  <p className="text-muted">{fmtDate(h.created_at)}{h.created_by_name ? ` · ${h.created_by_name}` : ""} · {h.signed} signed</p>
                  {h.change_note && <p className="mt-1 text-midnight-700">{h.change_note}</p>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
