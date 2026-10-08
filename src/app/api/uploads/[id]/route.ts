import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { downloadUrl } from "@/lib/services/uploads";

/** Redirects staff (or the uploader) to a short-lived download link from storage. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = await downloadUrl(user, id);
  if (!url) return NextResponse.json({ error: "This file isn't available for download (demo storage or no access)." }, { status: 404 });
  return NextResponse.redirect(url, 302);
}
