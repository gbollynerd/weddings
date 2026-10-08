"use client";

import * as React from "react";
import { SKILLS, skillsLine, type Skill } from "@/lib/skills";
import { useRouter } from "next/navigation";
import { Camera, X, Plus, MapPin, Star, Globe, AtSign, Link2, CheckCircle2, Circle, Video, Languages, Award, Smartphone } from "lucide-react";
import { Card, CardHeader, CardBody, Field, Input, Textarea, Select, Button, Avatar, Progress, Badge } from "@/components/ui";
import { useAction, useToast } from "@/components/ui/interactive";
import { updateProfileAction } from "@/lib/actions/team";
import { AddressInput } from "@/components/ui/address-input";
import { cn } from "@/lib/utils";

type M = { full_name: string; email: string; phone: string; bio: string; home_market_id: string; service_radius: number; specialties: string[]; years_experience: number; languages: string[]; portfolio_url: string; instagram: string; website: string; avatar_url: string; skills: Skill[]; city: string; home_address: string; equipment: string; home_located: boolean };
const SPECIALTY_SUGGESTIONS: Record<string, string[]> = { content: ["Vertical reels", "Same-day teasers", "Behind the scenes", "iPhone cinematic", "TikTok trends", "Guest moments"], photo: ["Documentary", "Editorial", "Fine art", "Film photography", "Flash at night", "Family formals", "Cultural ceremonies", "Elopements"], video: ["Cinematic films", "Documentary", "Drone (Part 107)", "Audio", "Social teasers", "Multi-cam ceremonies", "Super 8"] };

async function resizeImage(file: File, size = 320): Promise<string> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const s = Math.min(bmp.width, bmp.height);
  c.width = c.height = size;
  c.getContext("2d")!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL("image/jpeg", 0.85);
}

function TagInput({ value, onChange, suggestions, placeholder, max = 8 }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder: string; max?: number }) {
  const [draft, setDraft] = React.useState("");
  const add = (t: string) => { const v = t.trim(); if (v && !value.includes(v) && value.length < max) onChange([...value, v]); setDraft(""); };
  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 focus-within:border-midnight-300 focus-within:ring-4 focus-within:ring-midnight-50">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-midnight-50 px-2 py-1 text-[13px] text-midnight-700">{t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="-my-1.5 -mr-2 grid size-7 place-items-center rounded-full text-midnight-400 hover:bg-danger-50 hover:text-danger-500"><X className="size-3.5" /></button>
          </span>
        ))}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={value.length ? "" : placeholder}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)); }}
          className="min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.filter((s) => !value.includes(s)).slice(0, 6).map((s) => (
          <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-midnight-200 px-2.5 py-0.5 text-[12px] text-midnight-500 hover:border-midnight-400 hover:text-ink"><Plus className="size-3" />{s}</button>
        ))}
      </div>
    </div>
  );
}

export function ProfileForm({ member, completion, markets, stats }: { member: M; completion: { percent: number; missing: string[] }; markets: { id: string; label: string }[]; stats: { done: number; upcoming: number; rating: number } }) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useAction();
  const [f, setF] = React.useState(member);
  const [err, setErr] = React.useState<Record<string, string>>({});
  const [dirty, setDirty] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = <K extends keyof M>(k: K, v: M[K]) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const market = markets.find((m) => m.id === f.home_market_id)?.label ?? member.city;

  const save = () => run(async () => {
    const { home_located: _ignored, ...rest } = f;
    const r = await updateProfileAction({ ...rest, avatar_url: f.avatar_url !== member.avatar_url ? f.avatar_url : undefined });
    setErr(r.fieldErrors ?? {});
    return r;
  }, { onSuccess: () => { setDirty(false); router.refresh(); } });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <CardBody className="flex flex-col items-start gap-5 pt-6 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar name={f.full_name} src={f.avatar_url || null} size={104} />
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-midnight-900 text-white ring-4 ring-white hover:bg-midnight-700" aria-label="Change profile photo"><Camera className="size-4" /></button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]; e.target.value = "";
                if (!file) return;
                if (!file.type.startsWith("image/")) return toast({ tone: "error", title: "Choose an image file" });
                try { set("avatar_url", await resizeImage(file)); } catch { toast({ tone: "error", title: "We couldn't read that image" }); }
              }} />
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold text-ink">{f.full_name}</p>
              <p className="text-sm text-muted">{skillsLine(f.skills)} · {market || "Set your home market"}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px]"><Badge tone="success"><Star className="size-3" />{stats.rating.toFixed(1)} rating</Badge><Badge>{stats.done} weddings delivered</Badge><Badge tone="blush">{stats.upcoming} upcoming</Badge></div>
            </div>
            {f.avatar_url && <Button variant="ghost" size="sm" onClick={() => set("avatar_url", "")}>Remove photo</Button>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="About you" subtitle="A short version is shared with couples on their booking page." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={err.full_name} required><Input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} aria-invalid={!!err.full_name} /></Field>
            <Field label="Phone" error={err.phone}><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email" hint="Change your email in Settings." className="sm:col-span-2"><Input value={f.email} disabled /></Field>
            <Field label="Bio" error={err.bio} hint={`${f.bio.length}/600`} className="sm:col-span-2"><Textarea value={f.bio} maxLength={600} onChange={(e) => set("bio", e.target.value)} className="min-h-[120px]" placeholder="Your approach, what you love about weddings, and what couples can expect." /></Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="What you do" subtitle="Pick every kind of work you take on. You'll see and can request jobs for each one — one role per wedding." />
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Skills">
              {SKILLS.map((s) => {
                const on = f.skills.includes(s.value);
                const Icon = s.value === "photo" ? Camera : s.value === "video" ? Video : Smartphone;
                return (
                  <label key={s.value} className={cn("flex cursor-pointer items-center gap-2.5 rounded-2xl border p-3 text-sm font-medium transition", on ? "border-midnight-900 bg-midnight-50/60 ring-2 ring-midnight-900" : "border-line hover:border-midnight-200")}>
                    <input type="checkbox" className="size-4 accent-midnight-900" checked={on}
                      onChange={() => set("skills", on ? f.skills.filter((x) => x !== s.value) : [...f.skills, s.value])} />
                    <Icon className="size-4 text-midnight-500" />{s.person}
                  </label>
                );
              })}
            </div>
            {err.skills && <p className="mt-2 text-[12px] font-medium text-danger-500" role="alert">{err.skills}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Work details" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Home base address" className="sm:col-span-2" error={err.home_address} htmlFor="pf-home">
              <AddressInput id="pf-home" value={f.home_address} onChange={(v) => set("home_address", v)} initialValue={member.home_address}
                hint={member.home_located && f.home_address === member.home_address ? "Distances to weddings are measured from here (straight line). Never shown to couples." : "Used to measure how far each wedding is from you. Never shown to couples."}
                placeholder="Street address you travel from" />
            </Field>
            <Field label="Home market" error={err.home_market_id}><Select value={f.home_market_id} onChange={(e) => set("home_market_id", e.target.value)}><option value="">Select…</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</Select></Field>
            <Field label={`Service area — ${f.service_radius} miles`} error={err.service_radius}>
              <input type="range" min={10} max={300} step={10} value={f.service_radius} onChange={(e) => set("service_radius", Number(e.target.value))} className="mt-3 w-full accent-midnight-900" aria-label="Service radius in miles" />
            </Field>
            <Field label="Specialization" className="sm:col-span-2"><TagInput value={f.specialties} onChange={(v) => set("specialties", v)} suggestions={f.skills.flatMap((s) => SPECIALTY_SUGGESTIONS[s] ?? [])} placeholder="Type and press Enter" /></Field>
            <Field label="Years of experience" error={err.years_experience}><Input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => set("years_experience", Number(e.target.value))} /></Field>
            <Field label="Main equipment" className="sm:col-span-2" hint="Bodies, lenses, audio, drone — helps coordinators staff the right person"><Textarea value={f.equipment} onChange={(e) => set("equipment", e.target.value)} className="min-h-[72px]" maxLength={600} /></Field>
            <Field label="Languages"><TagInput value={f.languages} onChange={(v) => set("languages", v)} suggestions={["English", "Spanish", "French", "Portuguese", "Mandarin", "Yoruba", "Hindi"]} placeholder="Add a language" max={6} /></Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Portfolio & social" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Field label="Portfolio URL" error={err.portfolio_url}><div className="relative"><Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" /><Input value={f.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://" className="pl-9" aria-invalid={!!err.portfolio_url} /></div></Field>
            <Field label="Instagram" error={err.instagram}><div className="relative"><AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" /><Input value={f.instagram.replace(/^@/, "")} onChange={(e) => set("instagram", "@" + e.target.value.replace(/^@/, ""))} className="pl-9" /></div></Field>
            <Field label="Website" error={err.website}><div className="relative"><Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" /><Input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className="pl-9" aria-invalid={!!err.website} /></div></Field>
          </CardBody>
        </Card>

        <div className={cn("sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl bg-white p-3 pl-5 shadow-[var(--shadow-pop)] ring-1 ring-line transition", dirty ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0")}>
          <p className="text-sm text-midnight-700">You have unsaved changes</p>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => { setF(member); setDirty(false); setErr({}); }}>Discard</Button><Button loading={pending} onClick={save}>Save profile</Button></div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <p className="text-sm font-semibold text-ink">Profile completion</p>
          <div className="mt-3 flex items-end gap-2"><span className="text-4xl font-semibold text-ink">{completion.percent}%</span><span className="mb-1 text-sm text-muted">complete</span></div>
          <Progress value={completion.percent} className="mt-3" tone={completion.percent === 100 ? "success" : "blush"} />
          <ul className="mt-5 space-y-2 text-sm">
            {completion.missing.length === 0 && <li className="flex items-center gap-2 text-success-700"><CheckCircle2 className="size-4" />Everything's in place</li>}
            {completion.missing.map((m) => <li key={m} className="flex items-center gap-2 text-midnight-600"><Circle className="size-4 text-midnight-200" />{m}</li>)}
          </ul>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-midnight-800 to-blush-400" />
          <div className="-mt-10 px-6 pb-6">
            <Avatar name={f.full_name} src={f.avatar_url || null} size={80} ring />
            <p className="mt-3 text-[11px] uppercase tracking-wide text-muted">Couples see</p>
            <p className="font-serif text-xl text-ink">{f.full_name}</p>
            <p className="text-[13px] text-muted">{skillsLine(f.skills)} · {f.years_experience} years</p>
            <p className="mt-3 line-clamp-4 text-sm text-midnight-700">{f.bio || "Your bio will appear here."}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{f.specialties.slice(0, 4).map((s) => <Badge key={s} tone="blush"><Award className="size-3" />{s}</Badge>)}</div>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted"><MapPin className="size-3.5" />{market} · within {f.service_radius} mi</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted"><Languages className="size-3.5" />{f.languages.join(", ")}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
