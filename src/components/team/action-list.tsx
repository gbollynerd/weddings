"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, CalendarDays, ClipboardCheck, UploadCloud, Wallet, UserRound, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAction } from "@/components/ui/interactive";
import { confirmPrepAction } from "@/lib/actions/team";
import { EmptyState } from "@/components/ui";

type Item = { id: string; title: string; detail: string; href: string; tone: "danger" | "warning" | "info" | "blush"; cta: string; assignmentId?: string };
const toneCls = { danger: "bg-danger-50 text-danger-500", warning: "bg-warning-50 text-warning-500", info: "bg-info-50 text-info-500", blush: "bg-blush-50 text-blush-500" };
const iconFor = (id: string) => id.startsWith("lic") ? ShieldAlert : id.startsWith("avail") ? CalendarDays : id.startsWith("prep") ? ClipboardCheck : id.startsWith("up") ? UploadCloud : id.startsWith("pay") ? Wallet : UserRound;

export function ActionList({ items }: { items: Item[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  if (!items.length) return <EmptyState icon={CheckCircle2} title="You're all set" description="Nothing needs your attention right now." className="py-8" />;
  return (
    <ul className="space-y-1">
      {items.map((i) => {
        const I = iconFor(i.id);
        return (
          <li key={i.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-midnight-50/60">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", toneCls[i.tone])}><I className="size-5" /></span>
            <Link href={i.href} className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">{i.title}</p>
              <p className="truncate text-[12px] text-muted">{i.detail}</p>
            </Link>
            {i.assignmentId ? (
              <button disabled={pending} onClick={() => run(() => confirmPrepAction(i.assignmentId!), { onSuccess: () => router.refresh() })}
                className="shrink-0 rounded-full border border-line px-3 py-1 text-[12px] font-medium text-midnight-700 hover:bg-white">Mark reviewed</button>
            ) : (
              <Link href={i.href} className="shrink-0 rounded-full border border-line px-3 py-1 text-[12px] font-medium text-midnight-700 hover:bg-white">{i.cta}</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
