import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, BookOpen, MessageCircle } from "lucide-react";
import { currentMember } from "@/lib/services/me";
import { article, handbookTree } from "@/lib/services/handbook";
import { Markdown } from "@/components/markdown";
import { Card, Badge, ButtonLink } from "@/components/ui";
import { fmtDate, cn } from "@/lib/utils";
import { Helpful } from "./helpful";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await article((await params).slug);
  return { title: a?.title ?? "Handbook" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  await currentMember();
  const { slug } = await params;
  const [a, tree] = await Promise.all([article(slug), handbookTree()]);
  if (!a) notFound();
  const flat = tree.flatMap((c) => c.articles.map((x) => ({ ...x, cat: c.title })));
  const idx = flat.findIndex((x) => x.slug === slug);
  const prev = flat[idx - 1], next = flat[idx + 1];
  return (
    <div className="grid gap-8 xl:grid-cols-[260px_1fr]">
      <aside className="hidden xl:block">
        <nav className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-thin" aria-label="Handbook">
          <Link href="/team/handbook" className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink"><BookOpen className="size-4" />Handbook home</Link>
          {tree.map((c) => (
            <div key={c.id} className="mb-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-midnight-300">{c.title}</p>
              <ul>{c.articles.map((x) => (
                <li key={x.slug}><Link href={`/team/handbook/${x.slug}`} className={cn("block rounded-lg px-2 py-1 text-[13px]", x.slug === slug ? "bg-midnight-900 font-medium text-white" : "text-midnight-600 hover:bg-white")}>{x.title}</Link></li>
              ))}</ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 space-y-6">
        <Link href="/team/handbook" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />Team Handbook</Link>
        <Card className="px-6 py-8 sm:px-10">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="blush">{a.category_title}</Badge>{a.audience !== "all" && <Badge tone="info">{a.audience === "photo" ? "Photographers" : "Videographers"}</Badge>}</div>
          <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{a.title}</h1>
          {a.summary && <p className="mt-2 text-lg text-muted">{a.summary}</p>}
          <p className="mt-4 flex items-center gap-3 text-[13px] text-muted"><Clock className="size-3.5" />{a.read_minutes} min read · Updated {fmtDate(a.updated_at)}</p>
          <hr className="my-6 border-line" />
          <Markdown source={a.body} className="max-w-3xl" />
          <Helpful slug={slug} />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {prev ? <Link href={`/team/handbook/${prev.slug}`} className="card p-4 hover:-translate-y-0.5 transition"><p className="flex items-center gap-1 text-[12px] text-muted"><ArrowLeft className="size-3" />Previous</p><p className="font-medium text-ink">{prev.title}</p></Link> : <span />}
          {next && <Link href={`/team/handbook/${next.slug}`} className="card p-4 text-right hover:-translate-y-0.5 transition"><p className="flex items-center justify-end gap-1 text-[12px] text-muted">Next<ArrowRight className="size-3" /></p><p className="font-medium text-ink">{next.title}</p></Link>}
        </div>
        <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-midnight-700">Still have a question about <b>{a.title.toLowerCase()}</b>?</p>
          <ButtonLink href="/team/messages?new=1" variant="outline" icon={MessageCircle}>Ask a coordinator</ButtonLink>
        </Card>
      </div>
    </div>
  );
}
