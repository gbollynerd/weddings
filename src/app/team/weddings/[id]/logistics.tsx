"use client";
import * as React from "react";
import { Map as MapIcon, MapPin, Navigation, Copy, Check, Share2, MessageSquareText, Mail, Send, Smartphone, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardBody, Button, Field, Input, Textarea } from "@/components/ui";
import { Modal, useToast } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";
import { mapLinks } from "@/lib/maps";

/* ───────────── Maps ───────────── */
function useCopy() {
  const toast = useToast();
  const [copied, setCopied] = React.useState<string | null>(null);
  const copy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({ tone: "success", title: `${label} copied` });
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      toast({ tone: "error", title: "Couldn't copy — select the text and copy it manually" });
    }
  };
  return { copied, copy };
}

export function LocationCard({ venue, address }: { venue: string; address: string }) {
  const links = mapLinks(address);
  const { copied, copy } = useCopy();
  const app = "flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white px-2 py-3 text-[12px] font-medium text-midnight-700 transition hover:border-midnight-200 hover:bg-canvas";
  return (
    <Card className="overflow-hidden">
      <a href={links.view} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[16/9] bg-midnight-50" aria-label={`Open ${venue} in Google Maps`}>
        <iframe title={`Map of ${venue}`} src={links.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="pointer-events-none absolute inset-0 size-full border-0" />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-medium text-ink shadow-sm transition group-hover:bg-white"><ExternalLink className="size-3.5" />Open map</span>
      </a>
      <CardBody className="space-y-4 pt-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blush-50 text-blush-600"><MapPin className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{venue}</p>
            <p className="text-[13px] text-muted">{address}</p>
          </div>
          <button type="button" onClick={() => copy(address, "addr", "Address")} className="-m-1 grid size-9 shrink-0 place-items-center rounded-xl text-midnight-400 hover:bg-canvas hover:text-ink" aria-label="Copy address" title="Copy address">
            {copied === "addr" ? <Check className="size-4 text-success-500" /> : <Copy className="size-4" />}
          </button>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-muted"><Navigation className="size-3.5" />Get directions</p>
          <div className="grid grid-cols-3 gap-2">
            <a href={links.google} target="_blank" rel="noopener noreferrer" className={app}><span className="grid size-7 place-items-center rounded-lg bg-[#e8f0fe] text-[13px] font-bold text-[#1a73e8]">G</span>Google Maps</a>
            <a href={links.apple} target="_blank" rel="noopener noreferrer" className={app}><span className="grid size-7 place-items-center rounded-lg bg-midnight-50 text-ink"><MapIcon className="size-4" /></span>Apple Maps</a>
            <a href={links.waze} target="_blank" rel="noopener noreferrer" className={app}><span className="grid size-7 place-items-center rounded-lg bg-[#e6f7fd] text-[13px] font-bold text-[#05c8f7]">W</span>Waze</a>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ───────────── Share event details ───────────── */
export type ShareInfo = {
  couple: string; dateLong: string; dateShort: string; callTime: string; coverage: string; role: string;
  venue: string; address: string; ceremony?: string | null; reception?: string | null;
  firstEvents: { time: string; title: string }[]; coordinator: string; onCall: string; weddingId: string;
};

function buildText(s: ShareInfo, origin: string) {
  const L = [
    `${s.couple} — wedding`,
    `${s.dateLong}`,
    ``,
    `Call time: ${s.callTime} (${s.coverage})`,
    `Role: ${s.role}`,
    ``,
    `${s.venue}`,
    `${s.address}`,
    s.ceremony ? `Ceremony: ${s.ceremony}` : "",
    s.reception ? `Reception: ${s.reception}` : "",
    `Directions: ${mapLinks(s.address).view}`,
  ];
  if (s.firstEvents.length) { L.push("", "Schedule:"); for (const e of s.firstEvents) L.push(`• ${e.time} — ${e.title}`); }
  L.push("", `Coordinator: ${s.coordinator} · on-call ${s.onCall}`);
  if (origin) L.push(`Full details: ${origin}/team/weddings/${s.weddingId}`);
  return L.filter((l, i, a) => !(l === "" && a[i - 1] === "")).filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n");
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const phoneDigits = (v: string) => v.replace(/[^\d+]/g, "");
const isPhone = (v: string) => phoneDigits(v).replace(/^\+/, "").length >= 7 && /^[\d\s()+.-]+$/.test(v.trim());
const smsHref = (to: string, body: string) => `sms:${phoneDigits(to)}?&body=${encodeURIComponent(body)}`;
const mailHref = (to: string, subject: string, body: string) => `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export function ShareDetails({ info, me, className }: { info: ShareInfo; me: { email: string; phone: string | null }; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [to, setTo] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [canShare, setCanShare] = React.useState(false);
  const { copied, copy } = useCopy();
  const toast = useToast();
  const subject = `Wedding details — ${info.couple}, ${info.dateShort}`;

  const openModal = () => {
    setText(buildText(info, window.location.origin));
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setTo(""); setErr(null); setOpen(true);
  };
  const go = (href: string, what: string) => {
    window.location.href = href;
    toast({ tone: "success", title: `Opening ${what}…`, body: "Review the message there and tap send." });
  };
  const sendToOther = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = to.trim();
    if (!v) return setErr("Enter a phone number or email address.");
    if (isEmail(v)) { setErr(null); return go(mailHref(v, subject, text), "your email app"); }
    if (isPhone(v)) { setErr(null); return go(smsHref(v, text), "Messages"); }
    setErr("That doesn't look like a phone number or email address.");
  };
  const nativeShare = async () => {
    try { await navigator.share({ title: subject, text }); } catch { /* user cancelled */ }
  };
  const target = to.trim() ? (isEmail(to) ? "email" : isPhone(to) ? "text" : null) : null;

  return (
    <>
      <Button variant="outline" icon={Share2} onClick={openModal} className={className}>Share details</Button>
      <Modal open={open} onClose={() => setOpen(false)} size="md" icon={<Share2 className="size-5" />} title="Share event details"
        description="Send the essentials — date, call time, venue, directions and schedule — to your phone, your email or someone helping you on the day."
        footer={<>
          <Button variant="outline" icon={copied === "text" ? Check : Copy} onClick={() => copy(text, "text", "Details")}>{copied === "text" ? "Copied" : "Copy text"}</Button>
          {canShare && <Button variant="outline" icon={Share2} onClick={nativeShare}>More options…</Button>}
          <Button onClick={() => setOpen(false)}>Done</Button>
        </>}>
        <div className="space-y-5">
          <Field label="Message" hint="Edit anything before sending. Client contact details are never included.">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[220px] font-mono text-[12.5px] leading-relaxed" aria-label="Message to share" />
          </Field>

          <div>
            <p className="mb-2 text-[13px] font-medium text-midnight-700">Send to yourself</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <a href={me.phone ? smsHref(me.phone, text) : undefined} aria-disabled={!me.phone}
                onClick={(e) => { if (!me.phone) { e.preventDefault(); toast({ tone: "error", title: "Add your phone number in Settings first" }); } }}
                className={cn("flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-midnight-200 hover:bg-canvas", !me.phone && "opacity-60")}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-50 text-success-700"><MessageSquareText className="size-4" /></span>
                <span className="min-w-0"><span className="block text-sm font-medium text-ink">Text me</span><span className="block truncate text-[12px] text-muted">{me.phone ?? "No phone on file"}</span></span>
              </a>
              <a href={mailHref(me.email, subject, text)} className="flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-midnight-200 hover:bg-canvas">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-50 text-info-500"><Mail className="size-4" /></span>
                <span className="min-w-0"><span className="block text-sm font-medium text-ink">Email me</span><span className="block truncate text-[12px] text-muted">{me.email}</span></span>
              </a>
            </div>
          </div>

          <form onSubmit={sendToOther}>
            <p className="mb-2 text-[13px] font-medium text-midnight-700">Send to someone else</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-midnight-300">{target === "email" ? <Mail className="size-4" /> : <Smartphone className="size-4" />}</span>
                <Input value={to} onChange={(e) => { setTo(e.target.value); setErr(null); }} placeholder="Phone number or email" inputMode="email" autoComplete="off" aria-label="Recipient phone number or email" aria-invalid={!!err} className="pl-10" />
              </div>
              <Button type="submit" icon={Send}>{target === "email" ? "Email" : target === "text" ? "Text" : "Send"}</Button>
            </div>
            {err ? <p className="mt-1.5 text-[12px] text-danger-500">{err}</p> : <p className="mt-1.5 text-[12px] text-muted">Opens Messages or your email app with everything filled in — nothing is sent until you tap send there.</p>}
          </form>
        </div>
      </Modal>
    </>
  );
}
