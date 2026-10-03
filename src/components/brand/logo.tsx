import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8", className)} aria-hidden>
      <rect width="40" height="40" rx="12" fill={light ? "#ffffff" : "#1b2140"} />
      <circle cx="16.5" cy="20" r="7.5" fill="none" stroke={light ? "#1b2140" : "#ffffff"} strokeWidth="2.4" />
      <circle cx="23.5" cy="20" r="7.5" fill="none" stroke="#d99a92" strokeWidth="2.4" />
    </svg>
  );
}

export function Logo({ href = "/", light, className, compact }: { href?: string; light?: boolean; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Visual Weddings home">
      <LogoMark light={light} />
      {!compact && (
        <span className={cn("font-serif text-[19px] font-medium tracking-tight", light ? "text-white" : "text-ink")}>
          Visual<span className="text-blush-400"> Weddings</span>
        </span>
      )}
    </Link>
  );
}
