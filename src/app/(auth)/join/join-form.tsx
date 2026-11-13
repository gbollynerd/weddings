"use client";
import * as React from "react";
import type { Skill } from "@/lib/skills";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Camera, Video, Smartphone, Check, CheckCircle2 } from "lucide-react";
import { EmailSuggestion } from "@/components/ui/email-hint";
import { emailError, confirmError } from "@/lib/validation";
import { Field, Input, Textarea, Select, Alert, Button, Checkbox } from "@/components/ui";
import { AddressInput } from "@/components/ui/address-input";
import { applyToTeamAction, emailAvailableAction, type ApplyInput } from "@/lib/actions/auth";
import { Stepper, PasswordInput, PasswordStrength, focusFirst } from "@/components/auth/wizard";
import { cn } from "@/lib/utils";

type F = { fullName: string; email: string; phone: string; password: string; confirmPassword: string; skills: Skill[]; homeAddress: string; market: string; years: string; portfolio: string; instagram: string; about: string; equipment: string; agree: boolean };
const SKILL_CARDS = [
  { value: "photo", label: "Photographer", blurb: "Lead or second shooter — portraits, candids, family formals", icon: Camera },
  { value: "video", label: "Videographer", blurb: "Films, ceremony and speech coverage, audio, drone", icon: Video },
  { value: "content", label: "Content creator", blurb: "Phone-first reels, behind-the-scenes and same-day teasers", icon: Smartphone },
] as const;
const EMPTY: F = { fullName: "", email: "", phone: "", password: "", confirmPassword: "", skills: [], homeAddress: "", market: "", years: "", portfolio: "", instagram: "", about: "", equipment: "", agree: false };

const STEPS = ["Account", "Your work", "Experience"];
const FIELDS: (keyof F)[][] = [
  ["fullName", "email", "phone", "password", "confirmPassword"],
  ["skills", "homeAddress", "market"],
  ["years", "portfolio", "about", "agree"],
];
/** Mirrors the server checks in applyToTeamAction so each step can be checked before moving on. */
function check(k: keyof F, f: F): string | undefined {
  switch (k) {
    case "fullName": return f.fullName.trim().length < 3 ? "Enter your full name" : undefined;
    case "email": return emailError(f.email) ?? undefined;
    case "phone": return f.phone.trim().length < 7 ? "Enter a phone number" : undefined;
    case "password": return f.password.length < 8 ? "Use at least 8 characters" : undefined;
    case "confirmPassword": return confirmError(f.password, f.confirmPassword) ?? undefined;
    case "skills": return f.skills.length ? undefined : "Choose at least one";
    case "homeAddress": return f.homeAddress.trim().length < 6 ? "Enter your home base address" : undefined;
    case "market": return f.market ? undefined : "Choose the market you'll mostly work in";
    case "years": return f.years === "" || !/^\d+$/.test(f.years) || Number(f.years) > 60 ? "0–60" : undefined;
    case "portfolio": return /^https?:\/\/\S+\.\S+/i.test(f.portfolio.trim()) ? undefined : "Enter a full link (https://…)";
    case "about": return f.about.trim().length < 40 ? `Tell us a little more (${40 - f.about.trim().length} more characters)` : undefined;
    case "agree": return f.agree ? undefined : "Please confirm";
  }
}

export function JoinForm({ markets }: { markets: { slug: string; label: string }[] }) {
  const router = useRouter();
  const form = React.useRef<HTMLFormElement>(null);
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<F>(EMPTY);
  const [fe, setFe] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = <K extends keyof F>(k: K, v: F[K]) => { setF((x) => ({ ...x, [k]: v })); setFe((x) => ({ ...x, [k]: "" })); };
  const on = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never);
  const blur = (k: keyof F) => () => { if (f[k]) setFe((x) => ({ ...x, [k]: check(k, f) ?? "" })); };
  const pane = (i: number) => form.current?.querySelector<HTMLElement>(`[data-step="${i}"]`) ?? null;
  const go = (i: number) => { setStep(i); setMsg(null); focusFirst(pane(i)); window.scrollTo({ top: 0 }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = Object.fromEntries(FIELDS[step].map((k) => [k, check(k, f)]).filter(([, v]) => v)) as Record<string, string>;
    if (Object.keys(errs).length) { setFe((x) => ({ ...x, ...errs })); focusFirst(pane(step), true); return; }
    setMsg(null);
    if (step === 0) {
      // Catch "already registered" now, not after two more steps
      setBusy(true);
      try {
        const r = await emailAvailableAction(f.email);
        if (!r.ok) { setFe((x) => ({ ...x, email: r.message ?? "Already registered" })); focusFirst(pane(0), true); return; }
      } catch { /* the final submit checks again */ } finally { setBusy(false); }
    }
    if (step < STEPS.length - 1) return go(step + 1);
    setBusy(true);
    try {
      const r = await applyToTeamAction({ ...f } as unknown as ApplyInput);
      if (r.ok) { router.push("/team"); router.refresh(); return; }
      const sfe = r.fieldErrors ?? {};
      setFe(sfe); setMsg(r.message ?? "Something went wrong.");
      const bad = FIELDS.findIndex((ks) => ks.some((k) => sfe[k]));
      const target = bad >= 0 ? bad : step;
      if (target !== step) setStep(target);
      focusFirst(pane(target), true);
      setBusy(false);
    } catch {
      setMsg("We couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <Stepper steps={STEPS} current={step} onStep={busy ? undefined : go} />
      <form ref={form} onSubmit={submit} className="mt-6" noValidate>
        {msg && <Alert tone="danger" icon={AlertCircle} className="mb-4">{msg}</Alert>}

        {/* All three steps stay mounted (hidden) so nothing typed is lost, including the verified address. */}
        <div data-step="0" hidden={step !== 0} className="space-y-4">
          <Field label="Full name" error={fe.fullName} required htmlFor="j-name"><Input id="j-name" value={f.fullName} onChange={on("fullName")} onBlur={blur("fullName")} autoComplete="name" aria-invalid={!!fe.fullName} /></Field>
          <Field label="Email" error={fe.email} required htmlFor="j-email">
            <Input id="j-email" name="email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={f.email} onChange={on("email")} onBlur={blur("email")} autoComplete="email" aria-invalid={!!fe.email} />
          </Field>
          <EmailSuggestion value={f.email} onAccept={(v) => { set("email", v); }} />
          <Field label="Phone" error={fe.phone} required htmlFor="j-phone"><Input id="j-phone" type="tel" inputMode="tel" value={f.phone} onChange={on("phone")} onBlur={blur("phone")} autoComplete="tel" aria-invalid={!!fe.phone} /></Field>
          <Field label="Create a password" error={fe.password} hint="At least 8 characters" required htmlFor="j-pass">
            <PasswordInput id="j-pass" name="password" value={f.password} onChange={on("password")} onBlur={blur("password")} autoComplete="new-password" aria-invalid={!!fe.password} />
          </Field>
          <PasswordStrength value={f.password} />
          <Field label="Confirm password" error={fe.confirmPassword} required htmlFor="j-confirm"
            hint={f.confirmPassword && f.confirmPassword === f.password ? <span className="inline-flex items-center gap-1 text-success-700"><CheckCircle2 className="size-3.5" />Passwords match</span> : undefined}>
            <PasswordInput id="j-confirm" name="confirm-password" value={f.confirmPassword} autoComplete="new-password" aria-invalid={!!fe.confirmPassword}
              onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, confirmPassword: v })); setFe((x) => ({ ...x, confirmPassword: x.confirmPassword || (f.password && v.length >= f.password.length) ? confirmError(f.password, v) ?? "" : "" })); }}
              onBlur={blur("confirmPassword")} />
          </Field>
        </div>

        <div data-step="1" hidden={step !== 1} className="space-y-4">
          <fieldset aria-invalid={!!fe.skills || undefined}>
            <legend className="text-[13px] font-medium text-midnight-700">What do you do? <span className="text-blush-500">*</span></legend>
            <p className="mb-2.5 mt-0.5 text-[12px] text-muted">Choose all that apply — you&apos;ll see and can request jobs for each one.</p>
            <div className="space-y-2" role="group" aria-label="What do you do?">
              {SKILL_CARDS.map(({ value: v, label, blurb, icon: I }) => {
                const on = f.skills.includes(v);
                return (
                  <label key={v} className={cn(
                    "group flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-white p-3.5 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-midnight-100",
                    on ? "border-midnight-900 bg-midnight-50/40 shadow-sm" : "border-line hover:border-midnight-200 hover:bg-canvas/60",
                  )}>
                    <input type="checkbox" name="skills" value={v} checked={on} className="sr-only"
                      onChange={() => set("skills", on ? f.skills.filter((x) => x !== v) : [...f.skills, v])} />
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl transition", on ? "bg-midnight-900 text-white" : "bg-blush-50 text-blush-600")}>
                      <I className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{label}</span>
                      <span className="block text-[12px] leading-snug text-muted">{blurb}</span>
                    </span>
                    <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
                      on ? "border-midnight-900 bg-midnight-900 text-white" : "border-midnight-200 text-transparent group-hover:border-midnight-300")}>
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  </label>
                );
              })}
            </div>
            {fe.skills && <p className="mt-1.5 text-[12px] font-medium text-danger-500" role="alert">{fe.skills}</p>}
          </fieldset>
          <Field label="Home base address" error={fe.homeAddress} required htmlFor="j-home">
            <AddressInput id="j-home" value={f.homeAddress} onChange={(v) => set("homeAddress", v)} aria-invalid={!!fe.homeAddress}
              hint="Used to work out how far each wedding is from you. Never shown to couples." placeholder="Street address you travel from" />
          </Field>
          <Field label="Market you'll mostly work in" error={fe.market} required htmlFor="j-market">
            <Select id="j-market" value={f.market} onChange={on("market")} aria-invalid={!!fe.market}><option value="">Select…</option>{markets.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}</Select>
          </Field>
        </div>

        <div data-step="2" hidden={step !== 2} className="space-y-4">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Years" error={fe.years} required htmlFor="j-years"><Input id="j-years" type="number" min={0} max={60} inputMode="numeric" value={f.years} onChange={on("years")} aria-invalid={!!fe.years} /></Field>
            <Field label="Instagram" htmlFor="j-ig" hint="Optional"><Input id="j-ig" value={f.instagram} onChange={on("instagram")} placeholder="@yourstudio" autoCapitalize="none" /></Field>
          </div>
          <Field label="Portfolio link" error={fe.portfolio} required htmlFor="j-portfolio"><Input id="j-portfolio" type="url" inputMode="url" autoCapitalize="none" value={f.portfolio} onChange={on("portfolio")} onBlur={blur("portfolio")} placeholder="https://" aria-invalid={!!fe.portfolio} /></Field>
          <Field label="About you" error={fe.about} required htmlFor="j-about" hint="Your style, how many weddings you've shot, lead or second shooter experience.">
            <Textarea id="j-about" value={f.about} onChange={on("about")} onBlur={blur("about")} aria-invalid={!!fe.about} maxLength={1200} />
          </Field>
          <Field label="Main equipment" htmlFor="j-gear" hint="Optional — bodies, lenses, audio, drone"><Textarea id="j-gear" value={f.equipment} onChange={on("equipment")} className="min-h-[72px]" maxLength={800} /></Field>
          <div>
            <Checkbox id="j-agree" checked={f.agree} onChange={(e) => set("agree", e.target.checked)} className="items-start [&>input]:mt-0.5" aria-invalid={!!fe.agree}
              label={<span>The information above is accurate, I&apos;m 18 or older, and I can work in the US as an independent contractor. I&apos;ll sign the contractor agreement before each wedding.</span>} />
            {fe.agree && <p className="mt-1.5 text-[12px] font-medium text-danger-500" role="alert">Please confirm to continue</p>}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && <Button type="button" variant="secondary" size="lg" icon={ArrowLeft} onClick={() => go(step - 1)} disabled={busy}>Back</Button>}
          <Button type="submit" className="flex-1" size="lg" loading={busy}>
            {step < STEPS.length - 1 ? <>Continue <ArrowRight className="size-4" /></> : "Submit application"}
          </Button>
        </div>
        {step === STEPS.length - 1 && <p className="mt-4 text-center text-[12px] text-muted">Next you&apos;ll upload your license, insurance and W-9 while we review.</p>}
      </form>
    </>
  );
}
