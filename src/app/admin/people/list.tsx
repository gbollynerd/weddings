"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserCheck, UserX, Ban, RotateCcw, KeyRound, Shuffle, ExternalLink, ShieldCheck, ShieldAlert, Camera, Video, Copy, Users, MoreHorizontal, Star, AlertTriangle, AtSign as Instagram,
} from "lucide-react";
import { Card, Button, Badge, StatusBadge, Avatar, EmptyState, Field, Textarea, Select, Alert, DescList } from "@/components/ui";
import { Modal, Menu, MenuItem, useAction, useToast } from "@/components/ui/interactive";
import { approveApplicantAction, rejectApplicantAction, suspendUserAction, reactivateUserAction, changeRoleAction, resetPasswordAction } from "@/lib/actions/people";
import { fmtDate, ago, cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = Record<string, any>;
type Tab = "applicants" | "team" | "clients" | "staff";
const ROLE: Record<string, string> = { photographer: "Photographer", videographer: "Videographer", coordinator: "Coordinator", admin: "Administrator", client: "Client" };
const DOC: Record<string, string> = { drivers_license: "Driver's license", insurance: "Liability insurance", w9: "W-9", business_license: "Business license", other: "Other" };

export function PeopleList({ tab, rows, me }: { tab: Tab; rows: P[]; me: { id: string; role: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useAction();
  const [view, setView] = React.useState<P | null>(null);
  const [dlg, setDlg] = React.useState<{ kind: "reject" | "suspend" | "role"; p: P } | null>(null);
  const [text, setText] = React.useState("");
  const [role, setRole] = React.useState("");
  const [temp, setTemp] = React.useState<{ name: string; email: string; password: string } | null>(null);
  const done = () => { setDlg(null); setView(null); router.refresh(); };
  const canManage = (p: P) => p.user_id !== me.id && (me.role === "admin" || !["coordinator", "admin"].includes(p.role));
  const open = (kind: "reject" | "suspend" | "role", p: P) => { setText(""); setRole(kind === "role" ? roleOptions(p, me)[0] ?? "" : ""); setDlg({ kind, p }); };
  const reset = (p: P) => run(async () => {
    const r = await resetPasswordAction(p.user_id);
    if (r.ok && r.data) setTemp({ name: p.full_name, email: p.email, password: r.data.temp });
    return r;
  });

  if (!rows.length)
    return <Card><EmptyState icon={Users} title={tab === "applicants" ? "No applications waiting" : "Nobody here yet"} description={tab === "applicants" ? "New photographer and videographer applications from /join show up here." : undefined} /></Card>;

  return (
    <>
      <div className={cn("grid gap-4", tab === "applicants" ? "lg:grid-cols-2" : "")}>
        {tab === "applicants" ? rows.map((p) => (
          <Card key={p.user_id} className="p-5">
            <div className="flex items-start gap-3">
              <Avatar name={p.full_name} src={p.avatar_url} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{p.full_name}</p>
                <p className="truncate text-[13px] text-muted">{p.email} · {p.phone}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={p.discipline === "photo" ? "blush" : "info"}>{p.discipline === "photo" ? <Camera className="size-3" /> : <Video className="size-3" />}{p.discipline === "photo" ? "Photographer" : "Videographer"}</Badge>
                  <Badge>{p.years_experience} yrs</Badge>{p.city && <Badge>{p.city}, {p.state}</Badge>}
                  <DocsBadge p={p} />
                </div>
              </div>
              <span className="shrink-0 text-[12px] text-muted">{p.applied_at ? ago(p.applied_at) : ""}</span>
            </div>
            {p.bio && <p className="mt-3 line-clamp-3 text-[13px] text-midnight-700">{p.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
              {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-midnight-700 hover:underline"><ExternalLink className="size-3.5" />Portfolio</a>}
              {p.instagram && <span className="inline-flex items-center gap-1 text-muted"><Instagram className="size-3.5" />{p.instagram}</span>}
              <button className="font-medium text-midnight-700 hover:underline" onClick={() => setView(p)}>Full application</button>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" icon={UserCheck} loading={pending} onClick={() => run(() => approveApplicantAction(p.user_id), { onSuccess: () => router.refresh() })}>Approve</Button>
              <Button size="sm" variant="outline" icon={UserX} onClick={() => open("reject", p)}>Decline</Button>
            </div>
          </Card>
        )) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {rows.map((p) => (
                <li key={p.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:flex-nowrap">
                  <Avatar name={p.full_name} src={p.avatar_url} size={40} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setView(p)}>
                    <p className="truncate font-medium text-ink hover:underline">{p.full_name}{p.user_id === me.id && <span className="text-muted"> (you)</span>}</p>
                    <p className="truncate text-[13px] text-muted">{p.email}{tab === "team" && p.city ? ` · ${p.city}, ${p.state}` : ""}{tab === "clients" && p.next_wedding ? ` · wedding ${fmtDate(p.next_wedding)}` : ""}</p>
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge>{ROLE[p.role]}</Badge>
                    {p.account_status === "suspended" ? <StatusBadge status="suspended" /> : tab === "team" && p.member_status !== "active" ? <StatusBadge status={p.member_status} /> : null}
                    {tab === "team" && <DocsBadge p={p} />}
                    {tab === "team" && p.late_cancels > 0 && <Badge tone="danger">{p.late_cancels} late cancel{p.late_cancels > 1 ? "s" : ""}</Badge>}
                    {tab === "team" && <span className="text-[12px] text-muted">{p.upcoming} upcoming</span>}
                    <span className="hidden text-[12px] text-muted md:inline">{p.last_seen ? `Active ${ago(p.last_seen)}` : "Never signed in"}</span>
                  </div>
                  {canManage(p) && <PersonMenu p={p} me={me} onSuspend={() => open("suspend", p)} onRole={() => open("role", p)} onReset={() => reset(p)}
                    onReactivate={() => run(() => reactivateUserAction(p.user_id), { onSuccess: () => router.refresh() })} />}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Person details */}
      <Modal open={!!view} onClose={() => setView(null)} size="lg" title={view?.full_name} description={view ? `${ROLE[view.role]} · joined ${fmtDate(view.created_at)}` : ""}
        icon={view ? <Avatar name={view.full_name} src={view.avatar_url} size={44} /> : undefined}
        footer={view && canManage(view) ? <div className="flex w-full flex-wrap justify-end gap-2">
          {view.member_status === "applicant" && <><Button variant="outline" icon={UserX} onClick={() => open("reject", view)}>Decline</Button><Button icon={UserCheck} loading={pending} onClick={() => run(() => approveApplicantAction(view.user_id), { onSuccess: done })}>Approve</Button></>}
          {view.member_status === "rejected" && <Button variant="outline" icon={UserCheck} loading={pending} onClick={() => run(() => approveApplicantAction(view.user_id), { onSuccess: done })}>Approve after all</Button>}
          {view.member_status !== "applicant" && <Button variant="outline" icon={KeyRound} onClick={() => reset(view)}>Reset password</Button>}
          {view.member_status !== "applicant" && (view.account_status === "suspended"
            ? <Button icon={RotateCcw} loading={pending} onClick={() => run(() => reactivateUserAction(view.user_id), { onSuccess: done })}>Reactivate</Button>
            : <Button variant="danger" icon={Ban} onClick={() => open("suspend", view)}>Suspend</Button>)}
        </div> : <Button variant="outline" onClick={() => setView(null)}>Close</Button>}>
        {view && <PersonDetail p={view} />}
      </Modal>

      {/* Decline application / suspend / change role */}
      <Modal open={!!dlg} onClose={() => setDlg(null)} size="sm"
        title={dlg?.kind === "reject" ? "Decline application" : dlg?.kind === "suspend" ? "Suspend account" : "Change role"}
        description={dlg?.p.full_name}
        footer={<><Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button>
          <Button variant={dlg?.kind === "role" ? "primary" : "danger"} loading={pending} onClick={() => {
            if (!dlg) return;
            const id = dlg.p.user_id;
            if (dlg.kind === "reject") run(() => rejectApplicantAction(id, text), { onSuccess: done });
            else if (dlg.kind === "suspend") run(() => suspendUserAction(id, text), { onSuccess: done });
            else run(() => changeRoleAction(id, role), { onSuccess: done });
          }}>{dlg?.kind === "reject" ? "Decline" : dlg?.kind === "suspend" ? "Suspend" : "Change role"}</Button></>}>
        {dlg?.kind === "role" ? (
          roleOptions(dlg.p, me).length ? (
            <div className="space-y-3 text-sm">
              <Field label="New role"><Select value={role} onChange={(e) => setRole(e.target.value)}>{roleOptions(dlg.p, me).map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}</Select></Field>
              <p className="text-muted">They&apos;ll be signed out and see the new role next time they log in.{["photographer", "videographer"].includes(dlg.p.role) ? " Their upcoming weddings must be reassigned first." : ""}</p>
            </div>
          ) : <p className="text-sm text-muted">There&apos;s no other role this account can move to.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {dlg?.kind === "suspend" && <Alert tone="warning" icon={AlertTriangle}>They&apos;re signed out everywhere and can&apos;t log in. Pending requests and offers go back to Open Weddings; confirmed weddings stay assigned so you can replace them.</Alert>}
            <Field label={dlg?.kind === "reject" ? "Message to the applicant" : "Reason (internal)"} required>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={dlg?.kind === "reject" ? "e.g. We're looking for more lead experience right now — please reapply next season." : "e.g. Repeated no-shows"} />
            </Field>
          </div>
        )}
      </Modal>

      {/* Temporary password (shown once) */}
      <Modal open={!!temp} onClose={() => setTemp(null)} size="sm" title="Temporary password" description={temp ? `${temp.name} · ${temp.email}` : ""}
        footer={<Button onClick={() => setTemp(null)}>Done</Button>}>
        {temp && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-2xl bg-canvas p-3">
              <code className="flex-1 select-all text-lg font-semibold tracking-wider text-ink" data-testid="temp-password">{temp.password}</code>
              <Button size="sm" variant="outline" icon={Copy} onClick={() => { navigator.clipboard?.writeText(temp.password).then(() => toast({ tone: "success", title: "Copied" }), () => {}); }}>Copy</Button>
            </div>
            <p className="text-muted">Share it privately (by phone or text, not email). It won&apos;t be shown again. They&apos;ve been signed out and should change it in Settings after logging in.</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function roleOptions(p: P, me: { role: string }) {
  if (["photographer", "videographer"].includes(p.role)) return ["photographer", "videographer"].filter((r) => r !== p.role);
  if (["coordinator", "admin"].includes(p.role) && me.role === "admin") return ["coordinator", "admin"].filter((r) => r !== p.role);
  return [];
}

function DocsBadge({ p }: { p: P }) {
  if (p.docs_required == null) return null;
  return p.docs_verified >= p.docs_required ? <Badge tone="success"><ShieldCheck className="size-3" />Docs verified</Badge>
    : <Badge tone="warning"><ShieldAlert className="size-3" />Docs {p.docs_verified}/{p.docs_required}{p.docs_pending ? ` · ${p.docs_pending} to review` : ""}</Badge>;
}

function PersonMenu({ p, me, onSuspend, onReactivate, onRole, onReset }: { p: P; me: { role: string }; onSuspend: () => void; onReactivate: () => void; onRole: () => void; onReset: () => void }) {
  return (
    <Menu trigger={({ toggle }) => <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Manage ${p.full_name}`}><MoreHorizontal className="size-5" /></Button>}>
      {(close) => (
        <>
          {roleOptions(p, me).length > 0 && <MenuItem icon={Shuffle} onClick={() => { close(); onRole(); }}>Change role</MenuItem>}
          <MenuItem icon={KeyRound} onClick={() => { close(); onReset(); }}>Reset password</MenuItem>
          {p.account_status === "suspended" ? <MenuItem icon={RotateCcw} onClick={() => { close(); onReactivate(); }}>Reactivate</MenuItem>
            : <MenuItem icon={Ban} danger onClick={() => { close(); onSuspend(); }}>Suspend</MenuItem>}
        </>
      )}
    </Menu>
  );
}

function PersonDetail({ p }: { p: P }) {
  const docs = (p.docs ?? []) as { doc_type: string; status: string; file_name: string; expires_on: string | null }[];
  return (
    <div className="space-y-5">
      {p.account_status === "suspended" && <Alert tone="danger" icon={Ban} title="Suspended">{p.suspended_reason ?? "No reason recorded."}</Alert>}
      {p.member_status === "rejected" && <Alert tone="warning" title="Application declined">{p.decision_note}{p.decided_by_name ? ` — ${p.decided_by_name}` : ""}</Alert>}
      <DescList cols={2} items={[
        ["Email", p.email], ["Phone", p.phone ?? "—"],
        ["Last active", p.last_seen ? ago(p.last_seen) : "Never signed in"], ["Joined", fmtDate(p.created_at)],
        ...(p.member_id ? [
          ["Home base", p.home_address ?? "—"], ["Market", p.city ? `${p.city}, ${p.state}` : "—"],
          ["Experience", `${p.years_experience} years`], ["Rating", <span key="r" className="inline-flex items-center gap-1"><Star className="size-3.5 fill-blush-400 text-blush-400" />{Number(p.rating).toFixed(1)}</span>],
          ["Weddings", `${p.upcoming} upcoming · ${p.completed} completed`], ["Cancellations", `${p.cancels} total · ${p.late_cancels} within 14 days`],
        ] as [string, React.ReactNode][] : []),
        ...(p.partner_one ? [["Couple", `${p.partner_one} & ${p.partner_two}`], ["Weddings", p.wedding_id ? <Link key="w" href={`/admin/weddings/${p.wedding_id}`} className="font-medium text-midnight-700 hover:underline">{p.weddings} · open</Link> : p.weddings]] as [string, React.ReactNode][] : []),
      ]} />
      {p.member_id && <>
        {p.bio && <div><p className="text-[12px] font-medium uppercase tracking-wide text-muted">About</p><p className="mt-1 text-sm text-midnight-700">{p.bio}</p></div>}
        {p.equipment && <div><p className="text-[12px] font-medium uppercase tracking-wide text-muted">Equipment</p><p className="mt-1 text-sm text-midnight-700">{p.equipment}</p></div>}
        <div className="flex flex-wrap gap-3 text-[13px]">
          {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-midnight-700 hover:underline"><ExternalLink className="size-3.5" />Portfolio</a>}
          {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-midnight-700 hover:underline"><ExternalLink className="size-3.5" />Website</a>}
          {p.instagram && <span className="inline-flex items-center gap-1 text-muted"><Instagram className="size-3.5" />{p.instagram}</span>}
        </div>
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Documents</p>
          {docs.length === 0 ? <p className="mt-1 text-sm text-muted">Nothing uploaded yet.</p> : (
            <ul className="mt-2 space-y-1.5 text-sm">{docs.map((d, i) => <li key={i} className="flex items-center justify-between gap-2"><span className="truncate text-midnight-700">{DOC[d.doc_type]} · {d.file_name}</span><StatusBadge status={d.status} /></li>)}</ul>
          )}
          <p className="mt-2 text-[12px] text-muted">Verify documents from the Operations queue.</p>
        </div>
      </>}
    </div>
  );
}
