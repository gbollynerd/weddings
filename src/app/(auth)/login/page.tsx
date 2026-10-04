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
  if (s) redirect(sp.next ?? homeFor(s.role));
  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Couples and team members use the same login — we&apos;ll take you to the right place.</p>
      <LoginForm next={sp.next} />
      <p className="mt-8 text-center text-sm text-muted">
        Planning a wedding? <Link href={`/signup${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-medium text-blush-600 hover:underline">Create an account</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Photographer or videographer? <Link href="/join" className="font-medium text-blush-600 hover:underline">Apply to join our team</Link>
      </p>
    </div>
  );
}
