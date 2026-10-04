/** Fill contract placeholders. Pure — used on the server when signing and in the coordinator's preview. */
import { ROLE_LABEL, money } from "@/lib/pricing";
import { fmtLong, fmtTime } from "@/lib/utils";
import { MILEAGE_FREE_MILES, MILEAGE_RATE, mileagePay } from "@/lib/geo";

export const COMPANY = "Visual Weddings";

export type ContractContext = {
  contractor_name: string; contractor_email: string; discipline: "photo" | "video";
  role: string; couple: string; wedding_date: string; venue: string; city: string; call_time: string | null; coverage_hours: number; compensation: number; miles: number | null;
};

export function mileageText(miles: number | null) {
  if (miles == null) return `Mileage is paid at $${MILEAGE_RATE.toFixed(2)} per mile beyond the first ${MILEAGE_FREE_MILES} miles, using the straight-line distance from the Contractor's home base.`;
  const pay = mileagePay(miles);
  const about = miles < 1 ? "Less than a mile" : `About ${miles} miles`;
  return pay > 0
    ? `${about} from the Contractor's home base (straight line). Mileage of ${money(pay)} is paid for the miles beyond the first ${MILEAGE_FREE_MILES}, at $${MILEAGE_RATE.toFixed(2)} per mile.`
    : `${about} from the Contractor's home base (straight line). No mileage is paid for the first ${MILEAGE_FREE_MILES} miles.`;
}

export function fillTemplate(text: string, c: ContractContext) {
  const values: Record<string, string> = {
    company: COMPANY,
    contractor_name: c.contractor_name, contractor_email: c.contractor_email,
    discipline: c.discipline === "photo" ? "photographer" : "videographer",
    role: ROLE_LABEL[c.role] ?? c.role, couple: c.couple, wedding_date: fmtLong(c.wedding_date), venue: c.venue, city: c.city,
    call_time: c.call_time ? fmtTime(c.call_time) : "to be confirmed", coverage_hours: String(c.coverage_hours), compensation: money(c.compensation),
    mileage: mileageText(c.miles),
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => values[k] ?? m);
}


export type ContractBlock = { type: "h"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };
/** Split agreement text into headings ("## "), bullet lists ("- ") and paragraphs (blank-line separated). */
export function parseContract(body: string): ContractBlock[] {
  const out: ContractBlock[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push({ type: "p", text: para.join(" ") }); para = []; } };
  for (const raw of body.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^#{1,3}\s+/.test(line)) { flush(); out.push({ type: "h", text: line.replace(/^#{1,3}\s+/, "") }); continue; }
    if (/^[-*]\s+/.test(line)) {
      flush();
      const last = out[out.length - 1];
      const item = line.replace(/^[-*]\s+/, "");
      if (last?.type === "ul") last.items.push(item); else out.push({ type: "ul", items: [item] });
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}
