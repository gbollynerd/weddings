import { currentMember } from "@/lib/services/me";
import { licenses, REQUIRED_DOCS } from "@/lib/services/team";
import { LicensesView } from "./view";

export const metadata = { title: "Licenses" };

export default async function LicensesPage() {
  const { member } = await currentMember();
  const docs = await licenses(member.id);
  const rows = docs.map((d) => ({ id: d.id, doc_type: d.doc_type, label: d.label, file_name: d.file_name, status: d.effective as string, expires_on: d.expires_on, uploaded_at: new Date(d.uploaded_at).toISOString(), reviewed_at: d.reviewed_at ? new Date(d.reviewed_at).toISOString() : null, rejection_reason: d.rejection_reason }));
  const required = REQUIRED_DOCS.map((r) => {
    const mine = rows.filter((x) => x.doc_type === r.type);
    const best = mine.find((x) => x.status === "verified") ?? mine.find((x) => x.status === "expiring_soon") ?? mine.find((x) => x.status === "pending_review") ?? mine[0];
    return { type: r.type, label: r.label, required: r.required, status: best?.status ?? "not_submitted", current: best ?? null };
  });
  return <LicensesView required={required} history={rows} />;
}
