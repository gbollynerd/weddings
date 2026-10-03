"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Send, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardBody, Field, Textarea, Input, Button, Alert, StatusBadge, Progress } from "@/components/ui";
import { useAction } from "@/components/ui/interactive";
import { saveQuestionnaireAction } from "@/lib/actions/client";
import { ago } from "@/lib/utils";

const SECTIONS: { title: string; fields: { key: string; label: string; hint?: string; required?: boolean; short?: boolean }[] }[] = [
  { title: "The morning", fields: [
    { key: "getting_ready", label: "Where and when are you each getting ready?", hint: "e.g. Bridal suite at 11:30 AM; groom's lounge at 12:30 PM", required: true },
    { key: "first_look", label: "Are you planning a first look?", hint: "Where and when, or “No first look”", short: true },
  ] },
  { title: "People", fields: [
    { key: "family_formals", label: "Family photo list", hint: "List the groupings you want, largest first. Include names where helpful.", required: true },
    { key: "vip", label: "VIPs and family notes", hint: "Grandparents, anyone with mobility needs, sensitive family dynamics we should know about" },
    { key: "planner", label: "Planner or day-of contact", hint: "Name and phone number", required: true, short: true },
  ] },
  { title: "The details", fields: [
    { key: "must_have", label: "Must-have moments and shots", hint: "Heirlooms, surprises, specific people or traditions" },
    { key: "traditions", label: "Cultural or religious traditions", hint: "Tell us what happens and what matters most to capture" },
    { key: "music", label: "Music and entertainment", hint: "Band, DJ, string quartet — and any special performances", short: true },
    { key: "accessibility", label: "Accessibility or anything else", hint: "Anything that helps us plan" },
  ] },
];
const ALL = SECTIONS.flatMap((s) => s.fields);

export function QuestionnaireForm({ weddingId, couple, status, answers: initial, submittedAt }: { weddingId: string; couple: string; status: string; answers: Record<string, string>; submittedAt: string | null }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [a, setA] = React.useState<Record<string, string>>(initial);
  const [err, setErr] = React.useState<Record<string, string>>({});
  const filled = ALL.filter((f) => a[f.key]?.trim()).length;
  const save = (submit: boolean) => run(async () => { const r = await saveQuestionnaireAction(weddingId, a, submit); setErr(r.fieldErrors ?? {}); return r; }, { onSuccess: () => router.refresh() });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardBody className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2"><p className="font-serif text-2xl text-ink">{couple} — wedding questionnaire</p></div>
            <p className="mt-1 text-sm text-muted">Shared with your coordinator and assigned team. You can update it any time before the wedding.</p>
            <div className="mt-3 flex items-center gap-3"><Progress value={(filled / ALL.length) * 100} tone="blush" className="max-w-xs" /><span className="shrink-0 whitespace-nowrap text-[12px] text-muted">{filled}/{ALL.length} answered</span></div>
          </div>
          <StatusBadge status={status} />
        </CardBody>
      </Card>
      {status === "submitted" && <Alert tone="success" icon={CheckCircle2} title="Submitted">Your team received this {submittedAt ? ago(submittedAt) : ""}. Changes you save will be shared automatically.</Alert>}
      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <CardHeader title={s.title} />
          <CardBody className="space-y-5">
            {s.fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint} required={f.required} error={err[f.key]}>
                {f.short ? <Input value={a[f.key] ?? ""} onChange={(e) => setA({ ...a, [f.key]: e.target.value })} aria-invalid={!!err[f.key]} /> : <Textarea value={a[f.key] ?? ""} onChange={(e) => setA({ ...a, [f.key]: e.target.value })} aria-invalid={!!err[f.key]} />}
              </Field>
            ))}
          </CardBody>
        </Card>
      ))}
      <div className="sticky bottom-4 grid grid-cols-[auto_1fr] gap-2 rounded-2xl bg-white/90 p-3 shadow-[var(--shadow-pop)] ring-1 ring-line backdrop-blur sm:flex sm:justify-end">
        <Button variant="outline" icon={Save} loading={pending} onClick={() => save(false)}><span className="sm:hidden">Save</span><span className="hidden sm:inline">Save draft</span></Button>
        <Button icon={Send} loading={pending} onClick={() => save(true)}>{status === "submitted" ? <><span className="sm:hidden">Share updates</span><span className="hidden sm:inline">Save &amp; share updates</span></> : <><span className="sm:hidden">Submit</span><span className="hidden sm:inline">Submit questionnaire</span></>}</Button>
      </div>
    </div>
  );
}
