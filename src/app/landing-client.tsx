"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, CalendarDays, ArrowRight, Check, Camera, Video, Sparkles } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { Tabs } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";

export function HeroCheck({ markets }: { markets: { slug: string; label: string }[] }) {
  const router = useRouter();
  const [market, setMarket] = React.useState("");
  const [date, setDate] = React.useState("");
  const min = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  return (
    <form onSubmit={(e) => { e.preventDefault(); router.push(`/book?${new URLSearchParams({ ...(market && { market }), ...(date && { date }) })}`); }}
      className="mt-14 grid max-w-3xl gap-2 rounded-3xl bg-white/95 p-2 text-ink shadow-[var(--shadow-pop)] backdrop-blur sm:grid-cols-[1.2fr_1fr_auto]">
      <label className="flex items-center gap-3 rounded-2xl px-4 py-2.5 hover:bg-canvas">
        <MapPin className="size-5 shrink-0 text-blush-500" />
        <span className="flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Location</span>
          <select value={market} onChange={(e) => setMarket(e.target.value)} className="w-full bg-transparent text-[15px] outline-none" aria-label="Wedding location">
            <option value="">Where are you getting married?</option>
            {markets.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
          </select>
        </span>
      </label>
      <label className="flex items-center gap-3 rounded-2xl px-4 py-2.5 hover:bg-canvas">
        <CalendarDays className="size-5 shrink-0 text-blush-500" />
        <span className="flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Wedding date</span>
          <input type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-[15px] outline-none" aria-label="Wedding date" />
        </span>
      </label>
      <Button type="submit" size="lg" className="h-auto rounded-2xl px-6 py-4">Check availability <ArrowRight className="size-4" /></Button>
    </form>
  );
}

type Pkg = { slug: string; service_slug: string; name: string; tagline: string; base_price: number; hours: number; photographers: number; videographers: number; turnaround_days: number; deliverables: string[]; features: string[]; popular: boolean };
export function PricingTabs({ packages }: { packages: Pkg[] }) {
  const [svc, setSvc] = React.useState<"photo" | "video" | "both">("both");
  const list = packages.filter((p) => p.service_slug === svc);
  return (
    <div className="mt-10">
      <Tabs value={svc} onChange={setSvc} items={[{ value: "photo", label: <span className="flex items-center gap-1.5"><Camera className="size-4" />Photography</span> }, { value: "video", label: <span className="flex items-center gap-1.5"><Video className="size-4" />Videography</span> }, { value: "both", label: <span className="flex items-center gap-1.5"><Sparkles className="size-4" />Photo + Video</span> }]} />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {list.map((p) => (
          <div key={p.slug} className={cn("relative flex flex-col rounded-[28px] border p-8", p.popular ? "border-midnight-900 bg-midnight-900 text-white shadow-[var(--shadow-pop)]" : "border-line bg-white")}>
            {p.popular && <span className="absolute -top-3 left-8 rounded-full bg-blush-400 px-3 py-1 text-[12px] font-semibold text-white">Most popular</span>}
            <p className={cn("font-serif text-2xl", p.popular ? "text-white" : "text-ink")}>{p.name}</p>
            <p className={cn("text-sm", p.popular ? "text-white/60" : "text-muted")}>{p.tagline}</p>
            <p className="mt-6"><span className="text-[13px] opacity-60">from</span> <span className="text-4xl font-semibold">${p.base_price.toLocaleString()}</span></p>
            <p className={cn("mt-1 text-[13px]", p.popular ? "text-white/60" : "text-muted")}>{p.hours} hours · {[p.photographers && `${p.photographers} photographer${p.photographers > 1 ? "s" : ""}`, p.videographers && `${p.videographers} videographer${p.videographers > 1 ? "s" : ""}`].filter(Boolean).join(" + ")}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {[...p.deliverables, `Delivered in ~${Math.round(p.turnaround_days / 7)} weeks`].map((f) => <li key={f} className="flex gap-2.5"><Check className={cn("mt-0.5 size-4 shrink-0", p.popular ? "text-blush-300" : "text-success-500")} />{f}</li>)}
            </ul>
            <Link href={`/book?service=${svc}&package=${p.slug}`} className={buttonClass(p.popular ? "blush" : "outline", "lg", "mt-8 rounded-full")}>Choose {p.name}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
