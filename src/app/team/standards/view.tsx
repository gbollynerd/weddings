"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2, ArrowRight, BookOpen } from "lucide-react";
import { PageHeader, Card, Button, Input, Field, Checkbox, Alert, Badge } from "@/components/ui";
import { useToast } from "@/components/ui/interactive";
import { acceptStandardsAction } from "@/lib/actions/team";
import { fmtDate } from "@/lib/utils";

export function StandardsView({ sections, version, memberName, accepted }: {
  sections: { title: string; href: string; points: string[] }[]; version: number; memberName: string; accepted: { name: string; at: string } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!agree) { setError("Tick the box to confirm you'll follow the standards."); return; }
    if (!name.trim()) { setError("Type your full name to accept."); return; }
    setBusy(true); setError(null);
    const r = await acceptStandardsAction({ name, agree });
    setBusy(false);
    if (!r.ok) { setError(r.message ?? "Couldn't save."); return; }
    toast({ tone: "success", title: r.message ?? "Accepted" });
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Required" title="Team standards"
        description="How every Visual Weddings shooter records, tags, backs up and protects a wedding — and what you're responsible for. Read each section, then accept below. You need to accept before you can take weddings." />
      {accepted && (
        <Alert tone="success" icon={CheckCircle2} title="You've accepted these standards">
          Accepted by {accepted.name} on {fmtDate(accepted.at, "MMMM d, yyyy")} (version {version}). Your contractor agreement for each wedding includes the same terms.
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s, i) => (
          <Card key={s.href} className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-midnight-900 text-[12px] font-semibold text-white">{i + 1}</span>
              <h2 className="font-semibold text-ink">{s.title}</h2>
            </div>
            <ul className="mt-3 flex-1 list-disc space-y-1.5 pl-5 text-[13px] text-midnight-700">
              {s.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <Link href={s.href} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-blush-700 hover:underline"><BookOpen className="size-4" />Read the full page<ArrowRight className="size-3.5" /></Link>
          </Card>
        ))}
      </div>
      {!accepted && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-blush-600" /><h2 className="font-semibold text-ink">Accept the standards</h2><Badge>Version {version}</Badge></div>
          <div className="mt-4 space-y-4">
            <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} className="items-start [&>input]:mt-0.5"
              label={<span>I&apos;ve read the shooting standard, tagging, backup and liability pages. I&apos;ll follow them on every Visual Weddings assignment, I&apos;ll keep the required insurance, and I understand I&apos;m responsible for my own equipment and for damage I cause.</span>} />
            <Field label="Type your full name" htmlFor="std-name" hint={`As it appears on your profile: ${memberName}`}>
              <Input id="std-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={memberName} className="font-serif text-lg"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} />
            </Field>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button icon={ShieldCheck} loading={busy} onClick={submit}>Accept standards</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
