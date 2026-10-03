"use client";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { signupAction } from "@/lib/actions/auth";
import { Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/interactive";

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signupAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {state && !state.ok && <Alert tone="danger" icon={AlertCircle}>{state.message}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={fe.partnerOne} required><Input name="partnerOne" placeholder="Sarah Mitchell" aria-invalid={!!fe.partnerOne} /></Field>
        <Field label="Partner's name" error={fe.partnerTwo} required><Input name="partnerTwo" placeholder="James Porter" aria-invalid={!!fe.partnerTwo} /></Field>
      </div>
      <Field label="Email" error={fe.email} required><Input name="email" type="email" autoComplete="email" aria-invalid={!!fe.email} /></Field>
      <Field label="Phone" hint="Optional — for wedding-week updates"><Input name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="Password" error={fe.password} hint="At least 8 characters" required><Input name="password" type="password" autoComplete="new-password" aria-invalid={!!fe.password} /></Field>
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
