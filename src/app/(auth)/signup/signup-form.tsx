"use client";
import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { signupAction } from "@/lib/actions/auth";
import { Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/interactive";
import { EmailSuggestion } from "@/components/ui/email-hint";
import { emailError, confirmError } from "@/lib/validation";

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signupAction, null);
  const server: Record<string, string | undefined> = state?.fieldErrors ?? {};
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  // Show a field's error once the person has left it (or tried to submit), then keep it live while they fix it.
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const eErr = emailError(email);
  const pErr = password.length < 8 ? "Use at least 8 characters" : null;
  const cErr = confirmError(password, confirm);
  const fe: Record<string, string | undefined> = {
    ...server,
    email: (touched.email && eErr) || server.email,
    password: (touched.password && pErr) || server.password,
    confirmPassword: (touched.confirmPassword && cErr) || server.confirmPassword,
  };
  const matches = !!confirm && !cErr;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (eErr || pErr || cErr) {
      e.preventDefault();
      setTouched((t) => ({ ...t, email: true, password: true, confirmPassword: true }));
      requestAnimationFrame(() => document.querySelector<HTMLElement>("form [aria-invalid=true]")?.focus());
    }
  };

  return (
    <form action={action} onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      {state && !state.ok && <Alert tone="danger" icon={AlertCircle}>{state.message}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={fe.partnerOne} required htmlFor="su-p1"><Input id="su-p1" name="partnerOne" placeholder="Sarah Mitchell" autoComplete="name" aria-invalid={!!fe.partnerOne} /></Field>
        <Field label="Partner's name" error={fe.partnerTwo} required htmlFor="su-p2"><Input id="su-p2" name="partnerTwo" placeholder="James Porter" aria-invalid={!!fe.partnerTwo} /></Field>
      </div>
      <Field label="Email" error={fe.email} required htmlFor="su-email">
        <Input id="su-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => email && touch("email")} aria-invalid={!!fe.email} />
      </Field>
      <EmailSuggestion value={email} onAccept={(v) => { setEmail(v); touch("email"); }} />
      <Field label="Phone" hint="Optional — for wedding-week updates" htmlFor="su-phone"><Input id="su-phone" name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="Password" error={fe.password} hint="At least 8 characters" required htmlFor="su-pass">
        <Input id="su-pass" name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
          onBlur={() => password && touch("password")} aria-invalid={!!fe.password} />
      </Field>
      <Field label="Confirm password" error={fe.confirmPassword} required htmlFor="su-confirm"
        hint={matches ? <span className="inline-flex items-center gap-1 text-success-700"><CheckCircle2 className="size-3.5" />Passwords match</span> : undefined}>
        <Input id="su-confirm" name="confirmPassword" type="password" autoComplete="new-password" value={confirm}
          onChange={(e) => { setConfirm(e.target.value); if (e.target.value.length >= password.length && password) touch("confirmPassword"); }}
          onBlur={() => confirm && touch("confirmPassword")} aria-invalid={!!fe.confirmPassword} />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
