import { cn } from "@/lib/utils";
import { parseContract } from "@/lib/contract-fill";

/** Renders agreement text: "## " headings, "- " bullet lists, blank-line paragraphs. */
export function ContractText({ body, className }: { body: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-[13.5px] leading-relaxed text-midnight-700", className)}>
      {parseContract(body).map((b, i) =>
        b.type === "h" ? <h4 key={i} className="pt-2 text-[14px] font-semibold text-ink">{b.text}</h4>
        : b.type === "ul" ? <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((t, k) => <li key={k}>{t}</li>)}</ul>
        : <p key={i}>{b.text}</p>)}
    </div>
  );
}
