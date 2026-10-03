"use client";
import { useActionState, useRef } from "react";
import { Mail, Lock, Camera, Video, Heart, ShieldCheck, AlertCircle } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/interactive";

const DEMO = [
  { label: "Photographer", email: "marcus@visualweddings.test", icon: Camera },
  { label: "Videographer", email: "daniel@visualweddings.test", icon: Video },
  { label: "Client", email: "sarah@visualweddings.test", icon: Heart },
  { label: "Coordinator", email: "grace@visualweddings.test", icon: ShieldCheck },
];

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  const email = useRef<HTMLInputElement>(null);
  const pw = useRef<HTMLInputElement>(null);
  const fill = (e: string) => { if (email.current && pw.current) { email.current.value = e; pw.current.value = "demo1234"; } };
  return (
    <>
      <form action={action} className="mt-8 space-y-4" noValidate>
        {state && !state.ok && <Alert tone="danger" icon={AlertCircle}>{state.message}</Alert>}
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
            <Input ref={email} id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="pl-10" aria-invalid={!!state?.fieldErrors?.email} />
          </div>
        </Field>
        <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
            <Input ref={pw} id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" className="pl-10" aria-invalid={!!state?.fieldErrors?.password} />
          </div>
        </Field>
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Log in</SubmitButton>
      </form>
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
    </>
  );
}
