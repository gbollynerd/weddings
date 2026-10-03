"use client";
import * as React from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  ["Services", "/#services"], ["How it works", "/#how"], ["Pricing", "/#pricing"], ["Locations", "/#locations"], ["Portfolio", "/#portfolio"], ["FAQ", "/#faq"],
];

export function SiteHeader({ overlay, account }: { overlay?: boolean; account: { href: string; label: string } | null }) {
  // Start in the solid (dark-text) style so the header is always legible — even before
  // JavaScript loads. Switch to the transparent white-text style only while the header
  // actually sits over the dark hero.
  const [overHero, setOverHero] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!overlay) return;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const f = () => setOverHero(!!hero && hero.getBoundingClientRect().bottom > 72 && window.scrollY < 40);
    f();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f); window.removeEventListener("resize", f); };
  }, [overlay]);
  const light = !!overlay && overHero && !open;
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50", light ? "bg-transparent" : "border-b border-line/70 bg-porcelain/90 backdrop-blur")}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Logo light={light} />
        <nav className="ml-6 hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV.map(([l, h]) => <Link key={h} href={h} className={cn("text-[14px]", light ? "text-white/80 hover:text-white" : "text-midnight-600 hover:text-ink")}>{l}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {account ? (
            <Link href={account.href} className={cn("hidden text-[14px] font-medium sm:block", light ? "text-white" : "text-midnight-700")}>{account.label}</Link>
          ) : (
            <Link href="/login" className={cn("hidden px-3 text-[14px] font-medium sm:block", light ? "text-white" : "text-midnight-700")}>Log in</Link>
          )}
          <Link href="/book" className={buttonClass(light ? "blush" : "primary", "md", "hidden rounded-full px-5 sm:inline-flex")}>Book Your Wedding</Link>
          <button onClick={() => setOpen((o) => !o)} className={cn("grid size-10 place-items-center rounded-full lg:hidden", light ? "text-white" : "text-ink")} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-porcelain px-5 pb-6 pt-2 lg:hidden animate-fade-in">
          {NAV.map(([l, h]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="flex items-center justify-between border-b border-line py-3.5 text-ink">{l}<ArrowRight className="size-4 text-midnight-300" /></Link>)}
          <div className="mt-5 grid gap-2">
            <Link href="/book" className={buttonClass("primary", "lg", "rounded-full")}>Book Your Wedding</Link>
            <Link href={account?.href ?? "/login"} className={buttonClass("outline", "lg", "rounded-full")}>{account?.label ?? "Log in"}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
