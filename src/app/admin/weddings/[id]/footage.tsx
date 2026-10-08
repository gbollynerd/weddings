"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Film, Smartphone, Image as ImageIcon, Bookmark, Download, Tag, Mic, FolderOpen } from "lucide-react";
import { Card, CardHeader, Badge, EmptyState, Select } from "@/components/ui";
import { useAction } from "@/components/ui/interactive";
import { MarkersModal, type Marker } from "@/components/uploads/markers-modal";
import { retagUploadAction } from "@/lib/actions/footage";
import { MOMENTS, MIXED, SOURCE_LABEL, momentLabel, isAudioSource } from "@/content/footage";
import { bytes, duration, cn } from "@/lib/utils";

type Row = {
  id: string; kind: "photo" | "video" | "content"; category: string; moment: string | null; source: string | null; camera_markers: boolean; filename: string;
  size_bytes: number; status: string; duration_seconds: number | null; uploader: string; markers: Marker[]; downloadable: boolean;
};

const ORDER = [...MOMENTS.map((m) => m.value), MIXED.value];

/** Coordinator view of everything shot at a wedding, grouped by moment, with markers and download links. */
export function FootagePanel({ rows, providerLabel }: { rows: Row[]; providerLabel: string }) {
  const router = useRouter();
  const { run } = useAction();
  const [markersFor, setMarkersFor] = React.useState<Row | null>(null);
  const [kind, setKind] = React.useState<"all" | "photo" | "video" | "content">("all");

  const shown = rows.filter((r) => kind === "all" || r.kind === kind);
  const groups = new Map<string, Row[]>();
  for (const r of shown) groups.set(r.moment ?? "", [...(groups.get(r.moment ?? "") ?? []), r]);
  const keys = [...groups.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : ORDER.indexOf(a) - ORDER.indexOf(b)));
  const untagged = rows.filter((r) => r.kind === "video" && !r.moment).length;
  const total = rows.reduce((s, r) => s + r.size_bytes, 0);
  const markerCount = rows.reduce((s, r) => s + r.markers.length, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Footage & photos"
        subtitle={rows.length ? `${rows.filter((r) => r.kind === "video").length} video/audio · ${rows.filter((r) => r.kind === "photo").length} photo · ${rows.filter((r) => r.kind === "content").length} content files · ${bytes(total)} · ${markerCount} markers · ${providerLabel}` : providerLabel}
        action={rows.length > 0 ? (
          <div className="flex gap-1 rounded-full bg-midnight-50 p-1 text-[12px] font-medium">
            {(["all", "video", "photo", "content"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={cn("rounded-full px-3 py-1 capitalize", kind === k ? "bg-white text-ink shadow-sm" : "text-midnight-600")}>{k}</button>
            ))}
          </div>
        ) : undefined} />
      {rows.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nothing uploaded yet" description="Files appear here as the team uploads them, grouped by moment." />
      ) : (
        <div className="divide-y divide-line">
          {untagged > 0 && <p className="flex items-center gap-1.5 bg-warning-50 px-6 py-2.5 text-[13px] text-warning-700"><Tag className="size-4" />{untagged} video file{untagged > 1 ? "s" : ""} still need a moment tag — tag them below or ask the videographer.</p>}
          {keys.map((k) => {
            const list = groups.get(k)!;
            return (
              <section key={k || "untagged"} className="px-5 py-4 sm:px-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{k ? momentLabel(k) : "Untagged"}</h3>
                  <Badge>{list.length} file{list.length > 1 ? "s" : ""}</Badge>
                  <span className="text-[12px] text-muted">{[...new Set(list.map((r) => (r.source ? SOURCE_LABEL[r.source] ?? r.source : null)).filter(Boolean))].join(" · ")}</span>
                </div>
                <ul className="space-y-1.5">
                  {list.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-2 py-1.5 text-[13px] hover:bg-canvas">
                      <span className="flex min-w-0 flex-1 basis-56 items-center gap-2">
                        {r.kind === "photo" ? <ImageIcon className="size-4 shrink-0 text-midnight-300" /> : r.kind === "content" ? <Smartphone className="size-4 shrink-0 text-midnight-300" /> : isAudioSource(r.source) ? <Mic className="size-4 shrink-0 text-midnight-300" /> : <Film className="size-4 shrink-0 text-midnight-300" />}
                        <span className="truncate font-medium text-ink">{r.filename}</span>
                      </span>
                      <span className="w-40 truncate text-muted">{r.uploader}{r.source ? ` · ${SOURCE_LABEL[r.source] ?? r.source}` : ""}</span>
                      <span className="w-20 text-muted">{bytes(r.size_bytes)}</span>
                      <span className="w-16 text-muted">{r.kind === "video" ? duration(r.duration_seconds) : ""}</span>
                      <Select aria-label={`Moment for ${r.filename}`} value={r.moment ?? ""} className="h-8 w-40 text-[12px]"
                        onChange={(e) => run(() => retagUploadAction(r.id, { moment: e.target.value }), { onSuccess: () => router.refresh() })}>
                        {!r.moment && <option value="" disabled>Untagged</option>}
                        {r.kind !== "video" && <option value={MIXED.value}>{MIXED.label}</option>}
                        {MOMENTS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </Select>
                      <span className="w-20">
                        {r.kind !== "photo" && (
                          <button onClick={() => setMarkersFor(r)} aria-label={`Markers for ${r.filename}`} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-midnight-700 ring-1 ring-line hover:bg-white">
                            <Bookmark className="size-3.5" />{r.markers.length}{r.camera_markers && <span className="text-blush-600">+cam</span>}
                          </button>
                        )}
                      </span>
                      {r.downloadable
                        ? <a href={`/api/uploads/${r.id}`} target="_blank" rel="noopener" className="grid size-8 place-items-center rounded-lg text-midnight-500 hover:bg-white hover:text-ink" aria-label={`Download ${r.filename}`}><Download className="size-4" /></a>
                        : <span className="size-8" />}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <MarkersModal key={markersFor?.id ?? "none"} open={!!markersFor} onClose={() => setMarkersFor(null)} upload={markersFor} />
    </Card>
  );
}
