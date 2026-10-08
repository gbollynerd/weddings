import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";
import { sql } from "@/lib/db";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join our team", description: "Apply to work weddings with Visual Weddings as a photographer, videographer or content creator." };

export default async function JoinPage() {
  const s = await getSession();
  if (s) redirect(homeFor(s.role));
  const markets = await sql`select slug, city, state from markets where active order by state, city`;
  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Join our team</h1>
      <p className="mt-2 text-sm text-muted">Shoot weddings near you on your schedule.</p>
      <JoinForm markets={markets.map((m) => ({ slug: m.slug, label: `${m.city}, ${m.state}` }))} />
      <p className="mt-8 text-center text-sm text-muted">
        Already on the team? <Link href="/login?next=/team" className="font-medium text-blush-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
