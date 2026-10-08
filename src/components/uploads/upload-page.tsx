import Link from "next/link";
import { requireActiveMember } from "@/lib/services/me";
import { uploadableWeddings, listUploads } from "@/lib/services/uploads";
import { storage } from "@/lib/storage";
import { skillForRole } from "@/lib/skills";
import { UploadCenter } from "./upload-center";

/**
 * One Uploads page for every freelancer. The weddings list shows each job with the person's role on it;
 * what they upload for the selected wedding (photos, video/audio or content) follows that role.
 */
export async function UploadPage({ weddingParam }: { weddingParam?: string }) {
  const { user, member } = await requireActiveMember();
  const weddings = await uploadableWeddings(member.id);
  const selected = weddings.find((w) => w.id === weddingParam) ?? weddings.find((w) => new Date(w.wedding_date) <= new Date()) ?? weddings[0] ?? null;
  const kind = selected ? skillForRole(selected.role) : member.skills[0] ?? "photo";
  const files = selected ? await listUploads(user.id, kind, selected.id) : [];
  return (
    <div>
      {/* Remount when the kind of work changes so tags and folders reset for that role */}
      <UploadCenter key={kind} kind={kind} provider={storage().name} providerLabel={storage().label} selected={selected?.id ?? null}
        weddings={weddings.map((w) => ({ id: w.id, couple: w.couple, date: w.wedding_date, assignmentId: w.assignment_id, role: w.role, city: w.city, done: w.done, failed: w.failed, untagged: w.untagged, bytes: Number(w.bytes) }))}
        files={files.map((f) => ({ ...f, size_bytes: Number(f.size_bytes), created_at: new Date(f.created_at).toISOString() })) as never} />
      <p className="mt-6 text-[12px] text-muted">Need help? Read <Link className="underline" href="/team/handbook/how-to-upload">How to upload</Link>, <Link className="underline" href="/team/handbook/tagging-footage">Tagging footage</Link> and the <Link className="underline" href="/team/handbook/48-hour-policy">48-hour policy</Link>.</p>
    </div>
  );
}
