"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import { Button, Input, Select, Field, Alert } from "@/components/ui";
import { Modal, useToast } from "@/components/ui/interactive";
import { addMarkerAction, deleteMarkerAction } from "@/lib/actions/footage";
import { MARKER_BEATS, MOMENTS, BEAT_LABEL, formatTimecode } from "@/content/footage";
import { duration } from "@/lib/utils";

export type Marker = { id: string; at: number; beat: string; note: string | null };

/** Lists and edits the timecode markers inside one clip (vows at 12:31, toast starts at 3:05…). */
export function MarkersModal({ open, onClose, upload, readOnly }: {
  open: boolean; onClose: () => void; readOnly?: boolean;
  upload: { id: string; filename: string; duration_seconds: number | null; markers: Marker[]; camera_markers?: boolean } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  // Mounted fresh for each file (callers pass key={upload.id}), so state starts from the props — no reset effect
  // that could wipe what someone has already started typing.
  const [markers, setMarkers] = React.useState<Marker[]>(upload?.markers ?? []);
  const [time, setTime] = React.useState("");
  const [beat, setBeat] = React.useState<string>(MARKER_BEATS[0].value);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const changed = React.useRef(false);


  const close = () => { onClose(); if (changed.current) router.refresh(); };
  const add = async () => {
    if (!upload) return;
    setBusy(true); setError(null);
    const r = await addMarkerAction(upload.id, { time, beat, note });
    setBusy(false);
    if (!r.ok || !r.data) { setError(r.message ?? "Couldn't add the marker."); return; }
    const added = { id: r.data.id, at: r.data.at, beat, note: note.trim() || null };
    setMarkers((m) => [...m, added].sort((a, b) => a.at - b.at));
    setTime(""); setNote(""); changed.current = true;
  };
  const remove = async (id: string) => {
    const r = await deleteMarkerAction(id);
    if (!r.ok) { toast({ tone: "error", title: r.message ?? "Couldn't remove the marker" }); return; }
    setMarkers((m) => m.filter((x) => x.id !== id)); changed.current = true;
  };

  return (
    <Modal open={open} onClose={close} size="md" title="Markers" description={upload ? `${upload.filename}${upload.duration_seconds ? ` · ${duration(upload.duration_seconds)}` : ""}` : undefined}
      icon={<span className="grid size-11 place-items-center rounded-full bg-blush-50 text-blush-600"><Bookmark className="size-5" /></span>}
      footer={<Button variant="outline" onClick={close}>Done</Button>}>
      <div className="space-y-4">
        {upload?.camera_markers && <Alert tone="info">In-camera markers were recorded on this clip — the editor reads those from the file.</Alert>}
        {markers.length === 0 ? (
          <p className="rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-muted">No markers yet. Mark key beats so the editor can jump straight to them.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {markers.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-16 shrink-0 font-mono text-[13px] text-midnight-700">{formatTimecode(m.at)}</span>
                <span className="min-w-0 flex-1"><span className="font-medium text-ink">{BEAT_LABEL[m.beat] ?? m.beat}</span>{m.note && <span className="block truncate text-[12px] text-muted">{m.note}</span>}</span>
                {!readOnly && <button onClick={() => remove(m.id)} className="-m-2 grid size-9 place-items-center rounded-lg text-midnight-300 hover:bg-danger-50 hover:text-danger-500" aria-label={`Remove marker at ${formatTimecode(m.at)}`}><Trash2 className="size-4" /></button>}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <div className="rounded-2xl border border-line p-4">
            <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
              <Field label="Time in clip" htmlFor="mk-time">
                <Input id="mk-time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="12:31" inputMode="numeric" className="font-mono"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
              </Field>
              <Field label="What happens" htmlFor="mk-beat">
                <Select id="mk-beat" value={beat} onChange={(e) => setBeat(e.target.value)}>
                  <optgroup label="Beats">{MARKER_BEATS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</optgroup>
                  <optgroup label="Moments">{MOMENTS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</optgroup>
                </Select>
              </Field>
            </div>
            <Field label="Note (optional)" htmlFor="mk-note" className="mt-3">
              <Input id="mk-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Best man's speech — mic pops at the start" />
            </Field>
            {error && <Alert tone="danger" className="mt-3">{error}</Alert>}
            <Button className="mt-3" size="sm" icon={Plus} loading={busy} onClick={add} disabled={!time.trim()}>Add marker</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
