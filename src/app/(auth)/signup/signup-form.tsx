"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { signupClient, emailAvailableAction } from "@/lib/actions/auth";
import { Field, Input, Alert, Button } from "@/components/ui";
import { EmailSuggestion } from "@/components/ui/email-hint";
import { Stepper, PasswordInput, PasswordStrength, safeNext, focusFirst } from "@/components/auth/wizard";
import { emailError, confirmError } from "@/lib/validation";

type F = { partnerOne: string; partnerTwo: string; email: string; phone: string; password: string; confirmPassword: string };
const STEPS = ["You two", "Contact", "Password"];
const FIELDS: (keyof F)[][] = [["partnerOne", "partnerTwo"], ["email", "phone"], ["password", "confirmPassword"]];

function check(k: keyof F, f: F): string | undefined {
  switch (k) {
    case "partnerOne": return f.partnerOne.trim().length < 2 ? "Enter your full name" : undefined;
    case "partnerTwo": return f.partnerTwo.trim().length < 2 ? "Enter your partner's name" : undefined;
    case "email": return emailError(f.email) ?? undefined;
    case "password": return f.password.length < 8 ? "Use at least 8 characters" : undefined;
    case "confirmPassword": return confirmError(f.password, f.confirmPassword) ?? undefined;
  }
}

export function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const form = React.useRef<HTMLFormElement>(null);
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<F>({ partnerOne: "", partnerTwo: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [fe, setFe] = React.useState<Partial<Record<keyof F, string>>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof F, v: string) => { setF((x) => ({ ...x, [k]: v })); setFe((x) => ({ ...x, [k]: undefined })); };
  const blur = (k: keyof F) => () => { if (f[k]) setFe((x) => ({ ...x, [k]: check(k, f) })); };
  const go = (i: number) => { setStep(i); setMsg(null); focusFirst(form.current); };

  const stepErrors = (i: number) => Object.fromEntries(FIELDS[i].map((k) => [k, check(k, f)]).filter(([, v]) => v)) as Partial<Record<keyof F, string>>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = stepErrors(step);
    if (Object.keys(errs).length) { setFe((x) => ({ ...x, ...errs })); focusFirst(form.current, true); return; }
    setMsg(null);
    if (step === 1) {
      // Catch "already registered" here instead of after the password step
      setBusy(true);
      try {
        const r = await emailAvailableAction(f.email);
        if (!r.ok) { setFe((x) => ({ ...x, email: r.message })); focusFirst(form.current, true); return; }
      } catch { /* the final submit checks again */ } finally { setBusy(false); }
    }
    if (step < STEPS.length - 1) return go(step + 1);
    setBusy(true);
    try {
      const r = await signupClient(f);
      if (r.ok) { router.push(safeNext(next) ?? "/client"); router.refresh(); return; }
      const sfe = (r.fieldErrors ?? {}) as Partial<Record<keyof F, string>>;
      setFe(sfe); setMsg(r.message ?? "Something went wrong. Please try again.");
      const bad = FIELDS.findIndex((ks) => ks.some((k) => sfe[k]));
      if (bad >= 0 && bad !== step) setStep(bad);
      focusFirst(form.current, true);
      setBusy(false);
    } catch {
      setMsg("We couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  const first = f.partnerOne.trim().split(/\s+/)[0];
  const matches = !!f.confirmPassword && f.confirmPassword === f.password;

  return (
    <>
      <Stepper steps={STEPS} current={step} onStep={busy ? undefined : go} />
      <form ref={form} onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {msg && <Alert tone="danger" icon={AlertCircle}>{msg}</Alert>}

        {step === 0 && (
          <>
            <Field label="Your name" error={fe.partnerOne} required htmlFor="su-p1">
              <Input id="su-p1" name="name" placeholder="Sarah Mitchell" autoComplete="name" autoFocus value={f.partnerOne} onChange={(e) => set("partnerOne", e.target.value)} onBlur={blur("partnerOne")} aria-invalid={!!fe.partnerOne} />
            </Field>
            <Field label="Partner's name" error={fe.partnerTwo} required htmlFor="su-p2">
              <Input id="su-p2" name="partner-name" placeholder="James Porter" autoComplete="off" value={f.partnerTwo} onChange={(e) => set("partnerTwo", e.target.value)} onBlur={blur("partnerTwo")} aria-invalid={!!fe.partnerTwo} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-midnight-700">{first ? `Nice to meet you, ${first}. ` : ""}Where should we send booking updates?</p>
            <Field label="Email" error={fe.email} required htmlFor="su-email">
              <Input id="su-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com"
                value={f.email} onChange={(e) => set("email", e.target.value)} onBlur={blur("email")} aria-invalid={!!fe.email} />
            </Field>
            <EmailSuggestion value={f.email} onAccept={(v) => set("email", v)} />
            <Field label="Phone" hint="Optional — for wedding-week updates" htmlFor="su-phone">
              <Input id="su-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            {/* lets password managers save the right username with the new password */}
            <input type="email" name="email" autoComplete="username" value={f.email} readOnly hidden />
            <Field label="Create a password" error={fe.password} hint="At least 8 characters" required htmlFor="su-pass">
              <PasswordInput id="su-pass" name="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} onBlur={blur("password")} aria-invalid={!!fe.password} />
            </Field>
            <PasswordStrength value={f.password} />
            <Field label="Confirm password" error={fe.confirmPassword} required htmlFor="su-confirm"
              hint={matches ? <span className="inline-flex items-center gap-1 text-success-700"><CheckCircle2 className="size-3.5" />Passwords match</span> : undefined}>
              <PasswordInput id="su-confirm" name="confirm-password" autoComplete="new-password" value={f.confirmPassword} aria-invalid={!!fe.confirmPassword}
                onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, confirmPassword: v })); setFe((x) => ({ ...x, confirmPassword: x.confirmPassword || (f.password && v.length >= f.password.length) ? confirmError(f.password, v) ?? undefined : undefined })); }}
                onBlur={blur("confirmPassword")} />
            </Field>
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && <Button type="button" variant="secondary" size="lg" icon={ArrowLeft} onClick={() => go(step - 1)} disabled={busy}>Back</Button>}
          <Button type="submit" size="lg" className="flex-1" loading={busy}>
            {step < STEPS.length - 1 ? <>Continue <ArrowRight className="size-4" /></> : busy ? "Creating account…" : "Create account"}
          </Button>
        </div>
      </form>
    </>
  );
}
