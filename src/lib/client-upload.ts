"use client";

import { beginUploadAction, finishUploadAction } from "@/lib/actions/team";
import { sendXhr, dropboxSessionUpload } from "@/lib/dropbox-upload";

export type UploadMeta = {
  weddingId: string | null; assignmentId: string | null; kind: "photo" | "video" | "content" | "document"; category: string; retryOf?: string | null;
  moment?: string | null; source?: string | null; cameraMarkers?: boolean;
};
export type UploadHandle = { id: string | null; promise: Promise<{ ok: boolean; id: string | null; error?: string; key?: string }>; cancel: () => void };

/** Reads a video's duration in the browser (best effort). */
export function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("video/")) return resolve(null);
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : null); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    v.src = url;
    setTimeout(() => resolve(null), 4000);
  });
}

/**
 * Uploads one file: asks the server for a target, then sends it straight to storage — a signed PUT
 * (Supabase), a Dropbox temporary upload link (≤140 MB) or a chunked Dropbox upload session (bigger
 * files) — or simulates the transfer when the mock storage provider is active.
 */
export function uploadFile(file: File, meta: UploadMeta, onProgress: (pct: number) => void, onId?: (id: string) => void): UploadHandle {
  let cancelled = false;
  let xhr: XMLHttpRequest | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const handle: UploadHandle = { id: null, cancel: () => { cancelled = true; xhr?.abort(); if (timer) clearInterval(timer); }, promise: Promise.resolve({ ok: false, id: null }) };

  handle.promise = (async () => {
    const begin = await beginUploadAction({ ...meta, filename: file.name, size: file.size, mime: file.type || "application/octet-stream" });
    if (!begin.ok) return { ok: false, id: null, error: begin.message };
    handle.id = begin.id;
    onId?.(begin.id);
    const durationP = meta.kind === "video" ? videoDuration(file) : Promise.resolve(null);
    let result: { ok: boolean; error?: string };
    const target = begin.target;
    if (target.mode === "put" || target.mode === "post") {
      const r = await sendXhr(target.mode === "put" ? "PUT" : "POST", target.url, target.headers, file, (loaded) => onProgress((loaded / Math.max(1, file.size)) * 100), (x) => { xhr = x; });
      result = r.status === 0 ? { ok: false, error: r.aborted ? "Upload cancelled" : "Network error — check your connection" }
        : r.status < 300 ? { ok: true } : { ok: false, error: `Storage rejected the file (${r.status})` };
    } else if (target.mode === "dropbox-session") {
      result = await dropboxSessionUpload(file, target, onProgress, (x) => { xhr = x; }, () => cancelled);
    } else {
      // Demo storage: simulate a realistic transfer speed (~25–60 MB/s, capped so demos stay snappy).
      const seconds = Math.min(meta.kind === "video" ? 9 : 4, Math.max(0.8, file.size / (40 * 1024 * 1024)));
      const failChance = meta.retryOf ? 0 : file.name.toLowerCase().includes("fail") ? 1 : 0.04;
      const willFail = Math.random() < failChance;
      const failAt = 35 + Math.random() * 50;
      result = await new Promise((resolve) => {
        let pct = 0;
        timer = setInterval(() => {
          if (cancelled) { clearInterval(timer!); return resolve({ ok: false, error: "Upload cancelled" }); }
          pct += (100 / (seconds * 10)) * (0.6 + Math.random() * 0.8);
          if (willFail && pct >= failAt) { clearInterval(timer!); return resolve({ ok: false, error: "Connection reset while uploading" }); }
          onProgress(Math.min(100, pct));
          if (pct >= 100) { clearInterval(timer!); resolve({ ok: true }); }
        }, 100);
      });
    }
    const durationSeconds = await durationP;
    // The server double-checks the file landed at full size before marking it uploaded.
    const fin = await finishUploadAction(begin.id, { ok: result.ok, error: result.error, durationSeconds });
    const ok = result.ok && fin.ok;
    return { ok, id: begin.id, error: ok ? undefined : result.error ?? fin.error ?? "Upload failed", key: begin.key };
  })().catch((e) => ({ ok: false, id: handle.id, error: e instanceof Error ? e.message : "Upload failed" }));
  return handle;
}

