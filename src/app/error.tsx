"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-50 text-danger-500"><AlertTriangle className="size-6" /></div>
        <h1 className="mt-5 text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">We couldn&apos;t load this page. Please try again — if it keeps happening, contact support{error.digest ? ` (ref ${error.digest})` : ""}.</p>
        <Button className="mt-6" icon={RotateCcw} onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
