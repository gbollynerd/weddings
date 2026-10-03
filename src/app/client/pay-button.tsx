"use client";
import * as React from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui";
import { PayModal } from "@/components/payments/pay-modal";

export function PayButton({ paymentId, amount, label, variant = "primary", className }: { paymentId: string | "all"; amount: number; label: string; variant?: "primary" | "outline"; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant={variant} icon={CreditCard} className={className ?? "mt-3 w-full"} onClick={() => setOpen(true)}>{label}</Button>
      <PayModal open={open} onClose={() => setOpen(false)} paymentId={paymentId} amount={amount} />
    </>
  );
}
