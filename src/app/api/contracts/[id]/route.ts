import { getSession } from "@/lib/auth";
import { contractForDownload, COMPANY } from "@/lib/services/contracts";
import { contractPdf } from "@/lib/contract-pdf";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return new Response("Sign in to download this contract.", { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const c = await contractForDownload(id, user);
  if (!c) return new Response("Not found", { status: 404 });
  const bytes = await contractPdf({ ...c, company: COMPANY } as never);
  const slug = `${c.couple}-${c.wedding_date_s}-${c.signer_name}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Contract-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
