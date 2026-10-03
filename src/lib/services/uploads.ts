import "server-only";
import { sql } from "@/lib/db";
import { storage, storageKey } from "@/lib/storage";
import { notify } from "./notifications";

export async function uploadableWeddings(memberId: string) {
  return sql`select w.id, w.couple, w.wedding_date::text, a.id as assignment_id, a.role, m.city, m.state,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status in ('uploaded','ready','processing'))::int as done,
      (select count(*) from uploads u where u.assignment_id = a.id and u.status = 'failed')::int as failed,
      (select coalesce(sum(size_bytes),0) from uploads u where u.assignment_id = a.id and u.status <> 'failed')::bigint as bytes
    from wedding_assignments a join weddings w on w.id = a.wedding_id join markets m on m.id = w.market_id
    where a.team_member_id = ${memberId} and a.status in ('accepted','completed') and w.wedding_date between current_date - 45 and current_date + 7 and w.status <> 'cancelled'
    order by w.wedding_date desc`;
}

export async function listUploads(userId: string, kind: "photo" | "video", weddingId?: string) {
  // Video "processing" finishes ~2 minutes after upload in the demo pipeline.
  await sql`update uploads set status = 'ready' where uploader_id = ${userId} and status = 'processing' and created_at < now() - interval '2 minutes'`;
  return sql`select u.id, u.wedding_id, u.category, u.filename, u.size_bytes, u.status, u.error, u.duration_seconds, u.created_at, w.couple
    from uploads u left join weddings w on w.id = u.wedding_id
    where u.uploader_id = ${userId} and u.kind = ${kind} ${weddingId ? sql`and u.wedding_id = ${weddingId}` : sql``}
    order by u.created_at desc limit 300`;
}

export async function beginUpload(userId: string, input: { weddingId: string | null; assignmentId: string | null; kind: "photo" | "video" | "document"; category: string; filename: string; size: number; mime: string; retryOf?: string | null }) {
  if (input.assignmentId) {
    const [ok] = await sql`select 1 from wedding_assignments a join team_members t on t.id = a.team_member_id where a.id = ${input.assignmentId} and t.user_id = ${userId}`;
    if (!ok) throw new Error("You're not assigned to this wedding.");
  }
  const key = storageKey(`${input.kind}/${input.weddingId ?? "misc"}`, input.filename);
  const target = await storage().createUploadTarget(key, input.mime);
  let id: string;
  if (input.retryOf) {
    const [r] = await sql`update uploads set status = 'uploading', error = null, storage_key = ${key}, created_at = now() where id = ${input.retryOf} and uploader_id = ${userId} returning id`;
    if (!r) throw new Error("Upload not found");
    id = r.id;
  } else {
    const [r] = await sql`insert into uploads (wedding_id, assignment_id, uploader_id, kind, category, filename, size_bytes, mime, storage_key, status)
      values (${input.weddingId}, ${input.assignmentId}, ${userId}, ${input.kind}, ${input.category}, ${input.filename}, ${input.size}, ${input.mime || null}, ${key}, 'uploading') returning id`;
    id = r.id;
  }
  return { id, key, target, provider: storage().name };
}

export async function finishUpload(userId: string, id: string, result: { ok: boolean; error?: string; durationSeconds?: number | null }) {
  const [u] = await sql`select kind, wedding_id from uploads where id = ${id} and uploader_id = ${userId}`;
  if (!u) throw new Error("Upload not found");
  const status = !result.ok ? "failed" : u.kind === "video" ? "processing" : "uploaded";
  await sql`update uploads set status = ${status}, error = ${result.ok ? null : result.error ?? "Upload failed"}, duration_seconds = coalesce(${result.durationSeconds ?? null}, duration_seconds) where id = ${id}`;
  return status;
}

export async function batchSummary(userId: string, weddingId: string | null, okCount: number, failCount: number, kind: string) {
  if (!weddingId || okCount + failCount === 0) return;
  const [w] = await sql`select couple from weddings where id = ${weddingId}`;
  await notify(userId, "upload", failCount ? "Upload finished with errors" : "Upload completed",
    `${okCount} ${kind} file${okCount === 1 ? "" : "s"} uploaded for ${w?.couple ?? "your wedding"}${failCount ? `, ${failCount} failed` : ""}.`, kind === "video" ? "/team/uploads/video" : "/team/uploads");
}

export async function deleteUpload(userId: string, id: string) {
  await sql`delete from uploads where id = ${id} and uploader_id = ${userId} and status in ('failed','uploading')`;
}
