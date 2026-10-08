"use client";
import * as React from "react";
import { skillPerson } from "@/lib/skills";
import Link from "next/link";
import { Search, BookOpen, Clock, ArrowRight, Siren } from "lucide-react";
import { Card, Input, Badge, EmptyState } from "@/components/ui";
import { Tabs } from "@/components/ui/interactive";
import { HB_ICONS } from "./icons";
import { cn } from "@/lib/utils";

type Tree = { id: string; slug: string; title: string; description: string; icon: string; articles: { slug: string; title: string; summary: string; audience: string; read_minutes: number; updated_at: string }[] }[];

export function HandbookIndex({ tree, skills }: { tree: Tree; skills: string[] }) {
  const [q, setQ] = React.useState("");
  const [aud, setAud] = React.useState<"mine" | "all">("mine");
  const show = (a: Tree[number]["articles"][number]) => aud === "all" || a.audience === "all" || skills.includes(a.audience);
  const matches = q.trim().length > 1 ? tree.flatMap((c) => c.articles.filter((a) => show(a) && `${a.title} ${a.summary}`.toLowerCase().includes(q.toLowerCase())).map((a) => ({ ...a, cat: c.title }))) : null;
  const recent = tree.flatMap((c) => c.articles.filter(show).map((a) => ({ ...a, cat: c.title }))).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4);
  const total = tree.reduce((s, c) => s + c.articles.filter(show).length, 0);
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-midnight-900 px-6 py-10 text-white sm:px-10">
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-blush-400/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-sm text-blush-200"><BookOpen className="size-4" />Visual Weddings Team Handbook</p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl">How we work, in one place.</h2>
          <p className="mt-2 text-white/70">{total} articles on standards, the wedding day, uploads, payments and more.</p>
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-midnight-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the handbook — e.g. “time-sync”, “mileage”, “dress code”" className="h-13 rounded-2xl border-0 pl-12 text-[15px]" aria-label="Search handbook" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={aud} onChange={setAud} items={[{ value: "mine", label: skills.length === 1 ? `For ${skillPerson(skills[0]).toLowerCase()}s` : "For your skills" }, { value: "all", label: "All articles" }]} />
        <Link href="/team/handbook/emergencies" className="inline-flex items-center gap-2 rounded-full bg-danger-50 px-4 py-2 text-sm font-medium text-danger-700 hover:bg-danger-50/70"><Siren className="size-4" />Emergency procedures</Link>
      </div>

      {matches ? (
        <Card className="p-2">
          {matches.length === 0 ? <EmptyState icon={Search} title={`No articles match “${q}”`} description="Try a different word, or ask your coordinator in Messages." /> : (
            <ul>{matches.map((a) => (
              <li key={a.slug}><Link href={`/team/handbook/${a.slug}`} className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-canvas">
                <div className="min-w-0 flex-1"><p className="font-medium text-ink">{a.title}</p><p className="truncate text-[13px] text-muted">{a.cat} · {a.summary}</p></div><ArrowRight className="size-4 text-midnight-300" />
              </Link></li>
            ))}</ul>
          )}
        </Card>
      ) : (
        <>
          <section>
            <h3 className="mb-3 text-lg font-semibold text-ink">Recently updated</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {recent.map((a) => (
                <Link key={a.slug} href={`/team/handbook/${a.slug}`} className="card group p-5 transition hover:-translate-y-0.5">
                  <Badge tone="blush">{a.cat}</Badge>
                  <p className="mt-3 font-semibold text-ink group-hover:underline">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{a.summary}</p>
                  <p className="mt-3 flex items-center gap-1 text-[12px] text-muted"><Clock className="size-3" />{a.read_minutes} min read</p>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-3 text-lg font-semibold text-ink">Browse by topic</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tree.map((c) => {
                const I = HB_ICONS[c.icon] ?? BookOpen;
                const arts = c.articles.filter(show);
                if (!arts.length) return null;
                return (
                  <Card key={c.id} className="flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", c.slug === "emergency-procedures" ? "bg-danger-50 text-danger-500" : "bg-midnight-50 text-midnight-700")}><I className="size-5" /></span>
                      <div><p className="font-semibold text-ink">{c.title}</p><p className="text-[13px] text-muted">{c.description}</p></div>
                    </div>
                    <ul className="mt-4 space-y-1">
                      {arts.map((a) => (
                        <li key={a.slug}><Link href={`/team/handbook/${a.slug}`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm text-midnight-700 hover:bg-canvas hover:text-ink">
                          <span className="truncate">{a.title}</span>{a.audience !== "all" && <Badge tone={a.audience === "photo" ? "blush" : "info"}>{a.audience}</Badge>}
                        </Link></li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
