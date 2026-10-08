import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Markdown } from "@/components/markdown";
import { CLIENT_TERMS } from "@/content/client-terms";

export function generateStaticParams() {
  return CLIENT_TERMS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = CLIENT_TERMS.find((x) => x.slug === slug);
  return t ? { title: t.title, description: t.summary } : {};
}

/** Public pages for the couple-facing service agreement and cancellation policy. */
export default async function TermsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = CLIENT_TERMS.find((x) => x.slug === slug);
  if (!t) notFound();
  const session = await getSession();
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader account={session ? { href: homeFor(session.role), label: "My account" } : null} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-28 sm:px-8">
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Terms">
          {CLIENT_TERMS.map((x) => (
            <Link key={x.slug} href={`/terms/${x.slug}`} aria-current={x.slug === t.slug ? "page" : undefined}
              className={x.slug === t.slug ? "rounded-full bg-midnight-900 px-3.5 py-1.5 font-medium text-white" : "rounded-full px-3.5 py-1.5 text-midnight-600 ring-1 ring-line hover:bg-white"}>{x.title}</Link>
          ))}
        </nav>
        <h1 className="mt-6 font-serif text-4xl text-ink">{t.title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {t.updated}</p>
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-10">
          <Markdown source={t.body} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
