import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Track your booking, payments, timeline and deliverables in one place.</p>
      <SignupForm next={sp.next} />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-blush-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
