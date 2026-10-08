"use client";
import * as React from "react";
import type { Skill } from "@/lib/skills";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, Video, Smartphone } from "lucide-react";
import { Field, Input, Textarea, Select, Alert, Button, Checkbox } from "@/components/ui";
import { AddressInput } from "@/components/ui/address-input";
import { applyToTeamAction, type ApplyInput } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type F = { fullName: string; email: string; phone: string; password: string; skills: Skill[]; homeAddress: string; market: string; years: string; portfolio: string; instagram: string; about: string; equipment: string; agree: boolean };
const EMPTY: F = { fullName: "", email: "", phone: "", password: "", skills: [], homeAddress: "", market: "", years: "", portfolio: "", instagram: "", about: "", equipment: "", agree: false };

export function JoinForm({ markets }: { markets: { slug: string; label: string }[] }) {
  const router = useRouter();
  const [f, setF] = React.useState<F>(EMPTY);
  const [fe, setFe] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = <K extends keyof F>(k: K, v: F[K]) => { setF((x) => ({ ...x, [k]: v })); setFe((x) => ({ ...x, [k]: "" })); };
  const on = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await applyToTeamAction({ ...f } as unknown as ApplyInput);
      if (r.ok) { router.push("/team"); router.refresh(); return; }
      setFe(r.fieldErrors ?? {}); setMsg(r.message ?? "Something went wrong.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      {msg && <Alert tone="danger" icon={AlertCircle}>{msg}</Alert>}
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-midnight-700">I work as <span className="text-blush-500">*</span> <span className="font-normal text-muted">— choose all that apply</span></legend>
        <div className="grid gap-2 sm:grid-cols-3" role="group">
          {([["photo", "Photographer", Camera], ["video", "Videographer", Video], ["content", "Content creator", Smartphone]] as const).map(([v, label, I]) => {
            const on = f.skills.includes(v);
            return (
              <label key={v} className={cn("flex cursor-pointer items-center gap-2 rounded-2xl border p-3 text-sm font-medium transition", on ? "border-midnight-900 ring-2 ring-midnight-900/10" : "border-line hover:border-midnight-200")}>
                <input type="checkbox" name="skills" value={v} checked={on} onChange={() => set("skills", on ? f.skills.filter((x) => x !== v) : [...f.skills, v])} className="size-4 accent-midnight-900" />
                <I className="size-4 text-midnight-500" />{label}
              </label>
            );
          })}
        </div>
        {fe.skills && <p className="mt-1.5 text-[12px] font-medium text-danger-500" role="alert">{fe.skills}</p>}
      </fieldset>
      <Field label="Full name" error={fe.fullName} required htmlFor="j-name"><Input id="j-name" value={f.fullName} onChange={on("fullName")} autoComplete="name" aria-invalid={!!fe.fullName} /></Field>
      <Field label="Email" error={fe.email} required htmlFor="j-email"><Input id="j-email" type="email" value={f.email} onChange={on("email")} autoComplete="email" aria-invalid={!!fe.email} /></Field>
      <Field label="Phone" error={fe.phone} required htmlFor="j-phone"><Input id="j-phone" type="tel" value={f.phone} onChange={on("phone")} autoComplete="tel" aria-invalid={!!fe.phone} /></Field>
      <Field label="Password" error={fe.password} hint="At least 8 characters" required htmlFor="j-pass"><Input id="j-pass" type="password" value={f.password} onChange={on("password")} autoComplete="new-password" aria-invalid={!!fe.password} /></Field>
      <Field label="Home base address" error={fe.homeAddress} required htmlFor="j-home">
        <AddressInput id="j-home" value={f.homeAddress} onChange={(v) => set("homeAddress", v)} aria-invalid={!!fe.homeAddress}
          hint="Used to work out how far each wedding is from you. Never shown to couples." placeholder="Street address you travel from" />
      </Field>
      <Field label="Market you'll mostly work in" error={fe.market} required htmlFor="j-market">
        <Select id="j-market" value={f.market} onChange={on("market")} aria-invalid={!!fe.market}><option value="">Select…</option>{markets.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}</Select>
      </Field>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <Field label="Years" error={fe.years} required htmlFor="j-years"><Input id="j-years" type="number" min={0} max={60} inputMode="numeric" value={f.years} onChange={on("years")} aria-invalid={!!fe.years} /></Field>
        <Field label="Instagram" htmlFor="j-ig"><Input id="j-ig" value={f.instagram} onChange={on("instagram")} placeholder="@yourstudio" /></Field>
      </div>
      <Field label="Portfolio link" error={fe.portfolio} required htmlFor="j-portfolio"><Input id="j-portfolio" type="url" value={f.portfolio} onChange={on("portfolio")} placeholder="https://" aria-invalid={!!fe.portfolio} /></Field>
      <Field label="About you" error={fe.about} required htmlFor="j-about" hint="Your style, how many weddings you've shot, lead or second shooter experience.">
        <Textarea id="j-about" value={f.about} onChange={on("about")} aria-invalid={!!fe.about} maxLength={1200} />
      </Field>
      <Field label="Main equipment" htmlFor="j-gear" hint="Optional — bodies, lenses, audio, drone"><Textarea id="j-gear" value={f.equipment} onChange={on("equipment")} className="min-h-[72px]" maxLength={800} /></Field>
      <div>
        <Checkbox id="j-agree" checked={f.agree} onChange={(e) => set("agree", e.target.checked)} className="items-start [&>input]:mt-0.5"
          label={<span>The information above is accurate, I&apos;m 18 or older, and I can work in the US as an independent contractor. I&apos;ll sign the contractor agreement before each wedding.</span>} />
        {fe.agree && <p className="mt-1.5 text-[12px] font-medium text-danger-500" role="alert">Please confirm to continue</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" loading={busy}>Submit application</Button>
      <p className="text-center text-[12px] text-muted">Next you&apos;ll upload your license, insurance and W-9 while we review.</p>
    </form>
  );
}
