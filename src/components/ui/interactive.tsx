"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./index";

/* ───────────── Modal ───────────── */
export function Modal({
  open, onClose, title, description, children, footer, size = "md", icon,
}: {
  open: boolean; onClose: () => void; title?: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode;
  footer?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl"; icon?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[data-autofocus],input,textarea,select");
      (el ?? ref.current)?.focus();
    }, 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!mounted || !open) return null;
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-midnight-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1}
        className={cn("relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-[var(--shadow-pop)] outline-none animate-pop-in sm:rounded-3xl", w)}>
        {(title || icon) && (
          <div className="flex items-start gap-4 border-b border-line px-6 py-5">
            {icon}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="-mr-2 grid size-9 place-items-center rounded-full text-muted transition hover:bg-midnight-50 hover:text-ink" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ───────────── Drawer (side sheet) ───────────── */
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-midnight-950/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-[var(--shadow-pop)] animate-slide-in">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted hover:bg-midnight-50" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ───────────── Toasts ───────────── */
type Toast = { id: number; tone: "success" | "error" | "info" | "warning"; title: string; body?: string };
const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 4500);
  }, []);
  const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
  const tones = { success: "text-success-500", error: "text-danger-500", info: "text-info-500", warning: "text-warning-500" };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const I = icons[t.tone];
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-pop)] animate-pop-in">
              <I className={cn("mt-0.5 size-5 shrink-0", tones[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[13px] text-muted">{t.body}</p>}
              </div>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-muted hover:text-ink" aria-label="Dismiss"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => React.useContext(ToastCtx).push;

/* ───────────── Menu (dropdown) ───────────── */
export function Menu({ trigger, children, align = "right", className }: { trigger: (p: { open: boolean; toggle: () => void }) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={cn("absolute z-50 mt-2 min-w-[200px] origin-top rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)] animate-pop-in", align === "right" ? "right-0" : "left-0", className)} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
export function MenuItem({ children, onClick, icon: Icon, danger, href }: { children: React.ReactNode; onClick?: () => void; icon?: React.ComponentType<{ className?: string }>; danger?: boolean; href?: string }) {
  const cls = cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition", danger ? "text-danger-500 hover:bg-danger-50" : "text-midnight-700 hover:bg-midnight-50");
  const inner = <>{Icon && <Icon className="size-4 opacity-70" />}{children}</>;
  return href ? <a href={href} className={cls} role="menuitem">{inner}</a> : <button type="button" className={cls} onClick={onClick} role="menuitem">{inner}</button>;
}

/* ───────────── Tabs (state) ───────────── */
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl bg-midnight-50 p-1", className)} role="tablist">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={value === i.value} onClick={() => onChange(i.value)}
          className={cn("flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition",
            value === i.value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-midnight-800")}>
          {i.label}
          {i.count !== undefined && <span className="text-[11px] opacity-60">{i.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ───────────── Switch ───────────── */
export function Switch({ checked, onChange, label, description, name, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; description?: React.ReactNode; name?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "opacity-60")}>
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-ink">{label}</span>}
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-midnight-900" : "bg-midnight-100")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
    </label>
  );
}

/* ───────────── Form helpers ───────────── */
export function SubmitButton({ children, pendingText, ...p }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} {...p}>{pending && pendingText ? pendingText : children}</Button>;
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", tone = "primary", loading, children }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; description?: React.ReactNode; confirmLabel?: string; tone?: "primary" | "danger" | "blush"; loading?: boolean; children?: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant={tone} onClick={onConfirm} loading={loading} data-autofocus>{confirmLabel}</Button>
      </>}>
      {children}
    </Modal>
  );
}

/** Run a server action with toast feedback. */
export function useAction() {
  const toast = useToast();
  const [pending, start] = React.useTransition();
  const run = React.useCallback(
    <T,>(fn: () => Promise<{ ok: boolean; message?: string; data?: T }>, opts: { success?: string; onSuccess?: (d?: T) => void } = {}) =>
      start(async () => {
        try {
          const r = await fn();
          if (r.ok) {
            if (opts.success || r.message) toast({ tone: "success", title: opts.success ?? r.message! });
            opts.onSuccess?.(r.data);
          } else toast({ tone: "error", title: r.message ?? "Something went wrong" });
        } catch (e) {
          toast({ tone: "error", title: "Something went wrong", body: e instanceof Error ? e.message : undefined });
        }
      }),
    [toast],
  );
  return { run, pending };
}
