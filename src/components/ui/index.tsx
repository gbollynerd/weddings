import * as React from "react";
import Link from "next/link";
import { cn, initials } from "@/lib/utils";
import { Loader2, type LucideIcon } from "lucide-react";

/* ───────────── Button ───────────── */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "blush" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";
const buttonBase =
  "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 select-none whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-midnight-900 text-white hover:bg-midnight-800 shadow-sm",
  secondary: "bg-midnight-50 text-midnight-800 hover:bg-midnight-100",
  outline: "border border-line bg-white text-midnight-800 hover:border-midnight-200 hover:bg-midnight-50/50",
  ghost: "text-midnight-600 hover:bg-midnight-50 hover:text-midnight-900",
  blush: "bg-blush-400 text-white hover:bg-blush-500 shadow-sm",
  danger: "bg-danger-500 text-white hover:bg-danger-700",
  link: "text-blush-600 hover:text-blush-700 underline-offset-4 hover:underline px-0",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-10 w-10",
};
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon: Icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
});
export function ButtonLink({ href, variant = "primary", size = "md", className, icon: Icon, children, ...rest }:
  { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; icon?: LucideIcon; children?: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {Icon && <Icon className="size-4" />}
      {children}
    </Link>
  );
}

/* ───────────── Card ───────────── */
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...p}>{children}</div>;
}
export function CardHeader({ title, subtitle, action, className }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-5 pb-5 pt-4 sm:px-6 sm:pb-6", className)}>{children}</div>;
}
export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-lg font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

/* ───────────── Badges ───────────── */
type Tone = "neutral" | "midnight" | "blush" | "success" | "warning" | "danger" | "info";
const toneCls: Record<Tone, string> = {
  neutral: "bg-midnight-50 text-midnight-500",
  midnight: "bg-midnight-900 text-white",
  blush: "bg-blush-100 text-blush-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  info: "bg-info-50 text-info-500",
};
export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap", toneCls[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

const STATUS: Record<string, [string, Tone]> = {
  // assignments / opportunities
  open: ["Available", "info"], available: ["Available", "success"], pending: ["Pending", "warning"], accepted: ["Accepted", "success"],
  filled: ["Filled", "neutral"], expired: ["Expired", "danger"], completed: ["Completed", "midnight"], cancelled: ["Cancelled", "danger"],
  confirmed: ["Confirmed", "success"], declined: ["Declined", "neutral"],
  // payouts
  processing: ["Processing", "info"], paid: ["Paid", "success"], on_hold: ["On hold", "danger"], scheduled: ["Scheduled", "neutral"],
  failed: ["Failed", "danger"], refunded: ["Refunded", "neutral"], upcoming: ["Upcoming", "blush"],
  // uploads
  uploading: ["Uploading", "info"], uploaded: ["Uploaded", "success"], ready: ["Ready", "success"],
  // licenses
  not_submitted: ["Not submitted", "neutral"], pending_review: ["Pending review", "warning"], verified: ["Verified", "success"],
  expiring_soon: ["Expiring soon", "warning"], rejected: ["Rejected", "danger"],
  // availability
  unavailable: ["Unavailable", "neutral"], personal: ["Personal", "blush"], booked: ["Booked", "midnight"],
  // questionnaire
  not_started: ["Not started", "neutral"], draft: ["In progress", "warning"], submitted: ["Submitted", "success"],
};
export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const [text, tone] = STATUS[status] ?? [status, "neutral" as Tone];
  return <Badge tone={tone} dot className={className}>{label ?? text}</Badge>;
}

/* ───────────── Avatar ───────────── */
export function Avatar({ name, src, size = 40, className, ring }: { name: string; src?: string | null; size?: number; className?: string; ring?: boolean }) {
  const palette = ["bg-blush-200 text-blush-700", "bg-midnight-100 text-midnight-700", "bg-success-50 text-success-700", "bg-warning-50 text-warning-700", "bg-info-50 text-info-500"];
  const tone = palette[(name.charCodeAt(0) + name.length) % palette.length];
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold", tone, ring && "ring-2 ring-white", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
      title={name}
    >
      {initials(name)}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      )}
    </span>
  );
}
export function AvatarStack({ people, max = 4, size = 28 }: { people: { name: string; src?: string | null }[]; max?: number; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {people.slice(0, max).map((p, i) => <Avatar key={i} name={p.name} src={p.src} size={size} ring />)}
      {people.length > max && (
        <span className="inline-flex items-center justify-center rounded-full bg-midnight-100 text-[11px] font-semibold text-midnight-600 ring-2 ring-white" style={{ width: size, height: size }}>
          +{people.length - max}
        </span>
      )}
    </div>
  );
}

/* ───────────── Forms ───────────── */
const fieldBase =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[14px] text-ink placeholder:text-midnight-300 transition focus:border-midnight-300 focus:outline-none focus:ring-4 focus:ring-midnight-50 disabled:bg-midnight-50/60 disabled:text-muted aria-[invalid=true]:border-danger-500 aria-[invalid=true]:ring-danger-50";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...p} />;
});
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-[96px] py-3 leading-6", className)} {...p} />;
});
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} className={cn(fieldBase, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%237a80a3%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-10", className)} {...p}>
      {children}
    </select>
  );
});
export function Field({ label, hint, error, children, className, required, htmlFor }: { label?: React.ReactNode; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string; required?: boolean; htmlFor?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-midnight-700">
          {label} {required && <span className="text-blush-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-[12px] font-medium text-danger-500" role="alert">{error}</p> : hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}
export function Checkbox({ label, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm text-midnight-700", className)}>
      <input type="checkbox" className="size-4 rounded border-midnight-200 accent-midnight-900" {...p} />
      {label}
    </label>
  );
}

/* ───────────── Feedback ───────────── */
export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-blush-50 text-blush-500">
        <Icon className="size-6" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function Alert({ tone = "info", title, children, icon: Icon, className, action }: { tone?: "info" | "warning" | "danger" | "success" | "blush"; title?: React.ReactNode; children?: React.ReactNode; icon?: LucideIcon; className?: string; action?: React.ReactNode }) {
  const cls = {
    info: "bg-info-50 text-midnight-800 border-info-500/15",
    warning: "bg-warning-50 text-warning-700 border-warning-500/20",
    danger: "bg-danger-50 text-danger-700 border-danger-500/20",
    success: "bg-success-50 text-success-700 border-success-500/20",
    blush: "bg-blush-50 text-blush-700 border-blush-200",
  }[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", cls, className)} role="status">
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
        </div>
        {action && <div className="shrink-0 self-start">{action}</div>}
      </div>
    </div>
  );
}
export function Progress({ value, className, tone = "midnight" }: { value: number; className?: string; tone?: "midnight" | "blush" | "success" | "danger" }) {
  const c = { midnight: "bg-midnight-900", blush: "bg-blush-400", success: "bg-success-500", danger: "bg-danger-500" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-midnight-50", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-300", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* ───────────── Data display ───────────── */
export function StatCard({ icon: Icon, label, value, tone = "midnight", sub, className }: { icon: LucideIcon; label: string; value: React.ReactNode; tone?: "midnight" | "blush" | "success" | "warning" | "info"; sub?: React.ReactNode; className?: string }) {
  const t = {
    midnight: "bg-midnight-50 text-midnight-700",
    blush: "bg-blush-50 text-blush-500",
    success: "bg-success-50 text-success-500",
    warning: "bg-warning-50 text-warning-500",
    info: "bg-info-50 text-info-500",
  }[tone];
  return (
    <Card className={cn("flex items-center gap-4 p-5", className)}>
      <div className={cn("grid size-12 shrink-0 place-items-center rounded-full", t)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="truncate text-xl font-semibold text-ink">{value}</p>
        {sub && <p className="text-[12px] text-muted">{sub}</p>}
      </div>
    </Card>
  );
}
export function DescList({ items, className, cols = 2 }: { items: [React.ReactNode, React.ReactNode][]; className?: string; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[12px] uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto scrollbar-thin", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-3 text-[12px] font-medium uppercase tracking-wide text-muted first:pl-6 last:pr-6", className)}>{children}</th>;
}
export function Td({ children, className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5 text-midnight-700 first:pl-6 last:pr-6", className)} {...p}>{children}</td>;
}

export function PageHeader({ title, description, actions, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LinkTabs({ tabs, active }: { tabs: { href: string; label: string; count?: number }[]; active: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line scrollbar-thin" role="tablist">
      {tabs.map((t) => {
        const on = t.href === active;
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={on}
            className={cn("relative -mb-px flex items-center gap-2 whitespace-nowrap px-4 pb-3 pt-1 text-sm font-medium transition",
              on ? "text-midnight-900" : "text-muted hover:text-midnight-700")}>
            {t.label}
            {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px]", on ? "bg-midnight-900 text-white" : "bg-midnight-50 text-midnight-500")}>{t.count}</span>}
            {on && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-midnight-900" />}
          </Link>
        );
      })}
    </div>
  );
}
