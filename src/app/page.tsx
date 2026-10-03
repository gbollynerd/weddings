import Link from "next/link";
import { ArrowRight, Camera, Video, Sparkles, MapPin, CalendarCheck, Package, Heart, Star, ShieldCheck, Clock, Users, MessageCircle, Wallet, Images, ChevronDown, Quote } from "lucide-react";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";
import { sql } from "@/lib/db";
import { catalog } from "@/lib/services/catalog";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { buttonClass } from "@/components/ui";
import { IMG, unsplash } from "@/content/catalog";
import { HeroCheck, PricingTabs } from "./landing-client";


export default async function Landing() {
  const [session, cat, reviews] = await Promise.all([getSession(), catalog(), sql`select couple, location, rating, body from reviews where featured order by created_at desc limit 6`]);
  const regions = cat.markets.reduce<Record<string, typeof cat.markets>>((g, m) => { (g[m.region] ??= []).push(m); return g; }, {});
  const account = session ? { href: homeFor(session.role), label: "My account" } : null;
  const fromPrice = (svc: string) => Math.min(...cat.packages.filter((p) => p.service_slug === svc).map((p) => p.base_price));

  return (
    <div className="bg-porcelain">
      <SiteHeader overlay account={account} />

      {/* 1 · Hero */}
      <section data-hero className="relative isolate overflow-hidden bg-midnight-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={unsplash(IMG.hero, 2000)} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-55" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight-950/95 via-midnight-950/60 to-midnight-950/10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-midnight-950/80 to-transparent" />
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-36 sm:px-8 lg:pb-28 lg:pt-44">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[13px] text-blush-200 backdrop-blur"><Sparkles className="size-3.5" />Wedding photography & film in {cat.markets.length} cities</p>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">Your day,<br /><span className="italic text-blush-300">beautifully</span> remembered.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">Visual Weddings pairs you with a vetted local photographer and filmmaker, with transparent pricing and a planning dashboard that keeps everything in one place.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className={buttonClass("blush", "lg", "rounded-full px-7")}>Book Your Wedding <ArrowRight className="size-4" /></Link>
              <Link href="#services" className={buttonClass("outline", "lg", "rounded-full border-white/30 bg-white/5 px-7 text-white hover:bg-white/10 hover:border-white/50")}>Explore Services</Link>
            </div>
          </div>
          <HeroCheck markets={cat.markets.map((m) => ({ slug: m.slug, label: `${m.city}, ${m.state}` }))} />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:px-8 lg:grid-cols-4">
          {[[Clock, "Book in 10 minutes", "Live availability & instant confirmation"], [ShieldCheck, "Vetted, insured teams", "Every photographer is licensed & reviewed"], [Wallet, "Transparent pricing", "Flexible deposits & payment plans"], [Images, "Fast delivery", "Sneak peeks in 48 hours"]].map(([I, t, d]) => {
            const Icon = I as typeof Clock;
            return <div key={t as string} className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-blush-50 text-blush-500"><Icon className="size-5" /></span><div><p className="text-sm font-semibold text-ink">{t as string}</p><p className="text-[13px] text-muted">{d as string}</p></div></div>;
          })}
        </div>
      </section>

      {/* 2 · Services */}
      <section id="services" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">Services</p><h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Photography, film, or both — one coordinated team.</h2></div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              { slug: "photo", icon: Camera, img: IMG.lakeside, title: "Wedding Photography", body: "Documentary-led coverage with natural colour and gently directed portraits." },
              { slug: "video", icon: Video, img: IMG.veilBW, title: "Wedding Videography", body: "Cinematic highlight and feature films with crisp, broadcast-quality audio." },
              { slug: "both", icon: Sparkles, img: IMG.confetti, title: "Photo + Video", body: "Two crews that plan together and move as one. Our most popular choice." },
            ].map((s) => (
              <Link key={s.slug} href={`/book?service=${s.slug}`} className="group relative overflow-hidden rounded-[28px] bg-midnight-900 text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(s.img, 900, 1100)} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <span className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur"><s.icon className="size-5" /></span>
                  <h3 className="mt-4 font-serif text-2xl">{s.title}</h3>
                  <p className="mt-2 text-sm text-white/75">{s.body}</p>
                  <p className="mt-4 flex items-center gap-2 text-sm font-medium text-blush-200">From ${fromPrice(s.slug).toLocaleString()} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3 · How it works */}
      <section id="how" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">How it works</p><h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">From first click to final gallery.</h2></div>
          <ol className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[[MapPin, "Check availability", "Tell us where and when. We'll show live availability for your date."], [Package, "Choose your package", "Compare clear, all-inclusive packages and add only what you need."], [CalendarCheck, "Reserve with a deposit", "Secure your date in minutes with a deposit or payment plan."], [Heart, "Enjoy every moment", "Plan in your dashboard, meet your team, and relive it all in your gallery."]].map(([I, t, d], i) => {
              const Icon = I as typeof MapPin;
              return (
                <li key={t as string} className="relative rounded-3xl border border-line bg-porcelain p-7">
                  <span className="font-serif text-5xl text-blush-200">0{i + 1}</span>
                  <span className="absolute right-7 top-8 grid size-11 place-items-center rounded-full bg-midnight-900 text-white"><Icon className="size-5" /></span>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{t as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{d as string}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* 4 · Pricing */}
      <section id="pricing" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">Packages</p><h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Honest pricing. No surprises.</h2><p className="mt-3 text-muted">Starting prices shown — your exact quote depends on your city and is shown instantly when you book.</p></div>
          </div>
          <PricingTabs packages={cat.packages} />
        </div>
      </section>

      {/* 5 · Portfolio */}
      <section id="portfolio" className="scroll-mt-20 bg-midnight-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-300">Portfolio</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Real moments, honestly told.</h2></div>
            <Link href="/book" className="inline-flex items-center gap-2 text-sm font-medium text-blush-200 hover:text-white">Start your story <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-12 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
            {[IMG.veilBW, IMG.rings, IMG.lakeside, IMG.aisle, IMG.beach, IMG.bouquetHold, IMG.mountain, IMG.tables, IMG.handsHeld, IMG.arch, IMG.confetti, IMG.ringsFloral].map((id, i) => (
              <div key={id} className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unsplash(id, 700)} alt="" loading="lazy" className={`w-full object-cover transition duration-700 hover:scale-105 ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · Why us */}
      <section className="py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={unsplash(IMG.handsHeld, 1000, 1150)} alt="" loading="lazy" className="aspect-[6/7] w-full rounded-[32px] object-cover" />
            <div className="absolute -bottom-6 -right-2 w-64 rounded-3xl bg-white p-5 shadow-[var(--shadow-pop)] sm:-right-6">
              <p className="text-[12px] uppercase tracking-wide text-muted">Your dashboard</p>
              <p className="mt-1 font-serif text-xl text-ink">Sarah & James</p>
              <div className="mt-3 space-y-2 text-[13px]">
                <p className="flex items-center justify-between"><span className="text-muted">Team</span><span className="font-medium text-ink">Confirmed</span></p>
                <p className="flex items-center justify-between"><span className="text-muted">Balance</span><span className="font-medium text-success-700">On schedule</span></p>
                <p className="flex items-center justify-between"><span className="text-muted">Gallery</span><span className="font-medium text-ink">In 5 weeks</span></p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">Why Visual Weddings</p>
            <h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">The craft of an artist, the reliability of a team.</h2>
            <ul className="mt-10 grid gap-7 sm:grid-cols-2">
              {[[Users, "Local, vetted teams", "Every photographer and filmmaker is reviewed, insured and trained on our standards."], [ShieldCheck, "Backup built in", "If anything happens, a standby team member steps in — your day is never at risk."], [MessageCircle, "One coordinator", "A dedicated coordinator answers questions and plans your timeline with you."], [Star, "Consistent quality", "Every gallery and film is edited in-house to the same high standard."]].map(([I, t, d]) => {
                const Icon = I as typeof Users;
                return <li key={t as string}><span className="grid size-11 place-items-center rounded-2xl bg-midnight-900 text-white"><Icon className="size-5" /></span><p className="mt-4 font-semibold text-ink">{t as string}</p><p className="mt-1 text-sm leading-6 text-muted">{d as string}</p></li>;
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* 7 · Reviews */}
      <section className="bg-blush-50 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-600">Kind words</p><h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">What couples tell us</h2></div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.couple} className="flex flex-col rounded-3xl bg-white p-7 shadow-[var(--shadow-card)]">
                <Quote className="size-7 text-blush-300" />
                <blockquote className="mt-4 flex-1 text-[15px] leading-7 text-midnight-700">{r.body}</blockquote>
                <figcaption className="mt-6 flex items-center justify-between border-t border-line pt-4">
                  <div><p className="font-semibold text-ink">{r.couple}</p><p className="text-[13px] text-muted">{r.location}</p></div>
                  <span className="flex text-blush-400">{Array.from({ length: r.rating }, (_, i) => <Star key={i} className="size-4 fill-current" />)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-8 text-center text-[12px] text-muted">Illustrative testimonials for this demo build — replace with verified reviews before launch.</p>
        </div>
      </section>

      {/* 8 · Locations */}
      <section id="locations" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">Locations</p><h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Local teams in {cat.markets.length} cities.</h2><p className="mt-3 text-muted">No travel fees within each city&apos;s service area. Getting married somewhere else? We travel — just ask.</p></div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(regions).map(([region, ms]) => (
              <div key={region}>
                <p className="text-sm font-semibold text-ink">{region}</p>
                <ul className="mt-3 space-y-1.5">
                  {ms.map((m) => <li key={m.slug}><Link href={`/book?market=${m.slug}`} className="group inline-flex items-center gap-1.5 text-[15px] text-midnight-600 hover:text-ink"><MapPin className="size-3.5 text-blush-400" />{m.city}, {m.state}<ArrowRight className="size-3 opacity-0 transition group-hover:opacity-100" /></Link></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9 · FAQ */}
      <section id="faq" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">FAQ</p><h2 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Questions, answered.</h2><p className="mt-4 text-muted">Can&apos;t find what you need? Book a free planning call from your dashboard or email hello@visualweddings.example.</p></div>
          <div className="divide-y divide-line rounded-3xl border border-line">
            {[
              ["How far in advance should we book?", "Popular Saturdays book 9–12 months ahead. You can book any date at least 14 days away, and our availability check shows you instantly if your date is open."],
              ["Can we meet our photographer before the wedding?", "Yes. Once your team is assigned you can message them through your dashboard, and Signature packages and above include an engagement session."],
              ["How does payment work?", "A 30% deposit reserves your date. Pay the balance 30 days before the wedding, or split it into monthly installments. You can also pay in full."],
              ["What if our photographer gets sick?", "Every wedding has standby coverage. If your assigned photographer can't attend, an equally qualified team member steps in and your coordinator lets you know immediately."],
              ["When will we receive our photos and film?", "A sneak peek arrives within 48 hours. Full galleries arrive in 4–6 weeks and films in 6–8 weeks depending on your package."],
              ["Do you travel outside your cities?", "Absolutely. Destination and out-of-area weddings are quoted individually — choose the nearest city when booking and add a note."],
            ].map(([q, a]) => (
              <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">{q}<ChevronDown className="size-5 shrink-0 text-midnight-300 transition group-open:rotate-180" /></summary>
                <p className="mt-3 text-[15px] leading-7 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10 · Final CTA */}
      <section className="relative isolate overflow-hidden bg-midnight-900 py-24 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={unsplash(IMG.aisle, 1800)} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover opacity-25" />
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="font-serif text-4xl sm:text-6xl">Let&apos;s save your date.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">Check availability, choose your package and reserve your team in about ten minutes.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book" className={buttonClass("blush", "lg", "rounded-full px-8")}>Book Your Wedding <ArrowRight className="size-4" /></Link>
            <Link href="#pricing" className={buttonClass("outline", "lg", "rounded-full border-white/30 bg-transparent px-8 text-white hover:bg-white/10")}>See packages</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
