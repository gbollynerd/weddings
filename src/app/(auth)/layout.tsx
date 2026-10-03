import { Logo } from "@/components/brand/logo";
import { unsplash, IMG } from "@/content/catalog";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-midnight-950 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={unsplash(IMG.veilBW, 1400)} alt="" className="absolute inset-0 size-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo light />
          <div className="max-w-md">
            <p className="font-serif text-4xl leading-tight">Every moment, carried forward.</p>
            <p className="mt-4 text-white/70">One home for couples planning their day and the photographers and filmmakers who capture it.</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col bg-porcelain">
        <div className="p-6 lg:hidden"><Logo /></div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
