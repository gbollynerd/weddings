"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import * as up from "@/lib/services/uploads";
import { parseTimecode } from "@/content/footage";
import type { ActionResult } from "./types";

const refresh = () => { revalidatePath("/team/uploads", "layout"); revalidatePath("/admin/weddings", "layout"); };

/** Change the moment / camera a file is tagged with (uploader or coordinator). */
export async function retagUploadAction(id: string, input: { moment?: string | null; source?: string | null }): Promise<ActionResult> {
  const user = await requireUser(["freelancer", "coordinator", "admin"]);
  const r = await up.retagUpload(user, id, input);
  if (r.ok) refresh();
  return { ok: r.ok, message: r.message };
}

/** Add a timecode marker inside a clip, e.g. vows at 12:31. */
export async function addMarkerAction(uploadId: string, input: { time: string; beat: string; note?: string }): Promise<ActionResult<{ id: string; at: number }>> {
  const user = await requireUser(["freelancer", "coordinator", "admin"]);
  const at = parseTimecode(input.time);
  if (at === null) return { ok: false, message: "Enter a time like 12:31 or 1:02:45.", fieldErrors: { time: "Use mm:ss or h:mm:ss" } };
  const r = await up.addMarker(user, uploadId, { at, beat: input.beat, note: input.note });
  if (r.ok) refresh();
  return r.ok ? { ok: true, message: r.message, data: { id: r.id, at } } : { ok: false, message: r.message };
}

export async function deleteMarkerAction(markerId: string): Promise<ActionResult> {
  const user = await requireUser(["freelancer", "coordinator", "admin"]);
  const r = await up.deleteMarker(user, markerId);
  if (r.ok) refresh();
  return r;
}
