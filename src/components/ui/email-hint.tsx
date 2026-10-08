"use client";
import { emailSuggestion } from "@/lib/validation";

/** "Did you mean …@gmail.com?" under an email field, for common domain typos. */
export function EmailSuggestion({ value, onAccept }: { value: string; onAccept: (v: string) => void }) {
  const s = emailSuggestion(value);
  if (!s) return null;
  return (
    <p className="text-[12px] text-midnight-700">
      Did you mean <button type="button" onClick={() => onAccept(s)} className="font-semibold text-blush-700 underline underline-offset-2">{s}</button>?
    </p>
  );
}
