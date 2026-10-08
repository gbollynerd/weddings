"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  UploadCloud, Image as ImageIcon, Film, RotateCcw, X, CheckCircle2, AlertCircle, Loader2, ChevronRight, HardDrive, Folder, Info, Trash2, Clock, Pause, Tag, Bookmark, Mic,
} from "lucide-react";
import { Button, Card, CardHeader, CardBody, StatusBadge, EmptyState, Progress, Alert, Badge, Select, Field, Checkbox } from "@/components/ui";
import { Tabs, useToast, useAction } from "@/components/ui/interactive";
import { uploadFile, type UploadHandle } from "@/lib/client-upload";
import { uploadBatchDoneAction, deleteUploadAction } from "@/lib/actions/team";
import { retagUploadAction } from "@/lib/actions/footage";
import { MOMENTS, MIXED, SOURCES, SOURCE_LABEL, momentLabel, isAudioSource } from "@/content/footage";
import { MarkersModal, type Marker } from "./markers-modal";
import { cn, bytes, duration, fmtDate, ago } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/pricing";

type Wedding = { id: string; couple: string; date: string; assignmentId: string; role: string; city: string; done: number; failed: number; untagged: number; bytes: number };
type FileRow = {
  id: string; wedding_id: string | null; category: string; moment: string | null; source: string | null; camera_markers: boolean; filename: string; size_bytes: number;
  status: string; error: string | null; duration_seconds: number | null; created_at: string; couple: string | null; markers: Marker[];
};
type Tags = { moment: string; source: string; cameraMarkers: boolean };
type QueueItem = { key: string; file: File; pct: number; status: "queued" | "uploading" | "done" | "failed"; error?: string; id?: string; category: string; weddingId: string; retryOf?: string } & Tags;

/** Photos keep RAW / Edited / Highlights folders; video files are filed by moment and camera instead. */
const PHOTO_CATS = [{ value: "raw", label: "RAW" }, { value: "edited", label: "Edited" }, { value: "highlights", label: "Highlights" }] as const;
const LEGACY_VIDEO_CATS: Record<string, string> = { footage: "Footage", audio: "Audio", ceremony: "Ceremony", reception: "Reception" };
const ACCEPT = {
  photo: ".cr2,.cr3,.nef,.arw,.raf,.dng,.orf,.rw2,.jpg,.jpeg,.png,.tif,.tiff,.heic,.zip",
  video: "video/*,.mp4,.mov,.mxf,.braw,.r3d,.wav,.mp3,.zip",
};
const CONCURRENCY = 3;

export function UploadCenter({ kind, weddings, files, selected, provider, providerLabel }: { kind: "photo" | "video"; weddings: Wedding[]; files: FileRow[]; selected: string | null; provider: string; providerLabel: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { run } = useAction();
  const wedding = weddings.find((w) => w.id === selected) ?? null;
  const [cat, setCat] = React.useState<string>(kind === "photo" ? "raw" : "footage");
  // Video must say which part of the day it covers; photographers often dump a whole card, so "whole day" is allowed.
  const [moment, setMoment] = React.useState<string>(kind === "photo" ? MIXED.value : "");
  const [source, setSource] = React.useState<string>(SOURCES[kind][0].value);
  const [cameraMarkers, setCameraMarkers] = React.useState(false);
  const [markersFor, setMarkersFor] = React.useState<FileRow | null>(null);
  const [retagging, setRetagging] = React.useState<string | null>(null);
  const needsMoment = kind === "video" && !moment;
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [drag, setDrag] = React.useState(false);
  const handles = React.useRef(new Map<string, UploadHandle>());
  const inputRef = React.useRef<HTMLInputElement>(null);
  const batch = React.useRef({ ok: 0, fail: 0 });

  const active = queue.filter((q) => q.status === "uploading").length;
  const busy = queue.some((q) => q.status === "uploading" || q.status === "queued");

  // Warn before leaving while uploads run
  React.useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [busy]);

  // Simple scheduler: keep CONCURRENCY uploads in flight
  React.useEffect(() => {
    if (active >= CONCURRENCY) return;
    const next = queue.find((q) => q.status === "queued");
    if (!next) {
      if (!busy && batch.current.ok + batch.current.fail > 0) {
        const { ok, fail } = batch.current;
        batch.current = { ok: 0, fail: 0 };
        uploadBatchDoneAction(wedding?.id ?? null, ok, fail, kind).then(() => router.refresh());
        toast({ tone: fail ? "warning" : "success", title: fail ? `${ok} uploaded, ${fail} failed` : `${ok} file${ok === 1 ? "" : "s"} uploaded`, body: fail ? "Use Retry on the failed files." : kind === "video" ? "Videos are processing — previews appear in a few minutes." : undefined });
      }
      return;
    }
    const w = weddings.find((x) => x.id === next.weddingId);
    setQueue((q) => q.map((x) => (x.key === next.key ? { ...x, status: "uploading" } : x)));
    const h = uploadFile(next.file, { weddingId: next.weddingId, assignmentId: w?.assignmentId ?? null, kind, category: next.category, retryOf: next.retryOf ?? null, moment: next.moment || null, source: next.source || null, cameraMarkers: next.cameraMarkers },
      (pct) => setQueue((q) => q.map((x) => (x.key === next.key ? { ...x, pct } : x))),
      (id) => setQueue((q) => q.map((x) => (x.key === next.key ? { ...x, id } : x))));
    handles.current.set(next.key, h);
    h.promise.then((r) => {
      handles.current.delete(next.key);
      if (r.ok) batch.current.ok++; else batch.current.fail++;
      setQueue((q) => q.map((x) => (x.key === next.key ? { ...x, status: r.ok ? "done" : "failed", error: r.error, id: r.id ?? x.id, pct: r.ok ? 100 : x.pct } : x)));
    });
  }, [queue, active, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (list: FileList | File[] | null) => {
    if (!list || !wedding) return;
    if (needsMoment) { toast({ tone: "error", title: "Choose the moment first", body: "Pick which part of the day these clips cover, then add the files." }); return; }
    const arr = Array.from(list).filter((f) => f.size > 0);
    if (!arr.length) return;
    const tooBig = arr.filter((f) => (kind === "photo" ? f.size > 200 * 1024 ** 2 : f.size > 100 * 1024 ** 3));
    if (tooBig.length) toast({ tone: "error", title: `${tooBig.length} file${tooBig.length > 1 ? "s are" : " is"} too large`, body: kind === "photo" ? "Photo files are limited to 200 MB each." : "Video files are limited to 100 GB each." });
    const ok = arr.filter((f) => !tooBig.includes(f));
    setQueue((q) => [...q, ...ok.map((file) => ({ key: `${file.name}-${file.size}-${Math.random()}`, file, pct: 0, status: "queued" as const, category: cat, weddingId: wedding.id, moment, source, cameraMarkers }))]);
  };
  const retry = (item: QueueItem) => setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, status: "queued", pct: 0, error: undefined, retryOf: x.id } : x)));
  const cancel = (item: QueueItem) => { handles.current.get(item.key)?.cancel(); setQueue((q) => q.map((x) => (x.key === item.key && x.status === "queued" ? { ...x, status: "failed", error: "Cancelled" } : x))); };
  const retryAll = () => setQueue((q) => q.map((x) => (x.status === "failed" ? { ...x, status: "queued", pct: 0, error: undefined, retryOf: x.id } : x)));

  const visibleFiles = files.filter((f) => !queue.some((q) => q.id === f.id && q.status !== "done"));
  const failedSaved = visibleFiles.filter((f) => f.status === "failed");
  const totalPct = queue.length ? queue.reduce((s, q) => s + (q.status === "done" ? 100 : q.pct), 0) / queue.length : 0;
  const Icon = kind === "photo" ? ImageIcon : Film;
  const retag = async (f: FileRow, patch: { moment?: string; source?: string }) => {
    setRetagging(f.id);
    run(() => retagUploadAction(f.id, patch), { onSuccess: () => router.refresh() });
    setRetagging(null);
  };
  const folderLabel = kind === "photo" ? PHOTO_CATS.find((c) => c.value === cat)?.label : momentLabel(moment || null);
  const untaggedHere = kind === "video" ? visibleFiles.filter((f) => f.status !== "failed" && !f.moment).length : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      {/* Weddings */}
      <aside className="space-y-3">
        <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Your weddings</p>
        {weddings.length === 0 && <Card><EmptyState icon={Folder} title="No weddings to upload yet" description="Weddings appear here on the day of the event." className="py-8" /></Card>}
        {weddings.map((w) => (
          <Link key={w.id} href={`${pathname}?wedding=${w.id}`} scroll={false}
            className={cn("card block p-4 transition hover:-translate-y-0.5", w.id === selected && "ring-2 ring-midnight-900")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{w.couple}</p>
                <p className="text-[12px] text-muted">{fmtDate(w.date, "MMM d, yyyy")} · {w.city}</p>
              </div>
              {w.failed > 0 ? <Badge tone="danger">{w.failed} failed</Badge> : w.untagged > 0 ? <Badge tone="warning">{w.untagged} untagged</Badge> : w.done > 0 ? <Badge tone="success">{w.done} files</Badge> : new Date(w.date) <= new Date() ? <Badge tone="warning">Due</Badge> : <Badge>Upcoming</Badge>}
            </div>
            <p className="mt-2 text-[12px] text-muted">{ROLE_LABEL[w.role]} · {bytes(Number(w.bytes))}</p>
          </Link>
        ))}
      </aside>

      <div className="space-y-6">
        {!wedding ? (
          <Card><EmptyState icon={Icon} title="Choose a wedding" description="Select a wedding on the left to upload files into its folder." /></Card>
        ) : (
          <>
            <Card>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <nav aria-label="Folder" className="flex flex-wrap items-center gap-1 text-sm text-muted">
                  <Folder className="mr-1 size-4" />Weddings<ChevronRight className="size-3.5" />
                  <span className="text-midnight-700">{wedding.couple}</span><ChevronRight className="size-3.5" />
                  <span>{wedding.date}</span><ChevronRight className="size-3.5" />
                  <span>{kind === "photo" ? "Photo" : "Video"}</span><ChevronRight className="size-3.5" />
                  {kind === "photo" && <><span>{folderLabel}</span><ChevronRight className="size-3.5" /></>}
                  <span className="font-semibold text-ink">{kind === "photo" ? momentLabel(moment) : folderLabel}</span>
                </nav>
                {kind === "photo" && <Tabs value={cat} onChange={setCat} items={PHOTO_CATS.map((c) => ({ ...c, count: files.filter((f) => f.category === c.value && f.wedding_id === wedding.id && f.status !== "failed").length }))} />}
              </div>
              <div className="mx-5 mb-4 rounded-2xl bg-canvas/70 p-4 ring-1 ring-line sm:mx-6">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink"><Tag className="size-4 text-blush-500" />Tag this batch</p>
                <p className="mt-0.5 text-[12px] text-muted">Every file you add next gets these tags. Upload one moment and one {kind === "photo" ? "camera body" : "camera or recorder"} at a time — you can change a file&apos;s tag later.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Moment" htmlFor="tag-moment" required={kind === "video"}>
                    <Select id="tag-moment" value={moment} onChange={(e) => setMoment(e.target.value)} aria-invalid={needsMoment || undefined}>
                      {kind === "video" ? <option value="" disabled>Choose the part of the day…</option> : <option value={MIXED.value}>{MIXED.label}</option>}
                      {MOMENTS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                  </Field>
                  <Field label={kind === "photo" ? "Camera body" : "Camera / recorder"} htmlFor="tag-source">
                    <Select id="tag-source" value={source} onChange={(e) => setSource(e.target.value)}>
                      {SOURCES[kind].map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                  </Field>
                </div>
                {kind === "video" && (
                  <Checkbox className="mt-3 items-start [&>input]:mt-0.5" checked={cameraMarkers} onChange={(e) => setCameraMarkers(e.target.checked)}
                    label={<span className="text-[13px]">I dropped <b>in-camera markers</b> (shot marks / flags) on these clips{isAudioSource(source) ? " or slate claps on this recording" : ""}</span>} />
                )}
              </div>
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
                  className={cn("flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition",
                    needsMoment ? "border-midnight-100 bg-canvas/40 opacity-70" : drag ? "border-blush-400 bg-blush-50" : "border-midnight-100 bg-canvas/60 hover:border-midnight-200")}>
                  <div className="grid size-14 place-items-center rounded-2xl bg-white text-midnight-700 shadow-sm"><UploadCloud className="size-6" /></div>
                  <p className="mt-4 font-semibold text-ink">Drag & drop {kind === "photo" ? "photos" : "video files"} here</p>
                  <p className="mt-1 text-sm text-muted">{needsMoment ? "Choose the moment above first" : kind === "photo" ? "RAW (CR3, NEF, ARW…), JPEG or ZIP · up to 200 MB each" : "MP4, MOV, MXF, BRAW, WAV/MP3 audio · up to 100 GB each"}</p>
                  <input ref={inputRef} type="file" multiple accept={ACCEPT[kind]} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
                  <Button className="mt-5" icon={UploadCloud} disabled={needsMoment} onClick={() => inputRef.current?.click()}>Select files</Button>
                </div>
                {kind === "video" && <Alert tone="info" icon={Info} className="mt-4">Large video files can take a while. Keep this tab open until each file shows <b>Uploaded</b>; we then process previews in the background — you can safely leave once processing starts.</Alert>}
              </div>
            </Card>

            {queue.length > 0 && (
              <Card>
                <CardHeader title={busy ? `Uploading ${queue.filter((q) => q.status === "done").length} of ${queue.length}` : "Upload session complete"}
                  subtitle={busy ? `${active} in progress · keep this tab open` : `${queue.filter((q) => q.status === "done").length} uploaded · ${queue.filter((q) => q.status === "failed").length} failed`}
                  action={<div className="flex gap-2">{queue.some((q) => q.status === "failed") && <Button size="sm" variant="outline" icon={RotateCcw} onClick={retryAll}>Retry failed</Button>}{!busy && <Button size="sm" variant="ghost" onClick={() => setQueue([])}>Clear</Button>}</div>} />
                <CardBody>
                  <Progress value={totalPct} className="mb-4" tone={queue.some((q) => q.status === "failed") ? "blush" : "midnight"} />
                  <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                    {queue.map((q) => (
                      <li key={q.key} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", q.status === "done" ? "bg-success-50 text-success-500" : q.status === "failed" ? "bg-danger-50 text-danger-500" : "bg-midnight-50 text-midnight-600")}>
                          {q.status === "done" ? <CheckCircle2 className="size-4" /> : q.status === "failed" ? <AlertCircle className="size-4" /> : q.status === "queued" ? <Pause className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="truncate font-medium text-ink">{q.file.name}</span>
                            <span className="shrink-0 text-muted">{q.status === "uploading" ? `${Math.round(q.pct)}%` : q.status === "queued" ? "Waiting" : q.status === "done" ? (kind === "video" ? "Processing" : "Uploaded") : "Failed"}</span>
                          </div>
                          {q.status === "failed" ? <p className="text-[12px] text-danger-500">{q.error}</p> : <Progress value={q.pct} className="mt-1.5 h-1.5" tone={q.status === "done" ? "success" : "midnight"} />}
                          <p className="mt-1 text-[11px] text-muted">{bytes(q.file.size)} · {kind === "photo" ? `${PHOTO_CATS.find((c) => c.value === q.category)?.label ?? q.category} · ` : ""}{momentLabel(q.moment || null)} · {SOURCE_LABEL[q.source] ?? q.source}</p>
                        </div>
                        {q.status === "failed" && <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => retry(q)}>Retry</Button>}
                        {(q.status === "uploading" || q.status === "queued") && <button onClick={() => cancel(q)} className="text-midnight-300 hover:text-danger-500" aria-label={`Cancel ${q.file.name}`}><X className="size-4" /></button>}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            <Card className="overflow-hidden">
              <CardHeader title="Uploaded files" subtitle={`${visibleFiles.filter((f) => f.status !== "failed").length} files · ${bytes(visibleFiles.filter((f) => f.status !== "failed").reduce((s, f) => s + Number(f.size_bytes), 0))}`}
                action={failedSaved.length > 0 ? <Badge tone="danger">{failedSaved.length} failed</Badge> : undefined} />
              {untaggedHere > 0 && (
                <div className="mx-5 mt-4 sm:mx-6">
                  <Alert tone="warning" icon={Tag} title={`${untaggedHere} file${untaggedHere > 1 ? "s need" : " needs"} a moment tag`}>Use the Moment column below so the editor knows where each clip belongs.</Alert>
                </div>
              )}
              {failedSaved.length > 0 && (
                <div className="mx-5 mt-4 sm:mx-6">
                  <Alert tone="danger" icon={AlertCircle} title={`${failedSaved.length} file${failedSaved.length > 1 ? "s" : ""} failed in an earlier session`}>
                    Re-select {failedSaved.length > 1 ? "them" : "it"} below to retry — we&apos;ll replace the failed entry.
                    <span className="mt-2 flex flex-wrap gap-2">
                      {failedSaved.map((f) => (
                        <label key={f.id} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-danger-700 ring-1 ring-danger-500/20 hover:bg-danger-50">
                          <RotateCcw className="size-3" />Retry {f.filename}
                          <input type="file" className="hidden" accept={ACCEPT[kind]} onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setQueue((q) => [...q, { key: `${file.name}-${Math.random()}`, file, pct: 0, status: "queued", category: f.category, weddingId: wedding.id, retryOf: f.id, id: f.id, moment: f.moment ?? moment, source: f.source ?? source, cameraMarkers: f.camera_markers }]);
                            e.target.value = "";
                          }} />
                        </label>
                      ))}
                    </span>
                  </Alert>
                </div>
              )}
              <div className="mt-4 overflow-x-auto">
                {visibleFiles.length === 0 ? <EmptyState icon={Icon} title="No files yet" description="Files you upload for this wedding will appear here." /> : (
                  <table className="w-full min-w-[860px] text-sm">
                    <thead><tr className="border-y border-line bg-canvas/60 text-left text-[12px] uppercase tracking-wide text-muted">
                      <th className="px-6 py-3 font-medium">Filename</th><th className="px-4 py-3 font-medium">Moment</th><th className="px-4 py-3 font-medium">{kind === "photo" ? "Folder · body" : "Camera"}</th><th className="px-4 py-3 font-medium">Size</th>
                      {kind === "video" && <th className="px-4 py-3 font-medium">Duration</th>}
                      {kind === "video" && <th className="px-4 py-3 font-medium">Markers</th>}
                      <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Uploaded</th><th className="px-4 py-3" />
                    </tr></thead>
                    <tbody>
                      {visibleFiles.map((f) => (
                        <tr key={f.id} className="border-b border-line/70 last:border-0">
                          <td className="max-w-[260px] px-6 py-3"><span className="flex items-center gap-2 truncate font-medium text-ink"><Icon className="size-4 shrink-0 text-midnight-300" />{f.filename}</span>{f.error && <span className="block text-[12px] text-danger-500">{f.error}</span>}</td>
                          <td className="px-4 py-2">
                            {f.status === "failed" ? <span className="text-midnight-300">—</span> : (
                              <Select aria-label={`Moment for ${f.filename}`} value={f.moment ?? ""} disabled={retagging === f.id}
                                onChange={(e) => retag(f, { moment: e.target.value })}
                                className={cn("h-9 w-[190px] text-[13px]", !f.moment && kind === "video" && "border-warning-500 text-warning-700")}>
                                {!f.moment && <option value="" disabled>Untagged</option>}
                                {kind === "photo" && <option value={MIXED.value}>{MIXED.label}</option>}
                                {MOMENTS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </Select>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-midnight-600">
                            {kind === "photo" ? `${PHOTO_CATS.find((c) => c.value === f.category)?.label ?? f.category}${f.source ? ` · ${SOURCE_LABEL[f.source] ?? f.source}` : ""}`
                              : <span className="inline-flex items-center gap-1">{isAudioSource(f.source) && <Mic className="size-3.5 text-midnight-300" />}{f.source ? SOURCE_LABEL[f.source] ?? f.source : LEGACY_VIDEO_CATS[f.category] ?? f.category}</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-midnight-600">{bytes(Number(f.size_bytes))}</td>
                          {kind === "video" && <td className="px-4 py-3 text-midnight-600">{duration(f.duration_seconds)}</td>}
                          {kind === "video" && (
                            <td className="px-4 py-3">
                              {f.status === "failed" ? <span className="text-midnight-300">—</span> : (
                                <button onClick={() => setMarkersFor(f)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-midnight-700 ring-1 ring-line hover:bg-midnight-50">
                                  <Bookmark className="size-3.5" />{f.markers.length ? `${f.markers.length} marker${f.markers.length > 1 ? "s" : ""}` : "Add"}{f.camera_markers && <span className="text-blush-600">+ cam</span>}
                                </button>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3"><StatusBadge status={f.status} />{f.status === "processing" && <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-muted"><Clock className="size-3" />few min</span>}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-midnight-600">{ago(f.created_at)}</td>
                          <td className="px-4 py-3 text-right">{f.status === "failed" && <button onClick={() => run(() => deleteUploadAction(f.id), { onSuccess: () => router.refresh() })} className="-m-2 inline-grid size-9 place-items-center rounded-lg text-midnight-300 hover:bg-danger-50 hover:text-danger-500" aria-label="Remove failed file"><Trash2 className="size-4" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            <div className="flex items-start gap-3 rounded-2xl bg-white p-4 text-[12px] text-muted ring-1 ring-line">
              <HardDrive className="mt-0.5 size-4 shrink-0" />
              <p>Storage: <b className="text-midnight-700">{providerLabel}</b>. Files go directly from your browser to storage{provider === "dropbox" ? " — large videos in 32 MB pieces that retry on their own if your connection drops" : " over signed URLs"}; {CONCURRENCY} files upload in parallel and each one is checked once it lands. Due within 48 hours of the wedding. Keep your backup copies until your coordinator confirms delivery.</p>
            </div>
            <MarkersModal open={!!markersFor} onClose={() => setMarkersFor(null)} upload={markersFor} />
          </>
        )}
      </div>
    </div>
  );
}
