import { requireUser } from "@/lib/auth";
import { activeTemplate, templateHistory } from "@/lib/services/contracts";
import { CONTRACT_PLACEHOLDERS } from "@/content/contract";
import { ContractEditor } from "./editor";

export const metadata = { title: "Contract terms" };

export default async function ContractPage() {
  await requireUser(["coordinator", "admin"]);
  const [t, history] = await Promise.all([activeTemplate(), templateHistory()]);
  return (
    <div>
      <p className="mb-6 max-w-3xl text-sm text-muted">The independent contractor agreement photographers and videographers sign before taking a wedding. Each signature keeps a frozen copy, so edits only apply to future signatures.</p>
      <ContractEditor
        current={{ version: t.version, title: t.title, body: t.body, created_at: new Date(t.created_at).toISOString(), created_by_name: t.created_by_name }}
        placeholders={CONTRACT_PLACEHOLDERS}
        history={history.map((h) => ({ version: h.version, title: h.title, change_note: h.change_note, created_at: new Date(h.created_at).toISOString(), created_by_name: h.created_by_name, signed: h.signed }))} />
    </div>
  );
}
