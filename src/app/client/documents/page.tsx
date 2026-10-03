import { FileText } from "lucide-react";
import { currentClient } from "@/lib/services/me-client";
import { Card, EmptyState, ButtonLink } from "@/components/ui";
import { DocumentsView } from "./view";

export const metadata = { title: "Documents & Gallery" };

export default async function ClientDocuments() {
  const { booking: b } = await currentClient();
  if (!b) return <Card><EmptyState icon={FileText} title="No documents yet" action={<ButtonLink href="/book">Book your wedding</ButtonLink>} /></Card>;
  return <DocumentsView couple={b.couple} weddingDate={b.wedding_date} turnaroundWeeks={Math.round(b.turnaround_days / 7)}
    documents={b.documents.map((d) => ({ id: d.id, type: d.type, title: d.title, content: d.content ?? "", created_at: new Date(d.created_at).toISOString() }))}
    deliverables={b.deliverables.map((d) => ({ id: d.id, filename: d.filename, size: Number(d.size_bytes), created_at: new Date(d.created_at).toISOString() }))} />;
}
