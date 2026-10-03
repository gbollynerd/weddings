"use client";
import * as React from "react";
import { FileText, FileSignature, Receipt, Sparkles, Images, Download, Clock, Lock } from "lucide-react";
import { Card, CardHeader, CardBody, Button, EmptyState, Badge } from "@/components/ui";
import { Modal, useToast } from "@/components/ui/interactive";
import { Markdown } from "@/components/markdown";
import { fmtDate, bytes, daysUntil } from "@/lib/utils";
import { IMG, unsplash } from "@/content/catalog";

const ICON: Record<string, typeof FileText> = { contract: FileSignature, invoice: Receipt, special_requests: Sparkles };
type Doc = { id: string; type: string; title: string; content: string; created_at: string };
export function DocumentsView({ documents, deliverables, couple, weddingDate, turnaroundWeeks }: { documents: Doc[]; deliverables: { id: string; filename: string; size: number; created_at: string }[]; couple: string; weddingDate: string; turnaroundWeeks: number }) {
  const toast = useToast();
  const [open, setOpen] = React.useState<Doc | null>(null);
  const d = daysUntil(weddingDate);
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader title="Your gallery & films" subtitle={deliverables.length ? "Delivered and ready to download" : d >= 0 ? `Arrives about ${turnaroundWeeks} weeks after your wedding` : "Your team is editing — we'll notify you the moment it's ready"} />
        <CardBody>
          {deliverables.length ? (
            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div className="grid grid-cols-3 gap-2">{[IMG.lakeside, IMG.rings, IMG.handsHeld, IMG.bouquetHold, IMG.veilBW, IMG.tables].map((id) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={id} src={unsplash(id, 300, 300)} alt="" className="aspect-square rounded-xl object-cover" />)}</div>
              <ul className="space-y-2">{deliverables.map((x) => <li key={x.id} className="flex items-center gap-3 rounded-2xl border border-line p-3"><Images className="size-5 text-midnight-500" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{x.filename}</span><span className="text-[12px] text-muted">{bytes(x.size)} · {fmtDate(x.created_at)}</span></span><Button size="sm" variant="outline" icon={Download} onClick={() => toast({ tone: "info", title: "Download started", body: "Demo storage — connect Supabase Storage to serve real files." })}>Download</Button></li>)}</ul>
            </div>
          ) : (
            <EmptyState icon={d >= 0 ? Clock : Images} title={d >= 0 ? `${couple}'s gallery` : "Editing in progress"} description={d >= 0 ? "A 48-hour sneak peek arrives right after your wedding, followed by your full gallery." : "Our editors are working on your photos and film."} className="py-8" />
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Documents" />
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => {
              const I = ICON[doc.type] ?? FileText;
              return (
                <li key={doc.id}><button onClick={() => setOpen(doc)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left transition hover:bg-canvas">
                  <span className="grid size-10 place-items-center rounded-xl bg-midnight-50 text-midnight-600"><I className="size-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink">{doc.title}</span><span className="text-[12px] text-muted">Added {fmtDate(doc.created_at)}</span></span>
                  {doc.type === "contract" && <Badge tone="success">Signed</Badge>}
                </button></li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-[12px] text-muted"><Lock className="size-3.5" />Documents are private to you and your coordinator.</p>
        </CardBody>
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title} size="lg" footer={<><Button variant="outline" icon={Download} onClick={() => window.print()}>Print / save PDF</Button><Button onClick={() => setOpen(null)}>Close</Button></>}>
        {open && <Markdown source={open.content.replace(/Total (\d+)/, (_, n) => `Total $${Number(n).toLocaleString()}`).replace(/Paid today (\d+)/, (_, n) => `Paid today $${Number(n).toLocaleString()}`)} />}
      </Modal>
    </div>
  );
}
