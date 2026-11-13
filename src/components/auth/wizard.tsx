"use client";
import * as React from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/** "Step 2 of 3" header for the sign-up wizards. Finished steps can be clicked to go back. */
export function Stepper({ steps, current, onStep }: { steps: string[]; current: number; onStep?: (i: number) => void }) {
  return (
    <div className="mt-6">
      <ol className="flex items-center gap-2" aria-label="Progress">
        {steps.map((label, i) => {
          const done = i < current, active = i === current;
          return (
            <li key={label} className={cn("flex items-center gap-2", i < steps.length - 1 && "flex-1")} aria-current={active ? "step" : undefined}>
              <button type="button" disabled={!done || !onStep} onClick={() => onStep?.(i)} aria-label={`${label}${done ? " (done — go back)" : ""}`}
                className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition",
                  done ? "cursor-pointer bg-midnight-900 text-white hover:bg-midnight-700" : active ? "bg-blush-500 text-white" : "bg-midnight-50 text-midnight-400")}>
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </button>
              <span className={cn("hidden text-[13px] sm:block", active ? "font-semibold text-ink" : "text-muted")}>{label}</span>
              {i < steps.length - 1 && <span aria-hidden className={cn("h-px flex-1 transition-colors", done ? "bg-midnight-900" : "bg-line")} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[12px] text-muted sm:hidden" aria-live="polite">Step {current + 1} of {steps.length} · <span className="font-medium text-midnight-700">{steps[current]}</span></p>
    </div>
  );
}

/** Password box with a show/hide button. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(function PasswordInput({ className, ...p }, ref) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className={cn("pr-11", className)} {...p} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-midnight-400 transition hover:bg-midnight-50 hover:text-midnight-700">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

/** 0–4: length, longer length, mixed letters and numbers, a symbol or mixed case. */
export function passwordScore(p: string) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-zA-Z]/.test(p) && /[0-9]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p) || (/[a-z]/.test(p) && /[A-Z]/.test(p))) s++;
  return p.length < 8 ? Math.min(s, 1) : s;
}
const LABELS = ["", "Too short", "Okay", "Good", "Strong"];
const BAR = ["", "bg-danger-500", "bg-warning-500", "bg-success-500", "bg-success-700"];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const s = value.length < 8 ? 1 : Math.max(2, passwordScore(value));
  return (
    <div className="flex items-center gap-2.5" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= s ? BAR[s] : "bg-midnight-100")} />)}
      </div>
      <span className="w-16 text-right text-[12px] text-muted">{LABELS[s]}</span>
    </div>
  );
}

/** Only follow same-site paths handed to us in ?next=. */
export const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null);

/** Moves keyboard focus to the first field with an error (or the first field) after a step change. */
export function focusFirst(root: HTMLElement | null, invalidOnly = false) {
  requestAnimationFrame(() => {
    const el = root?.querySelector<HTMLElement>("[aria-invalid=true]") ?? (invalidOnly ? null : root?.querySelector<HTMLElement>("input:not([type=hidden]):not(.sr-only), select, textarea"));
    el?.focus();
  });
}
