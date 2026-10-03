"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, CreditCard, XCircle, CheckCircle2 } from "lucide-react";
import { Button, Field, Input, Alert } from "@/components/ui";
import { Modal } from "@/components/ui/interactive";
import { payBalanceAction } from "@/lib/actions/client";
import { money } from "@/lib/pricing";

export function PayModal({ open, onClose, paymentId, amount, title }: { open: boolean; onClose: () => void; paymentId: string | "all"; amount: number; title?: string }) {
  const router = useRouter();
  const [card, setCard] = React.useState({ name: "", number: "", exp: "", cvc: "", zip: "" });
  const [err, setErr] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  React.useEffect(() => { if (open) { setErr({}); setMsg(""); setDone(false); } }, [open]);
  const fmtNum = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  const fmtExp = (v: string) => { const x = v.replace(/\D/g, "").slice(0, 4); return x.length > 2 ? `${x.slice(0, 2)}/${x.slice(2)}` : x; };
  const pay = async () => {
    const e: Record<string, string> = {};
    if (card.name.trim().length < 2) e.name = "Required";
    if (card.number.replace(/\D/g, "").length < 13) e.number = "Enter your card number";
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) e.exp = "MM/YY";
    if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = "3–4 digits";
    if (!/^\d{5}$/.test(card.zip)) e.zip = "5 digits";
    setErr(e); setMsg("");
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await payBalanceAction(paymentId, card);
    setBusy(false);
    if (!r.ok) { setMsg(r.message ?? "Payment failed"); return; }
    setDone(true);
    router.refresh();
  };
  return (
    <Modal open={open} onClose={onClose} title={done ? undefined : title ?? "Make a payment"} description={done ? undefined : `Amount due: ${money(amount)}`}
      icon={done ? undefined : <span className="grid size-11 place-items-center rounded-full bg-midnight-50 text-midnight-700"><CreditCard className="size-5" /></span>}
      footer={done ? <Button onClick={onClose}>Done</Button> : <><Button variant="outline" onClick={onClose}>Cancel</Button><Button icon={Lock} loading={busy} onClick={pay}>Pay {money(amount)}</Button></>}>
      {done ? (
        <div className="py-6 text-center"><CheckCircle2 className="mx-auto size-14 text-success-500 animate-pop-in" /><p className="mt-4 text-xl font-semibold text-ink">Payment received</p><p className="mt-1 text-sm text-muted">A receipt for {money(amount)} is in your payment history.</p></div>
      ) : (
        <div className="space-y-4">
          {msg && <Alert tone="danger" icon={XCircle}>{msg}</Alert>}
          <Field label="Name on card" error={err.name}><Input value={card.name} autoComplete="cc-name" onChange={(e) => setCard({ ...card, name: e.target.value })} /></Field>
          <Field label="Card number" error={err.number}><Input inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card.number} onChange={(e) => setCard({ ...card, number: fmtNum(e.target.value) })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Expiry" error={err.exp}><Input placeholder="MM/YY" inputMode="numeric" value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} /></Field>
            <Field label="CVC" error={err.cvc}><Input inputMode="numeric" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })} /></Field>
            <Field label="ZIP" error={err.zip}><Input inputMode="numeric" maxLength={5} value={card.zip} onChange={(e) => setCard({ ...card, zip: e.target.value.replace(/\D/g, "") })} /></Field>
          </div>
          <p className="rounded-xl bg-info-50 p-3 text-[12px] text-midnight-700"><b>Test mode:</b> <button type="button" className="font-mono underline" onClick={() => setCard({ name: card.name || "Test Couple", number: "4242 4242 4242 4242", exp: "12/30", cvc: "123", zip: "28202" })}>use 4242 4242 4242 4242</button> · 4000 0000 0000 0002 declines.</p>
        </div>
      )}
    </Modal>
  );
}
