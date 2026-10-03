"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Heart, BookOpen, MessageCircle, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./app-shell";
import { ICONS } from "./icons";

type Hit = { type: "wedding" | "article" | "conversation" | "page"; title: string; sub?: string; href: string };
const typeIcon = { wedding: Heart, article: BookOpen, conversation: MessageCircle, page: ArrowRight };

export function CommandPalette({ open, onClose, nav, base }: { open: boolean; onClose: () => void; nav: NavItem[]; base: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);
  React.useEffect(() => {
    if (!open) return;
    const pages: Hit[] = nav.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())).map((n) => ({ type: "page", title: n.label, href: n.href, sub: "Go to page" }));
    if (q.trim().length < 2) { setHits(pages); return; }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&base=${encodeURIComponent(base)}`, { signal: ctl.signal })
        .then((r) => r.json()).then((d: { hits: Hit[] }) => { setHits([...pages, ...d.hits]); setIdx(0); })
        .catch(() => {}).finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open, nav, base]);

  if (!open || typeof document === "undefined") return null;
  const go = (h: Hit) => { onClose(); router.push(h.href); };
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 animate-fade-in bg-midnight-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-pop)] animate-pop-in">
        <div className="flex items-center gap-3 border-b border-line px-5">
          {loading ? <Loader2 className="size-5 animate-spin text-midnight-300" /> : <Search className="size-5 text-midnight-300" />}
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search weddings, handbook, messages…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-midnight-300"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(hits.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter" && hits[idx]) go(hits[idx]);
            }} />
          <kbd className="rounded-md border border-line px-1.5 text-[11px] text-muted">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin" role="listbox">
          {hits.length === 0 && !loading && <li className="px-4 py-10 text-center text-sm text-muted">No results for “{q}”.</li>}
          {hits.map((h, i) => {
            const navIcon = h.type === "page" ? nav.find((n) => n.href === h.href)?.icon : undefined;
            const I = navIcon ? ICONS[navIcon] : typeIcon[h.type];
            return (
              <li key={h.type + h.href + i} role="option" aria-selected={i === idx}>
                <button onMouseEnter={() => setIdx(i)} onClick={() => go(h)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === idx ? "bg-midnight-50" : "")}>
                  <span className="grid size-8 place-items-center rounded-lg bg-white text-midnight-500 ring-1 ring-line"><I className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{h.title}</span>{h.sub && <span className="block truncate text-[12px] text-muted">{h.sub}</span>}</span>
                  {i === idx && <CornerDownLeft className="size-4 text-midnight-300" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
