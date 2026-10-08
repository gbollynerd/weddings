import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="bg-midnight-950 text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-6">Modern wedding photography and film, booked in minutes and delivered by a vetted local team.</p>
          <div className="mt-5 space-y-2 text-sm">
            <p className="flex items-center gap-2"><Phone className="size-4 text-blush-300" />(704) 555-0140</p>
            <p className="flex items-center gap-2"><Mail className="size-4 text-blush-300" />hello@visualweddings.example</p>
          </div>
        </div>
        {[
          ["Services", [["Photography", "/book?service=photo"], ["Videography", "/book?service=video"], ["Photo + Video", "/book?service=both"], ["Pricing", "/#pricing"]]],
          ["Company", [["How it works", "/#how"], ["Locations", "/#locations"], ["Portfolio", "/#portfolio"], ["FAQ", "/#faq"]]],
          ["Accounts", [["Client login", "/login"], ["Create account", "/signup"], ["Team login", "/login?next=/team"], ["Join our team", "/join"], ["Book now", "/book"]]],
        ].map(([title, links]) => (
          <div key={title as string}>
            <p className="text-sm font-semibold text-white">{title as string}</p>
            <ul className="mt-4 space-y-2.5 text-sm">{(links as string[][]).map(([l, h]) => <li key={h}><Link href={h} className="hover:text-white">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-[12px] text-white/50 sm:flex-row sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Visual Weddings. All rights reserved.</p>
          <p><Link href="/terms/service-agreement" className="underline">Service agreement</Link> · <Link href="/terms/cancellation-policy" className="underline">Cancellation policy</Link> · Demo build · Sample content and imagery for illustration · <Link href="/login" className="underline">Team portal</Link></p>
        </div>
      </div>
    </footer>
  );
}
