"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, Bell, Shield, CreditCard, SlidersHorizontal, Monitor, Smartphone, LogOut, KeyRound, Landmark, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardBody, Field, Input, Select, Button, Badge, Alert } from "@/components/ui";
import { Switch, Modal, useAction, ConfirmModal } from "@/components/ui/interactive";
import { updateAccountAction, updatePreferencesAction, changePasswordAction, setTwoFactorAction, revokeSessionAction, updatePayoutAction } from "@/lib/actions/account";
import { cn, ago } from "@/lib/utils";

type Settings = { notify_email: boolean; notify_bookings: boolean; notify_messages: boolean; notify_payments: boolean; notify_sms: boolean; timezone: string; currency: string; comm_preference: string; two_factor: boolean };
type Session = { id: string; user_agent: string | null; ip: string | null; created_at: string; last_seen: string };

const SECTIONS = [
  { id: "personal", label: "Personal information", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "payout", label: "Payment information", icon: CreditCard, team: true },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
];
const TZ = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"];

function device(ua: string | null) {
  if (!ua) return { name: "Unknown device", mobile: false };
  const mobile = /iPhone|Android|Mobile/i.test(ua);
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : /Firefox/.test(ua) ? "Firefox" : "Browser";
  const os = /Mac OS/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
  return { name: `${browser}${os ? ` on ${os}` : ""}`, mobile };
}

export function SettingsView({ user, settings, sessions, currentSession, payout, isTeam }: {
  user: { full_name: string; email: string; phone: string | null }; settings: Settings; sessions: Session[]; currentSession: string;
  payout?: { method: string | null; last4: string | null }; isTeam: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [acct, setAcct] = React.useState({ full_name: user.full_name, email: user.email, phone: user.phone ?? "" });
  const [acctErr, setAcctErr] = React.useState<Record<string, string>>({});
  const [prefs, setPrefs] = React.useState(settings);
  const [pw, setPw] = React.useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = React.useState<Record<string, string>>({});
  const [twoFA, setTwoFA] = React.useState(false);
  const [signOutAll, setSignOutAll] = React.useState(false);
  const [payoutOpen, setPayoutOpen] = React.useState(false);

  const savePref = (patch: Partial<Settings>) => { setPrefs((p) => ({ ...p, ...patch })); run(() => updatePreferencesAction(patch as never), { success: "Saved" }); };
  const strength = Math.min(4, [pw.next.length >= 8, /[A-Z]/.test(pw.next), /[0-9]/.test(pw.next), /[^A-Za-z0-9]/.test(pw.next)].filter(Boolean).length);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="lg:sticky lg:top-24 lg:self-start" aria-label="Settings sections">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.filter((s) => !s.team || isTeam).map((s) => (
            <li key={s.id}><a href={`#${s.id}`} className="flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-midnight-600 hover:bg-white hover:text-ink"><s.icon className="size-4" />{s.label}</a></li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6">
        <Card id="personal" className="scroll-mt-24">
          <CardHeader title="Personal information" subtitle="Used for your account and wedding communication" />
          <CardBody>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await updateAccountAction(acct); setAcctErr(r.fieldErrors ?? {}); return r; }, { onSuccess: () => router.refresh() }); }}>
              <Field label="Full name" error={acctErr.full_name}><Input value={acct.full_name} onChange={(e) => setAcct({ ...acct, full_name: e.target.value })} aria-invalid={!!acctErr.full_name} /></Field>
              <Field label="Phone" error={acctErr.phone}><Input type="tel" value={acct.phone} onChange={(e) => setAcct({ ...acct, phone: e.target.value })} /></Field>
              <Field label="Email" error={acctErr.email} className="sm:col-span-2" hint="We'll send booking and payment receipts here."><Input type="email" value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} aria-invalid={!!acctErr.email} /></Field>
              <div className="sm:col-span-2"><Button type="submit" loading={pending}>Save changes</Button></div>
            </form>
          </CardBody>
        </Card>

        <Card id="notifications" className="scroll-mt-24">
          <CardHeader title="Notifications" subtitle="Choose what we tell you about. In-app notifications are always on." />
          <CardBody className="divide-y divide-line">
            {[
              ["notify_email", "Email notifications", "Send a copy of important notifications to your inbox"],
              ["notify_bookings", isTeam ? "Booking & opportunity alerts" : "Booking updates", isTeam ? "New open weddings, assignment changes and approvals" : "Changes to your booking, team and timeline"],
              ["notify_messages", "Message notifications", "When someone replies to a conversation"],
              ["notify_payments", "Payment notifications", isTeam ? "Payout requested, processing and paid" : "Receipts, upcoming balances and reminders"],
              ["notify_sms", "Text message alerts", "Wedding-week reminders by SMS"],
            ].map(([k, l, d]) => (
              <div key={k} className="py-3.5 first:pt-0 last:pb-0"><Switch checked={!!prefs[k as keyof Settings]} onChange={(v) => savePref({ [k]: v } as Partial<Settings>)} label={l} description={d} /></div>
            ))}
          </CardBody>
        </Card>

        <Card id="security" className="scroll-mt-24">
          <CardHeader title="Security" />
          <CardBody className="space-y-8">
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await changePasswordAction(pw.current, pw.next, pw.confirm); setPwErr(r.fieldErrors ?? {}); return r; }, { onSuccess: () => { setPw({ current: "", next: "", confirm: "" }); router.refresh(); } }); }}>
              <p className="flex items-center gap-2 font-medium text-ink sm:col-span-3"><KeyRound className="size-4" />Change password</p>
              <Field label="Current password" error={pwErr.current}><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} aria-invalid={!!pwErr.current} /></Field>
              <Field label="New password" error={pwErr.next}>
                <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} aria-invalid={!!pwErr.next} />
                {pw.next && <div className="mt-2 flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i < strength ? (strength >= 3 ? "bg-success-500" : "bg-warning-500") : "bg-midnight-100")} />)}</div>}
              </Field>
              <Field label="Confirm new password" error={pwErr.confirm}><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} aria-invalid={!!pwErr.confirm} /></Field>
              <div className="sm:col-span-3"><Button type="submit" variant="outline" loading={pending} disabled={!pw.current || !pw.next}>Update password</Button></div>
            </form>

            <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
              <Shield className="size-5 text-midnight-500" />
              <div className="flex-1"><p className="font-medium text-ink">Two-factor authentication {prefs.two_factor && <Badge tone="success">On</Badge>}</p><p className="text-[13px] text-muted">Add a one-time code from an authenticator app when you sign in.</p></div>
              <Button variant={prefs.two_factor ? "outline" : "primary"} size="sm" onClick={() => prefs.two_factor ? run(() => setTwoFactorAction(false), { onSuccess: () => setPrefs((p) => ({ ...p, two_factor: false })) }) : setTwoFA(true)}>{prefs.two_factor ? "Turn off" : "Set up"}</Button>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between"><p className="font-medium text-ink">Login sessions</p>{sessions.length > 1 && <Button variant="ghost" size="sm" icon={LogOut} onClick={() => setSignOutAll(true)}>Sign out other devices</Button>}</div>
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {sessions.map((s) => {
                  const d = device(s.user_agent);
                  const me = s.id === currentSession;
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-canvas text-midnight-500">{d.mobile ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}</span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{d.name} {me && <Badge tone="success">This device</Badge>}</p><p className="text-[12px] text-muted">{s.ip ?? "Unknown location"} · active <span suppressHydrationWarning>{ago(s.last_seen)}</span></p></div>
                      {!me && <Button variant="ghost" size="sm" onClick={() => run(() => revokeSessionAction(s.id), { onSuccess: () => router.refresh() })}>Sign out</Button>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardBody>
        </Card>

        {isTeam && payout && (
          <Card id="payout" className="scroll-mt-24">
            <CardHeader title="Payment information" subtitle="Where we send your payouts" action={<Button size="sm" variant="outline" onClick={() => setPayoutOpen(true)}>{payout.last4 ? "Change" : "Add payout method"}</Button>} />
            <CardBody>
              <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-midnight-800 to-midnight-950 p-5 text-white">
                <Landmark className="size-6 text-blush-300" />
                <div className="flex-1"><p className="text-[12px] text-white/60">Payout method</p><p className="font-semibold">{payout.method ?? "Not set"}{payout.last4 ? ` ···· ${payout.last4}` : ""}</p></div>
                {payout.last4 && <Badge tone="success"><CheckCircle2 className="size-3" />Verified</Badge>}
              </div>
              <p className="mt-3 text-[12px] text-muted">Payouts run every Friday. Full account numbers are held by our payment processor — we only store the last four digits.</p>
            </CardBody>
          </Card>
        )}

        <Card id="preferences" className="scroll-mt-24">
          <CardHeader title="Preferences" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Field label="Timezone"><Select value={prefs.timezone} onChange={(e) => savePref({ timezone: e.target.value })}>{TZ.map((t) => <option key={t} value={t}>{t.replace("America/", "").replace("_", " ")} ({t})</option>)}</Select></Field>
            <Field label="Currency"><Select value={prefs.currency} onChange={(e) => savePref({ currency: e.target.value })}><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option></Select></Field>
            <Field label="Preferred contact"><Select value={prefs.comm_preference} onChange={(e) => savePref({ comm_preference: e.target.value })}><option value="email">Email</option><option value="sms">Text message</option><option value="in_app">In-app only</option></Select></Field>
          </CardBody>
        </Card>
      </div>

      <TwoFactorModal open={twoFA} onClose={() => setTwoFA(false)} onDone={() => { setTwoFA(false); setPrefs((p) => ({ ...p, two_factor: true })); }} />
      <ConfirmModal open={signOutAll} onClose={() => setSignOutAll(false)} title="Sign out of other devices?" description="You'll stay signed in here." confirmLabel="Sign out others" loading={pending}
        onConfirm={() => run(() => revokeSessionAction("others"), { onSuccess: () => { setSignOutAll(false); router.refresh(); } })} />
      {isTeam && <PayoutModal open={payoutOpen} onClose={() => setPayoutOpen(false)} onDone={() => { setPayoutOpen(false); router.refresh(); }} current={payout?.method ?? "Direct deposit"} />}
    </div>
  );
}

function TwoFactorModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { run, pending } = useAction();
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState("");
  React.useEffect(() => { if (open) { setCode(""); setErr(""); } }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Set up two-factor authentication" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={pending} onClick={() => { if (!/^\d{6}$/.test(code)) { setErr("Enter the 6-digit code"); return; } run(() => setTwoFactorAction(true), { onSuccess: onDone }); }}>Verify & enable</Button></>}>
      <div className="space-y-4 text-sm">
        <Alert tone="info">Preview: authenticator enrollment is mocked in this build. Any 6-digit code will verify.</Alert>
        <ol className="list-decimal space-y-1 pl-5 text-midnight-700"><li>Open your authenticator app (1Password, Google Authenticator…)</li><li>Scan the code below</li><li>Enter the 6-digit code it shows</li></ol>
        <div className="mx-auto grid size-40 grid-cols-8 gap-0.5 rounded-xl bg-white p-3 ring-1 ring-line" aria-label="QR code placeholder">
          {Array.from({ length: 64 }, (_, i) => <span key={i} className={((i * 37) % 7) % 2 || [0, 1, 8, 9, 6, 7, 14, 15, 48, 49, 56, 57].includes(i) ? "bg-midnight-900" : "bg-white"} />)}
        </div>
        <Field label="Verification code" error={err}><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="text-center text-lg tracking-[0.4em]" /></Field>
      </div>
    </Modal>
  );
}

function PayoutModal({ open, onClose, onDone, current }: { open: boolean; onClose: () => void; onDone: () => void; current: string }) {
  const { run, pending } = useAction();
  const [f, setF] = React.useState({ method: current, holder: "", routing: "", account: "" });
  const [err, setErr] = React.useState<Record<string, string>>({});
  return (
    <Modal open={open} onClose={onClose} title="Payout details" description="Securely handled by our payment processor."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={pending} onClick={() => run(async () => { const r = await updatePayoutAction(f); setErr(r.fieldErrors ?? {}); return r; }, { onSuccess: onDone })}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Method" error={err.method}><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option>Direct deposit</option><option>PayPal</option><option>Check</option></Select></Field>
        {f.method === "Direct deposit" && (
          <>
            <Field label="Account holder name" error={err.holder}><Input value={f.holder} onChange={(e) => setF({ ...f, holder: e.target.value })} autoComplete="name" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Routing number" error={err.routing}><Input inputMode="numeric" maxLength={9} value={f.routing} onChange={(e) => setF({ ...f, routing: e.target.value.replace(/\D/g, "") })} /></Field>
              <Field label="Account number" error={err.account}><Input inputMode="numeric" value={f.account} onChange={(e) => setF({ ...f, account: e.target.value.replace(/\D/g, "") })} /></Field>
            </div>
          </>
        )}
        {f.method === "PayPal" && <Field label="PayPal email" error={err.account}><Input type="email" value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })} /></Field>}
        {f.method === "Check" && <Alert tone="info">Checks are mailed to the address on your W-9 and can take 5–7 business days.</Alert>}
      </div>
    </Modal>
  );
}
