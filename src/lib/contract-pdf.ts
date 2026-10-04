import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { parseContract } from "./contract-fill";

// Standard PDF fonts only cover WinAnsi; map typographic characters and drop anything else.
const MAP: Record<string, string> = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", "≈": "~", " ": " ", "→": "->", "•": "-", "−": "-" };
export function winAnsi(s: string) {
  return s.replace(/[‘’“”–—…≈ →•−]/g, (c) => MAP[c] ?? "")
    .normalize("NFC").replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ]/g, (c) => {
      const base = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return /^[\x20-\x7E]+$/.test(base) ? base : "?";
    });
}

const fmtET = (d: Date | string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "long" }).format(new Date(d));

export type ContractPdfInput = {
  id: string; company: string; title: string; body: string; template_version: number;
  signer_name: string; signer_email: string; signed_at: Date | string; ip: string | null; user_agent: string | null; body_sha256: string;
  status: "active" | "void"; voided_at: Date | string | null; void_reason: string | null;
  approved_at: Date | string | null; approved_by_name: string | null;
};

export async function contractPdf(c: ContractPdfInput) {
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(`${c.title} - ${c.signer_name}`));
  doc.setAuthor(c.company); doc.setCreator(c.company); doc.setSubject(`Contract ${c.id}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 64, maxW = W - M * 2;
  const ink = rgb(0.1, 0.12, 0.2), muted = rgb(0.42, 0.45, 0.52), line = rgb(0.85, 0.86, 0.9);
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const ensure = (h: number) => { if (y - h < M + 24) newPage(); };
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of winAnsi(text).split("\n")) {
      let cur = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = cur ? `${cur} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) <= width) { cur = next; continue; }
        if (cur) out.push(cur);
        // break very long tokens (URLs, hashes)
        let w = word;
        while (f.widthOfTextAtSize(w, size) > width) {
          let i = w.length - 1;
          while (i > 1 && f.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
          out.push(w.slice(0, i)); w = w.slice(i);
        }
        cur = w;
      }
      out.push(cur);
    }
    return out;
  };
  const text = (s: string, opts: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number; lead?: number } = {}) => {
    const f = opts.f ?? font, size = opts.size ?? 10.5, lead = opts.lead ?? size * 1.45, indent = opts.indent ?? 0;
    for (const l of wrap(s, f, size, maxW - indent)) {
      ensure(lead);
      page.drawText(l, { x: M + indent, y: y - size, size, font: f, color: opts.color ?? ink });
      y -= lead;
    }
    y -= opts.gap ?? 0;
  };
  const rule = (gap = 10) => { ensure(gap * 2); y -= gap; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: line }); y -= gap; };

  // Header
  text(c.company.toUpperCase(), { f: bold, size: 9, color: muted, gap: 6 });
  text(c.title, { f: bold, size: 18, gap: 4 });
  text(`Contract ${c.id} · Template version ${c.template_version}`, { size: 8.5, color: muted });
  if (c.status === "void") text(`VOID${c.voided_at ? ` since ${fmtET(c.voided_at)}` : ""}${c.void_reason ? ` - ${c.void_reason}` : ""}. Kept for the record; no longer in effect.`, { f: bold, size: 9.5, color: rgb(0.7, 0.15, 0.15) });
  rule(12);

  // Body: headings, bullet lists and paragraphs
  for (const block of parseContract(c.body)) {
    if (block.type === "h") {
      ensure(44); y -= 6;
      text(block.text, { f: bold, size: 12, gap: 3 });
    } else if (block.type === "ul") {
      for (const item of block.items) {
        ensure(16);
        page.drawText("-", { x: M + 3, y: y - 10.5, size: 10.5, font, color: muted });
        text(item, { indent: 14 });
      }
      y -= 6;
    } else text(block.text, { gap: 8 });
  }

  // Signature + audit trail
  ensure(170);
  rule(14);
  text("Electronic signature", { f: bold, size: 12, gap: 6 });
  text(c.signer_name, { f: bold, size: 16, gap: 2 });
  text(`Signed by ${c.signer_name} (${c.signer_email}) on ${fmtET(c.signed_at)} by typing their full name and confirming they agree to these terms.`, { size: 9.5, gap: 8 });
  text("Company approval", { f: bold, size: 12, gap: 4 });
  text(c.approved_at ? `Approved for the wedding by ${c.approved_by_name ?? "a coordinator"} on ${fmtET(c.approved_at)}.` : c.status === "void" ? "Not in effect." : "Awaiting coordinator approval. This Agreement takes effect once approved.", { size: 9.5, gap: 10 });
  text("Audit trail", { f: bold, size: 9, color: muted, gap: 2 });
  for (const s of [`Contract ID: ${c.id}`, `IP address: ${c.ip ?? "not recorded"}`, `Device: ${c.user_agent ?? "not recorded"}`, `SHA-256: ${c.body_sha256}`])
    text(s, { size: 8, color: muted, lead: 11 });

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const s = winAnsi(`${c.company} · ${c.signer_name} · Page ${i + 1} of ${pages.length}`);
    p.drawText(s, { x: M, y: M - 28, size: 8, font, color: muted });
  });
  return doc.save();
}
