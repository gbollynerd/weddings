import "server-only";
import { sql } from "@/lib/db";
import { storage, storageKey } from "@/lib/storage";
import { safeName, dropboxConfig } from "@/lib/dropbox";
import { notify } from "./notifications";
import { skillForRole, skillPerson } from "@/lib/skills";
import { momentLabel, isMoment, isSource, isAudioSource, SOURCE_LABEL, BEAT_LABEL, MARKER_BEATS, MOMENTS } from "@/content/footage";

export async function uploadableWeddings(memberId: string) {
  return sql`select w.id, w.couple, w.wedding_date::text, a.id as assignment_id, a.role, m.city, m.state,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status in ('uploaded','ready','processing'))::int as done,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status = 'failed')::int as failed,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status <> 'failed' and u.moment is null and u.kind = 'video')::int as untagged,
      (select coalesce(sum(size_bytes),0) from uploads u where u.assignment_id = a.id and u.status <> 'failed')::bigint as bytes
    from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id
    where a.team_member_id = ${memberId} and a.status in ('accepted','completed') and w.wedding_date between current_date - 45 and current_date + 7 and w.status <> 'cancelled'
    order by w.wedding_date desc`;
}

export async function listUploads(userId: string, kind: "photo" | "video" | "content", weddingId?: string) {
  // Video "processing" finishes ~2 minutes after upload in the demo pipeline.
  await sql`update uploads set status = 'ready' where uploader_id = ${userId} and status = 'processing' and created_at < now() - interval '2 minutes'`;
  return sql`select u.id, u.wedding_id, u.category, u.moment, u.source, u.camera_markers, u.filename, u.size_bytes, u.status, u.error, u.duration_seconds, u.created_at, w.couple,
      coalesce((select json_agg(json_build_object('id', k.id, 'at', k.at_seconds, 'beat', k.beat, 'note', k.note) order by k.at_seconds) from upload_markers k where k.upload_id = u.id), '[]') as markers
    from uploads u left join weddings w on w.id = u.wedding_id
    where u.uploader_id = ${userId} and u.kind = ${kind} ${weddingId ? sql`and u.wedding_id = ${weddingId}` : sql``}
    order by u.created_at desc limit 500`;
}

export type BeginInput = {
  weddingId: string | null; assignmentId: string | null; kind: "photo" | "video" | "content" | "document"; category: string;
  filename: string; size: number; mime: string; retryOf?: string | null;
  moment?: string | null; source?: string | null; cameraMarkers?: boolean;
};

const PHOTO_CATEGORY: Record<string, string> = { raw: "RAW", edited: "Edited", highlights: "Highlights" };
const CONTENT_CATEGORY: Record<string, string> = { raw: "Raw clips & photos", finished: "Finished reels" };

/**
 * Readable folder layout used when files live in Dropbox, e.g.
 *   /Weddings/2026-10-10 Ade & Tolu [3f2a9c1b]/Video/Toasts & speeches/Daniel Kim · B-cam/C0042.MP4
 *   /Weddings/2026-10-10 Ade & Tolu [3f2a9c1b]/Photo/RAW/Whole day - mixed/Marcus Johnson · Main body/A_0001.CR3
 */
export function readablePath(root: string, p: {
  kind: "photo" | "video" | "content" | "document"; category: string; filename: string; uploader: string;
  wedding: { id: string; date: string; couple: string } | null; moment: string | null; source: string | null;
}) {
  const file = safeName(p.filename, 140);
  const who = safeName(p.uploader, 60);
  if (p.kind === "document" || !p.wedding) return [root, "_Team documents", safeName(p.category || "files"), who, file].join("/");
  const wedding = `${p.wedding.date} ${safeName(p.wedding.couple, 70)} [${p.wedding.id.slice(0, 8)}]`;
  const moment = safeName(p.moment ? momentLabel(p.moment) : "Untagged");
  const shooter = p.source ? `${who} · ${safeName(SOURCE_LABEL[p.source] ?? p.source, 40)}` : who;
  const parts = p.kind === "photo"
    ? [root, wedding, "Photo", PHOTO_CATEGORY[p.category] ?? safeName(p.category), moment, shooter, file]
    : p.kind === "content"
    ? [root, wedding, "Content", CONTENT_CATEGORY[p.category] ?? safeName(p.category), moment, shooter, file]
    : [root, wedding, "Video", moment, shooter, file];
  return parts.join("/");
}

/** Adds " (2)", " (3)"… before the extension until the path is free in the database and in storage. */
async function freePath(path: string, ignoreId: string | null) {
  const dot = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");
  const [stem, ext] = dot > slash ? [path.slice(0, dot), path.slice(dot)] : [path, ""];
  for (let n = 1; n <= 60; n++) {
    const candidate = n === 1 ? path : `${stem} (${n})${ext}`;
    const [taken] = await sql`select 1 from uploads where lower(storage_key) = lower(${candidate}) and status <> 'failed' ${ignoreId ? sql`and id <> ${ignoreId}` : sql``} limit 1`;
    if (taken) continue;
    if (await storage().exists(candidate)) continue;
    return candidate;
  }
  throw new Error("Too many files with this name — rename the file and try again.");
}

async function keyFor(userId: string, input: Pick<BeginInput, "kind" | "category" | "filename" | "weddingId" | "moment" | "source">, ignoreId: string | null) {
  const provider = storage();
  if (!provider.readablePaths) return storageKey(`${input.kind}/${input.weddingId ?? "misc"}`, input.filename);
  const [[w], [u]] = await Promise.all([
    input.weddingId ? sql`select id, couple, wedding_date::text as date from weddings where id = ${input.weddingId}` : Promise.resolve([] as never[]),
    sql`select full_name from users where id = ${userId}`,
  ]);
  const root = dropboxConfig()?.root ?? "";
  return freePath(readablePath(root, { kind: input.kind, category: input.category, filename: input.filename, uploader: u?.full_name ?? "Team member", wedding: w ? { id: w.id, date: w.date, couple: w.couple } : null, moment: input.moment ?? null, source: input.source ?? null }), ignoreId);
}

function normalizeTags(input: Pick<BeginInput, "kind" | "category" | "moment" | "source">) {
  if (input.kind === "document") return { category: input.category, moment: null, source: null };
  const mixedOk = input.kind === "photo" || input.kind === "content";
  const moment = input.moment && isMoment(input.moment, mixedOk) ? input.moment : null;
  const source = input.source && isSource(input.kind, input.source) ? input.source : null;
  if (input.kind === "video" && !moment) throw new Error("Choose which part of the day this footage covers.");
  // Video files are filed as footage or audio from their source; photos keep RAW / Edited / Highlights.
  const category = input.kind === "video" ? (isAudioSource(source) ? "audio" : "footage")
    : input.kind === "content" ? (input.category === "finished" ? "finished" : "raw") : input.category;
  return { category, moment, source };
}

export async function beginUpload(userId: string, input: BeginInput) {
  if (input.assignmentId) {
    const [ok] = await sql`select a.role from wedding_assignments a join team_members t on t.id = a.team_member_id where a.id = ${input.assignmentId} and t.user_id = ${userId}`;
    if (!ok) throw new Error("You're not assigned to this wedding.");
    // What you upload follows your role on this wedding (photographer → photos, content creator → content…)
    if (input.kind !== "document" && input.kind !== skillForRole(ok.role)) throw new Error(`You're the ${skillPerson(skillForRole(ok.role)).toLowerCase()} on this wedding — upload into that section.`);
  }
  const tags = normalizeTags(input);
  const provider = storage();
  const key = await keyFor(userId, { ...input, ...tags }, input.retryOf ?? null);
  const target = await provider.createUploadTarget(key, input.mime, input.size);
  let id: string;
  if (input.retryOf) {
    const [r] = await sql`update uploads set status = 'uploading', error = null, storage_key = ${key}, storage_provider = ${provider.name}, verified_at = null, created_at = now(),
        category = ${tags.category}, moment = coalesce(${tags.moment}, moment), source = coalesce(${tags.source}, source)
      where id = ${input.retryOf} and uploader_id = ${userId} returning id`;
    if (!r) throw new Error("Upload not found");
    id = r.id;
  } else {
    const [r] = await sql`insert into uploads (wedding_id, assignment_id, uploader_id, kind, category, moment, source, camera_markers, filename, size_bytes, mime, storage_key, storage_provider, status)
      values (${input.weddingId}, ${input.assignmentId}, ${userId}, ${input.kind}, ${tags.category}, ${tags.moment}, ${tags.source}, ${!!input.cameraMarkers}, ${input.filename}, ${input.size}, ${input.mime || null}, ${key}, ${provider.name}, 'uploading') returning id`;
    id = r.id;
  }
  return { id, key, target, provider: provider.name };
}

export async function finishUpload(userId: string, id: string, result: { ok: boolean; error?: string; durationSeconds?: number | null }) {
  const [u] = await sql`select kind, wedding_id, storage_key, size_bytes, storage_provider from uploads where id = ${id} and uploader_id = ${userId}`;
  if (!u) throw new Error("Upload not found");
  let ok = result.ok;
  let error = result.error ?? null;
  // Trust but verify: the browser says it finished, so check the file is really there at full size.
  if (ok && u.storage_key && u.storage_provider === storage().name) {
    const v = await storage().verify(u.storage_key, Number(u.size_bytes)).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : "Couldn't confirm the upload" }));
    if (!v.ok) { ok = false; error = v.error ?? "Couldn't confirm the upload"; }
  }
  const status = !ok ? "failed" : u.kind === "video" ? "processing" : "uploaded";
  await sql`update uploads set status = ${status}, error = ${ok ? null : error ?? "Upload failed"}, verified_at = ${ok ? new Date() : null},
      duration_seconds = coalesce(${result.durationSeconds ?? null}, duration_seconds) where id = ${id}`;
  return { status, error: ok ? null : error };
}

export async function batchSummary(userId: string, weddingId: string | null, okCount: number, failCount: number, kind: string) {
  if (!weddingId || okCount + failCount === 0) return;
  const [w] = await sql`select couple from weddings where id = ${weddingId}`;
  await notify(userId, "upload", failCount ? "Upload finished with errors" : "Upload completed",
    `${okCount} ${kind} file${okCount === 1 ? "" : "s"} uploaded for ${w?.couple ?? "your wedding"}${failCount ? `, ${failCount} failed` : ""}.`, `/team/uploads?wedding=${weddingId}`);
}

export async function deleteUpload(userId: string, id: string) {
  await sql`delete from uploads where id = ${id} and uploader_id = ${userId} and status in ('failed','uploading')`;
}

/* ───────────── Tags & markers ───────────── */

/** The uploader, or a coordinator/admin, may edit tags and markers. */
async function editableUpload(user: { id: string; role: string }, id: string) {
  const [u] = await sql`select id, uploader_id, kind, category, moment, source, filename, wedding_id, storage_key, storage_provider, status, duration_seconds from uploads where id = ${id}`;
  if (!u) return null;
  const staff = user.role === "coordinator" || user.role === "admin";
  return staff || u.uploader_id === user.id ? u : null;
}

export async function retagUpload(user: { id: string; role: string }, id: string, input: { moment?: string | null; source?: string | null }) {
  const u = await editableUpload(user, id);
  if (!u) return { ok: false as const, message: "Upload not found." };
  if (u.kind === "document") return { ok: false as const, message: "Documents aren't tagged." };
  let tags;
  try {
    tags = normalizeTags({ kind: u.kind, category: u.category, moment: input.moment === undefined ? u.moment : input.moment, source: input.source === undefined ? u.source : input.source });
  } catch (e) { return { ok: false as const, message: e instanceof Error ? e.message : "Invalid tag" }; }
  let key = u.storage_key as string | null;
  const provider = storage();
  // Keep the Dropbox folder in step with the tag so editors browsing Dropbox see the same thing.
  if (key && provider.readablePaths && u.storage_provider === provider.name && ["uploaded", "processing", "ready"].includes(u.status)) {
    const next = await keyFor(u.uploader_id, { kind: u.kind, category: tags.category, filename: u.filename, weddingId: u.wedding_id, moment: tags.moment, source: tags.source }, u.id);
    if (next.toLowerCase() !== key.toLowerCase()) {
      try { key = await provider.move(key, next); } catch { return { ok: false as const, message: "Couldn't move the file in Dropbox — try again in a minute." }; }
    }
  }
  await sql`update uploads set moment = ${tags.moment}, source = ${tags.source}, category = ${tags.category}, storage_key = ${key} where id = ${id}`;
  return { ok: true as const, message: `Tagged as ${momentLabel(tags.moment)}` };
}

export async function addMarker(user: { id: string; role: string }, uploadId: string, input: { at: number; beat: string; note?: string | null }) {
  const u = await editableUpload(user, uploadId);
  if (!u) return { ok: false as const, message: "Upload not found." };
  if (u.kind !== "video" && u.kind !== "content") return { ok: false as const, message: "Markers are for video, audio and content clips." };
  if (!Number.isInteger(input.at) || input.at < 0) return { ok: false as const, message: "Enter a time like 12:31 or 1:02:45." };
  if (u.duration_seconds && input.at > u.duration_seconds) return { ok: false as const, message: `This clip is only ${Math.floor(u.duration_seconds / 60)}m ${u.duration_seconds % 60}s long.` };
  if (![...MARKER_BEATS, ...MOMENTS].some((b) => b.value === input.beat)) return { ok: false as const, message: "Choose what happens at this point." };
  const [{ n }] = await sql`select count(*)::int as n from upload_markers where upload_id = ${uploadId}`;
  if (n >= 100) return { ok: false as const, message: "That's the maximum number of markers for one file." };
  const [m] = await sql`insert into upload_markers (upload_id, at_seconds, beat, note, created_by) values (${uploadId}, ${input.at}, ${input.beat}, ${input.note?.trim().slice(0, 200) || null}, ${user.id}) returning id`;
  return { ok: true as const, message: `Marker added: ${BEAT_LABEL[input.beat]}`, id: m.id as string };
}

export async function deleteMarker(user: { id: string; role: string }, markerId: string) {
  const [m] = await sql`select upload_id from upload_markers where id = ${markerId}`;
  if (!m || !(await editableUpload(user, m.upload_id))) return { ok: false as const, message: "Marker not found." };
  await sql`delete from upload_markers where id = ${markerId}`;
  return { ok: true as const, message: "Marker removed" };
}

/* ───────────── Coordinator view ───────────── */

export type FootageRow = {
  id: string; kind: "photo" | "video" | "content"; category: string; moment: string | null; source: string | null; camera_markers: boolean; filename: string;
  size_bytes: number; status: string; duration_seconds: number | null; created_at: Date; uploader: string; storage_provider: string | null;
  markers: { id: string; at: number; beat: string; note: string | null }[];
};

/** Every photo/video file for a wedding, with its tags and markers, for the coordinator's footage panel. */
export async function footageForWedding(weddingId: string) {
  return sql<FootageRow[]>`select u.id, u.kind, u.category, u.moment, u.source, u.camera_markers, u.filename, u.size_bytes::float8 as size_bytes, u.status, u.duration_seconds, u.created_at,
      us.full_name as uploader, u.storage_provider,
      coalesce((select json_agg(json_build_object('id', k.id, 'at', k.at_seconds, 'beat', k.beat, 'note', k.note) order by k.at_seconds) from upload_markers k where k.upload_id = u.id), '[]') as markers
    from uploads u join users us on us.id = u.uploader_id
    where u.wedding_id = ${weddingId} and u.kind in ('photo','video','content') and u.status <> 'failed'
    order by u.created_at`;
}

/** Signed download link for staff or the person who uploaded it. */
export async function downloadUrl(user: { id: string; role: string }, id: string) {
  const [u] = await sql`select uploader_id, storage_key, storage_provider, status from uploads where id = ${id}`;
  if (!u || !u.storage_key) return null;
  const staff = user.role === "coordinator" || user.role === "admin";
  if (!staff && u.uploader_id !== user.id) return null;
  if (u.storage_provider !== storage().name) return null;
  return storage().getDownloadUrl(u.storage_key, 3600);
}
