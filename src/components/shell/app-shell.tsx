"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ICONS, type IconName } from "./icons";
import { Search, Bell, Settings, Menu as MenuIcon, X, LogOut, User, ChevronRight, Phone, CheckCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui";
import { Menu, MenuItem } from "@/components/ui/interactive";
import { cn, ago } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";
import { markNotificationsAction } from "@/lib/actions/team";
import { CommandPalette } from "./command-palette";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number; badgeTone?: "blush" | "danger"; match?: string[] };
export type NavGroup = { title?: string; items: NavItem[] };
export type ShellUser = { name: string; email: string; avatar: string | null; roleLabel: string };
export type ShellNotification = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

const typeIcon: Record<string, IconName> = {
  opportunity: "Sparkles", booking: "CalendarCheck", message: "MessageCircle", payment: "Wallet", license: "ShieldAlert", upload: "UploadCloud", change: "RefreshCw",
};

export function AppShell({
  nav, user, children, base, notifications, unread, settingsHref, profileHref, oncall,
}: {
  nav: NavGroup[]; user: ShellUser; children: React.ReactNode; base: string; notifications: ShellNotification[]; unread: number;
  settingsHref: string; profileHref: string; oncall?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [palette, setPalette] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const all = nav.flatMap((g) => g.items);
  const active = all
    .filter((i) => pathname === i.href || (i.href !== base && pathname.startsWith(i.href + "/")) || i.match?.some((m) => pathname.startsWith(m)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const title = active?.label ?? "Overview";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center px-7"><Logo href={base} /></div>
      <nav className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-thin" aria-label="Main">
        {nav.map((g, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-6")}>
            {g.title && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-midnight-300">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const I = ICONS[item.icon];
                const on = active?.href === item.href;
                return (
                  <li key={item.href} className="relative">
                    {on && <span className="absolute -left-4 top-1/2 h-9 w-[5px] -translate-y-1/2 rounded-r-full bg-midnight-900" />}
                    <Link href={item.href} aria-current={on ? "page" : undefined}
                      className={cn("group flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition",
                        on ? "bg-midnight-50/70 text-midnight-900" : "text-midnight-300 hover:bg-midnight-50/50 hover:text-midnight-700")}>
                      <I className={cn("size-[19px] shrink-0", on ? "text-midnight-900" : "text-midnight-300 group-hover:text-midnight-500")} />
                      <span className="flex-1">{item.label}</span>
                      {!!item.badge && (
                        <span className={cn("min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold",
                          item.badgeTone === "danger" ? "bg-danger-500 text-white" : "bg-blush-400 text-white")}>{item.badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {oncall && (
        <div className="m-4 rounded-2xl bg-midnight-900 p-4 text-white">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-blush-300"><Phone className="size-3.5" /> On-call line</div>
          <p className="mt-1.5 text-lg font-semibold">(704) 555-0199</p>
          <p className="mt-1 text-[12px] leading-snug text-white/60">Wedding-day emergencies only. Routine questions → Messages.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[256px] border-r border-line bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-midnight-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-[var(--shadow-pop)] animate-pop-in">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 grid size-9 place-items-center rounded-full text-muted hover:bg-midnight-50" aria-label="Close menu"><X className="size-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[256px]">
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
          <div className="flex h-[76px] items-center gap-3 px-4 sm:px-8">
            <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl text-midnight-700 hover:bg-midnight-50 lg:hidden" aria-label="Open menu"><MenuIcon className="size-5" /></button>
            <h1 className="truncate text-xl font-semibold text-ink sm:text-[26px]">{title}</h1>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <button onClick={() => setPalette(true)}
                className="hidden h-11 w-[260px] items-center gap-3 rounded-full bg-canvas px-5 text-left text-[14px] text-midnight-300 transition hover:bg-midnight-50 md:flex">
                <Search className="size-[18px]" /> <span className="flex-1">Search for something</span>
                <kbd className="rounded-md border border-line bg-white px-1.5 text-[11px] text-muted">⌘K</kbd>
              </button>
              <button onClick={() => setPalette(true)} className="grid size-11 place-items-center rounded-full bg-canvas text-midnight-400 md:hidden" aria-label="Search"><Search className="size-[18px]" /></button>
              <Link href={settingsHref} className="hidden size-11 place-items-center rounded-full bg-canvas text-midnight-400 transition hover:text-midnight-700 sm:grid" aria-label="Settings"><Settings className="size-[19px]" /></Link>
              <NotificationsBell items={notifications} unread={unread} base={base} />
              <Menu trigger={({ toggle }) => (
                <button onClick={toggle} className="rounded-full" aria-label="Account menu"><Avatar name={user.name} src={user.avatar} size={44} /></button>
              )}>
                {(close) => (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-ink">{user.name}</p>
                      <p className="text-[12px] text-muted">{user.roleLabel} · {user.email}</p>
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <Link href={profileHref} onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-midnight-700 hover:bg-midnight-50"><User className="size-4 opacity-70" />Profile</Link>
                    <Link href={settingsHref} onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-midnight-700 hover:bg-midnight-50"><Settings className="size-4 opacity-70" />Settings</Link>
                    <div className="my-1 h-px bg-line" />
                    <form action={logoutAction}><button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-danger-500 hover:bg-danger-50"><LogOut className="size-4" />Log out</button></form>
                  </>
                )}
              </Menu>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full min-w-0 max-w-[1400px] overflow-x-clip px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} nav={all} base={base} />
    </div>
  );
}

function NotificationsBell({ items, unread, base }: { items: ShellNotification[]; unread: number; base: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Menu className="w-[360px] max-w-[calc(100vw-2rem)] p-0" trigger={({ toggle }) => (
      <button onClick={toggle} className="relative grid size-11 place-items-center rounded-full bg-canvas text-blush-500 transition hover:bg-blush-50" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <Bell className="size-[19px]" />
        {unread > 0 && <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
    )}>
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button disabled={pending} onClick={() => start(async () => { await markNotificationsAction("all"); router.refresh(); })}
                className="flex items-center gap-1 text-[12px] font-medium text-blush-600 hover:underline"><CheckCheck className="size-3.5" />Mark all read</button>
            )}
          </div>
          <ul className="max-h-[380px] overflow-y-auto scrollbar-thin">
            {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up.</li>}
            {items.map((n) => {
              const I = ICONS[typeIcon[n.type] ?? "Bell"];
              return (
                <li key={n.id}>
                  <button onClick={() => start(async () => { close(); if (!n.read_at) await markNotificationsAction([n.id]); router.push(n.link ?? `${base}/notifications`); })}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-midnight-50/60", !n.read_at && "bg-blush-50/40")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-midnight-50 text-midnight-600"><I className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold text-ink">{n.title}</span>{!n.read_at && <span className="size-2 shrink-0 rounded-full bg-blush-400" />}</span>
                      {n.body && <span className="line-clamp-2 text-[12px] text-muted">{n.body}</span>}
                      <span className="text-[11px] text-midnight-300">{ago(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link href={`${base}/notifications`} onClick={close} className="flex items-center justify-center gap-1 border-t border-line py-3 text-[13px] font-medium text-midnight-700 hover:bg-midnight-50">
            View all notifications <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </Menu>
  );
}

export { MenuItem };
