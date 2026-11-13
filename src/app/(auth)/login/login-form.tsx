"use client";
import * as React from "react";
import { useActionState } from "react";
import { Mail, Lock, Camera, Video, Heart, ShieldCheck, AlertCircle } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/interactive";
import { EmailSuggestion } from "@/components/ui/email-hint";
import { PasswordInput } from "@/components/auth/wizard";

const DEMO = [
  { label: "Photographer", email: "marcus@thevisualweddings.com", icon: Camera },
  { label: "Videographer", email: "daniel@thevisualweddings.com", icon: Video },
  { label: "Client", email: "sarah@thevisualweddings.com", icon: Heart },
  { label: "Coordinator", email: "grace@thevisualweddings.com", icon: ShieldCheck },
];
/** One-click demo logins: on for local development, off on the live site unless NEXT_PUBLIC_SHOW_DEMO=1. */
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO ? process.env.NEXT_PUBLIC_SHOW_DEMO === "1" : process.env.NODE_ENV !== "production";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [help, setHelp] = React.useState(false);
  const pw = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  // After a failed attempt keep the email, clear the password and put the cursor back in it.
  React.useEffect(() => {
    if (!state || state.ok) return;
    if (state.fieldErrors?.email) emailRef.current?.focus();
    else { setPassword(""); pw.current?.focus(); }
  }, [state]);
  const fill = (e: string) => { setEmail(e); setPassword("demo1234"); };
  return (
    <>
      <form action={action} className="mt-8 space-y-4" noValidate>
        {state && !state.ok && <Alert tone="danger" icon={AlertCircle}>{state.message}</Alert>}
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
            <Input ref={emailRef} id="email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus placeholder="you@example.com" className="pl-10"
              value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!state?.fieldErrors?.email} />
          </div>
        </Field>
        <EmailSuggestion value={email} onAccept={setEmail} />
        <Field htmlFor="password" error={state?.fieldErrors?.password}
          label={<span className="flex items-center justify-between">Password
            <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} aria-controls="pw-help" className="text-[12px] font-medium text-blush-600 hover:underline">Forgot password?</button></span>}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-midnight-300" />
            <PasswordInput ref={pw} id="password" name="password" autoComplete="current-password" placeholder="••••••••" className="pl-10"
              value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!state?.fieldErrors?.password} />
          </div>
        </Field>
        {help && (
          <div id="pw-help">
            <Alert tone="info">
              <span className="block"><strong className="font-semibold">Couples:</strong> message us at <a className="underline" href="mailto:hello@thevisualweddings.com?subject=Password%20reset">hello@thevisualweddings.com</a> from the email on your booking and we&apos;ll reset it.</span>
              <span className="mt-1 block"><strong className="font-semibold">Team members:</strong> ask your coordinator for a temporary password, then change it in Settings.</span>
            </Alert>
          </div>
        )}
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Log in</SubmitButton>
      </form>
      {SHOW_DEMO && (
        <div className="mt-8 rounded-2xl border border-dashed border-midnight-200 bg-white p-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Demo accounts · password demo1234</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button key={d.email} type="button" onClick={() => fill(d.email)}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-[13px] text-midnight-700 transition hover:border-midnight-200 hover:bg-midnight-50">
                <d.icon className="size-4 text-blush-500" /> {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
