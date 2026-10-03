"use client";
import * as React from "react";
import { Receipt, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/interactive";
import { LogoMark } from "@/components/brand/logo";
import { money } from "@/lib/pricing";
import { fmtDate } from "@/lib/utils";

type R = { number: string; amount: number; date: string; method: string; kind: string; booking: string; couple: string; pkg: string; total: number; paid: number };
export function ReceiptButton({ receipt: r }: { receipt: R }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] font-medium text-midnight-700 hover:bg-canvas"><Receipt className="size-3.5" />Receipt</button>
      <Modal open={open} onClose={() => setOpen(false)} size="sm" footer={<><Button variant="outline" icon={Printer} onClick={() => window.print()}>Print</Button><Button onClick={() => setOpen(false)}>Close</Button></>}>
        <div className="py-2">
          <div className="flex items-center justify-between"><LogoMark /><span className="text-[12px] text-muted">Receipt {r.number}</span></div>
          <p className="mt-6 text-[12px] uppercase tracking-wide text-muted">Amount paid</p>
          <p className="text-3xl font-semibold text-ink">{money(r.amount)}</p>
          <p className="text-sm text-muted">{r.date ? fmtDate(r.date, "MMMM d, yyyy") : ""} · {r.method}</p>
          <dl className="mt-6 space-y-2 border-t border-dashed border-line pt-4 text-sm">
            {[["Couple", r.couple], ["Booking", r.booking], ["Package", r.pkg], ["Payment", r.kind], ["Booking total", money(r.total)], ["Paid to date", money(r.paid)], ["Remaining", money(r.total - r.paid)]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>)}
          </dl>
          <p className="mt-6 text-center text-[11px] text-muted">Visual Weddings · Test-mode receipt</p>
        </div>
      </Modal>
    </>
  );
}
