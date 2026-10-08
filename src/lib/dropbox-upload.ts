/**
 * Browser-side transfer helpers (no app imports, so they can be unit-tested in Node with a fake transport).
 */
export type XhrResult = { status: number; text: string; aborted: boolean };

/** One XHR request with upload progress (fetch has no upload progress in most browsers). */
export function sendXhr(method: string, url: string, headers: Record<string, string>, body: Blob, onLoaded: (bytes: number) => void, onXhr: (x: XMLHttpRequest) => void): Promise<XhrResult> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    onXhr(x);
    x.open(method, url);
    Object.entries(headers).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.upload.onprogress = (e) => onLoaded(e.loaded);
    x.onload = () => resolve({ status: x.status, text: x.responseText, aborted: false });
    x.onerror = () => resolve({ status: 0, text: "", aborted: false });
    x.onabort = () => resolve({ status: 0, text: "", aborted: true });
    x.send(body);
  });
}

/** Dropbox wants non-ASCII characters in the Dropbox-API-Arg header escaped as \uXXXX. */
export function headerJson(v: unknown) {
  return JSON.stringify(v).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

const CONTENT = "https://content.dropboxapi.com/2/files";

/**
 * Chunked upload straight to Dropbox (start → append… → finish). Each chunk is retried up to 4 times,
 * and if Dropbox reports a different offset (e.g. a chunk landed but the reply was lost) we continue from there.
 */
export async function dropboxSessionUpload(
  file: Blob, target: { token: string; path: string; chunkSize: number },
  onProgress: (pct: number) => void, onXhr: (x: XMLHttpRequest) => void, isCancelled: () => boolean,
  send: typeof sendXhr = sendXhr, wait: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<{ ok: boolean; error?: string }> {
  const auth = { Authorization: `Bearer ${target.token}`, "Content-Type": "application/octet-stream" };
  let sessionId: string | null = null;
  let offset = 0;
  const report = (inChunk: number) => onProgress(Math.min(99.5, ((offset + inChunk) / Math.max(1, file.size)) * 100));

  while (true) {
    if (isCancelled()) return { ok: false, error: "Upload cancelled" };
    const end = Math.min(file.size, offset + target.chunkSize);
    const last = end >= file.size;
    const chunk = file.slice(offset, end);
    let url: string, arg: unknown;
    if (!sessionId) { url = `${CONTENT}/upload_session/start`; arg = { close: false }; }
    else if (!last) { url = `${CONTENT}/upload_session/append_v2`; arg = { cursor: { session_id: sessionId, offset }, close: false }; }
    else { url = `${CONTENT}/upload_session/finish`; arg = { cursor: { session_id: sessionId, offset }, commit: { path: target.path, mode: "add", autorename: false, mute: true, strict_conflict: false } }; }

    let r: XhrResult | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      r = await send("POST", url, { ...auth, "Dropbox-API-Arg": headerJson(arg) }, chunk, report, onXhr);
      if (r.aborted || isCancelled()) return { ok: false, error: "Upload cancelled" };
      if (r.status === 0 || r.status === 429 || r.status >= 500) { await wait(1000 * 2 ** attempt); continue; }
      break;
    }
    if (!r || r.status === 0) return { ok: false, error: "Network error — check your connection" };
    if (r.status === 401) return { ok: false, error: "The upload pass expired — press Retry." };
    if (r.status === 409) {
      // incorrect_offset: Dropbox already has more (or less) than we think — resume from its offset
      try {
        const err = JSON.parse(r.text)?.error;
        const correct = err?.correct_offset ?? err?.lookup_failed?.correct_offset;
        if (typeof correct === "number" && sessionId) { offset = correct; continue; }
      } catch { /* fall through */ }
      return { ok: false, error: `Dropbox refused the file (${r.text.slice(0, 120) || r.status})` };
    }
    if (r.status >= 300) return { ok: false, error: `Dropbox error ${r.status}` };
    if (!sessionId) {
      try { sessionId = JSON.parse(r.text).session_id; } catch { /* handled below */ }
      if (!sessionId) return { ok: false, error: "Dropbox didn't start the upload — press Retry." };
      offset = end;
      // A file that fit in one chunk still needs a finish call (with an empty body).
      if (last) {
        const fin = await send("POST", `${CONTENT}/upload_session/finish`, { ...auth, "Dropbox-API-Arg": headerJson({ cursor: { session_id: sessionId, offset }, commit: { path: target.path, mode: "add", autorename: false, mute: true, strict_conflict: false } }) }, new Blob([]), report, onXhr);
        if (fin.status >= 200 && fin.status < 300) { onProgress(100); return { ok: true }; }
        return { ok: false, error: fin.status === 0 ? "Network error — check your connection" : `Dropbox error ${fin.status}` };
      }
      continue;
    }
    if (last) { onProgress(100); return { ok: true }; }
    offset = end;
  }
}
