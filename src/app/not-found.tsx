import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui";
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-porcelain px-6 text-center">
      <div>
        <Logo />
        <p className="mt-10 font-serif text-7xl text-blush-300">404</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">This page wandered off.</h1>
        <p className="mt-2 text-muted">The link may be old, or you may not have access to it.</p>
        <div className="mt-8 flex justify-center gap-3"><Link href="/" className={buttonClass("primary", "lg", "rounded-full")}>Go home</Link><Link href="/login" className={buttonClass("outline", "lg", "rounded-full")}>Log in</Link></div>
      </div>
    </div>
  );
}
