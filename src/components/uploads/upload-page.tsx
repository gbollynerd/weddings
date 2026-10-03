import Link from "next/link";
import { currentMember } from "@/lib/services/me";
import { uploadableWeddings, listUploads } from "@/lib/services/uploads";
import { storage } from "@/lib/storage";
import { UploadCenter } from "./upload-center";
import { LinkTabs } from "@/components/ui";

export async function UploadPage({ kind, weddingParam }: { kind: "photo" | "video"; weddingParam?: string }) {
  const { user, member } = await currentMember();
  const weddings = await uploadableWeddings(member.id);
  const selected = weddings.find((w) => w.id === weddingParam)?.id ?? weddings.find((w) => new Date(w.wedding_date) <= new Date())?.id ?? weddings[0]?.id ?? null;
  const files = selected ? await listUploads(user.id, kind, selected) : [];
  const base = kind === "photo" ? "/team/uploads" : "/team/uploads/video";
  return (
    <div>
      <LinkTabs active={base} tabs={[
        { href: "/team/uploads" + (selected ? `?wedding=${selected}` : ""), label: "Photo uploads" },
        { href: "/team/uploads/video" + (selected ? `?wedding=${selected}` : ""), label: "Video uploads" },
      ].map((t, i) => ({ ...t, href: i === 0 ? (kind === "photo" ? base : t.href) : kind === "video" ? base : t.href }))} />
      <UploadCenter kind={kind} provider={storage().name} selected={selected}
        weddings={weddings.map((w) => ({ id: w.id, couple: w.couple, date: w.wedding_date, assignmentId: w.assignment_id, role: w.role, city: w.city, done: w.done, failed: w.failed, bytes: Number(w.bytes) }))}
        files={files.map((f) => ({ ...f, size_bytes: Number(f.size_bytes), created_at: new Date(f.created_at).toISOString() })) as never} />
      <p className="mt-6 text-[12px] text-muted">Need help? Read <Link className="underline" href="/team/handbook/how-to-upload">How to upload</Link> and the <Link className="underline" href="/team/handbook/48-hour-policy">48-hour policy</Link>.</p>
    </div>
  );
}
