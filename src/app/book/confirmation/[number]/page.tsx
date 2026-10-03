import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CalendarDays, MapPin, Package, Users, ClipboardList, MessageCircle, Wallet, ArrowRight, Camera, Video, Mail } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { clientBooking } from "@/lib/services/client";
import { Logo } from "@/components/brand/logo";
import { buttonClass, Avatar, Badge } from "@/components/ui";
import { money, ROLE_LABEL } from "@/lib/pricing";
import { fmtLong, fmtDate } from "@/lib/utils";
import { PrintButton } from "./print";

export const metadata = { title: "Booking confirmed" };

export default async function Confirmation({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(["client"], `/book/confirmation/${number}`);
  const b = await clientBooking(user.id, number);
  if (!b) notFound();
  const paidNow = b.payments.filter((p) => p.status === "paid");
  return (
    <div className="min-h-screen bg-porcelain">
      <header className="border-b border-line bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center px-5"><Logo /></div></header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-success-50 text-success-500 animate-pop-in"><CheckCircle2 className="size-10" /></div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">You&apos;re booked!</p>
          <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">Congratulations, {b.couple}.</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">Your date is reserved. We&apos;ve sent a confirmation and receipt to <b className="text-ink">{user.email}</b>.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm ring-1 ring-line">Booking number <b className="font-mono text-ink">{b.booking_number}</b></p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="card overflow-hidden">
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              {[[CalendarDays, "Wedding date", fmtLong(b.wedding_date)], [MapPin, "Location", `${b.venue_name} · ${b.city}, ${b.state}`], [Package, "Package", `${b.package_name} · ${b.hours} hours`], [b.service_slug === "video" ? Video : Camera, "Services", b.service_slug === "both" ? "Photography + Videography" : b.service_slug === "photo" ? "Photography" : "Videography"]].map(([I, k, v]) => {
                const Icon = I as typeof CalendarDays;
                return <div key={k as string} className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-midnight-50 text-midnight-700"><Icon className="size-5" /></span><div><p className="text-[12px] uppercase tracking-wide text-muted">{k as string}</p><p className="font-medium text-ink">{v as string}</p></div></div>;
              })}
            </div>
            {b.addons.length > 0 && <div className="border-t border-line px-6 py-4"><p className="text-[12px] uppercase tracking-wide text-muted">Add-ons</p><div className="mt-2 flex flex-wrap gap-2">{b.addons.map((a) => <Badge key={a.name} tone="blush">{a.name}{a.quantity > 1 ? ` × ${a.quantity}` : ""}</Badge>)}</div></div>}
            <div className="border-t border-line px-6 py-5">
              <p className="flex items-center gap-2 font-semibold text-ink"><Users className="size-4" />Your team</p>
              <ul className="mt-3 space-y-2">
                {b.team.map((t, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Avatar name={t.full_name ?? ROLE_LABEL[t.role]} src={t.avatar_url} size={36} />
                    <span className="flex-1"><span className="font-medium text-ink">{t.full_name ?? ROLE_LABEL[t.role]}</span><span className="block text-[12px] text-muted">{t.full_name ? ROLE_LABEL[t.role] : "We'll introduce your team within 2 weeks"}</span></span>
                    <Badge tone={t.full_name ? "success" : "neutral"}>{t.full_name ? "Assigned" : "Matching"}</Badge>
                  </li>
                ))}
                {b.coordinator && <li className="flex items-center gap-3 text-sm"><Avatar name={b.coordinator.full_name} src={b.coordinator.avatar_url} size={36} /><span className="flex-1"><span className="font-medium text-ink">{b.coordinator.full_name}</span><span className="block text-[12px] text-muted">Your coordinator</span></span><Badge tone="blush">Assigned</Badge></li>}
              </ul>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="card p-6">
              <p className="flex items-center gap-2 font-semibold text-ink"><Wallet className="size-4" />Payment summary</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Package</dt><dd>{money(b.package_price)}</dd></div>
                {b.addons_total > 0 && <div className="flex justify-between"><dt className="text-muted">Add-ons</dt><dd>{money(b.addons_total)}</dd></div>}
                <div className="flex justify-between border-t border-dashed border-line pt-2 font-semibold text-ink"><dt>Total</dt><dd>{money(b.total)}</dd></div>
                {paidNow.map((p) => <div key={p.id} className="flex justify-between text-success-700"><dt>Paid today · {p.method_brand} ···· {p.method_last4}</dt><dd>−{money(p.amount)}</dd></div>)}
                <div className="flex justify-between rounded-xl bg-canvas px-3 py-2 font-semibold text-ink"><dt>Remaining balance</dt><dd>{money(b.balance)}</dd></div>
                {b.nextPayment && <p className="text-[12px] text-muted">Next payment {money(b.nextPayment.amount)} due {fmtDate(b.nextPayment.due_date)}</p>}
              </dl>
              <PrintButton />
            </section>
            <section className="card p-6">
              <p className="font-semibold text-ink">Next steps</p>
              <ol className="mt-4 space-y-4 text-sm">
                {[[ClipboardList, "Complete your wedding questionnaire", "Tell us about your timeline, family and must-have shots."], [MessageCircle, "Say hello to your coordinator", "Your coordinator has already messaged you."], [Users, "Meet your team", "We'll introduce your photographer and filmmaker soon."], [Mail, "Watch your inbox", "Reminders arrive before each payment."]].map(([I, t, d], i) => {
                  const Icon = I as typeof Mail;
                  return <li key={i} className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-blush-50 text-blush-500"><Icon className="size-4" /></span><span><b className="text-ink">{t as string}</b><span className="block text-muted">{d as string}</span></span></li>;
                })}
              </ol>
            </section>
          </aside>
        </div>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/client" className={buttonClass("primary", "lg", "rounded-full px-8")}>Go to my dashboard <ArrowRight className="size-4" /></Link>
          <Link href="/client/questionnaire" className={buttonClass("outline", "lg", "rounded-full px-8")}>Start questionnaire</Link>
        </div>
      </main>
    </div>
  );
}
