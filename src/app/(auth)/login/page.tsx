import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; team?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") && !sp.next.startsWith("/\\") ? sp.next : undefined;
  if (s) redirect(next ?? homeFor(s.role));
  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Couples and team members use the same login — we&apos;ll take you to the right place.</p>
      <LoginForm next={next} />
      <div className="mt-8 flex items-center gap-3 text-[12px] uppercase tracking-wide text-muted"><span className="h-px flex-1 bg-line" />New here?<span className="h-px flex-1 bg-line" /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="rounded-2xl border border-line bg-white p-4 transition hover:border-midnight-200 hover:shadow-sm">
          <span className="block text-sm font-semibold text-ink">Planning a wedding?</span>
          <span className="mt-0.5 block text-[13px] text-blush-600">Create an account →</span>
        </Link>
        <Link href="/join" className="rounded-2xl border border-line bg-white p-4 transition hover:border-midnight-200 hover:shadow-sm">
          <span className="block text-sm font-semibold text-ink">Photo, video or content pro?</span>
          <span className="mt-0.5 block text-[13px] text-blush-600">Apply to join our team →</span>
        </Link>
      </div>
    </div>
  );
}
