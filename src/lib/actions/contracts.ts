"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { publishTemplate } from "@/lib/services/contracts";
import { CONTRACT_PLACEHOLDERS } from "@/content/contract";
import type { ActionResult } from "./types";

export async function publishContractAction(title: string, body: string, note: string): Promise<ActionResult<{ version: number }>> {
  const u = await requirePermission("wedding:manage");
  const t = title.trim(), b = body.replace(/\r/g, "").trim();
  if (t.length < 3) return { ok: false, message: "Give the agreement a title.", fieldErrors: { title: "Required" } };
  if (b.length < 200) return { ok: false, message: "The agreement text looks too short.", fieldErrors: { body: "Too short" } };
  if (b.length > 40000) return { ok: false, message: "Keep the agreement under 40,000 characters.", fieldErrors: { body: "Too long" } };
  const known = new Set(CONTRACT_PLACEHOLDERS.map(([k]) => k));
  const unknown = [...new Set([...`${t}\n${b}`.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]).filter((k) => !known.has(k)))];
  if (unknown.length) return { ok: false, message: `Unknown placeholder${unknown.length > 1 ? "s" : ""}: ${unknown.map((k) => `{{${k}}}`).join(", ")}`, fieldErrors: { body: "Check placeholders" } };
  const r = await publishTemplate(u.id, t, b, note.trim().slice(0, 300) || null);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath("/admin/contract");
  return { ok: true, message: `Version ${r.version} published — new signatures use it from now on`, data: { version: r.version } };
}
