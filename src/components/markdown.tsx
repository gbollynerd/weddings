import * as React from "react";
import { cn } from "@/lib/utils";

/** Tiny, dependency-free Markdown renderer for trusted, coordinator-authored content. */
function inline(text: string, key = 0): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(<a key={k} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{label}</a>);
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("### ")) { blocks.push(<h3 key={k++}>{inline(line.slice(4), k)}</h3>); i++; continue; }
    if (line.startsWith("## ")) { blocks.push(<h2 key={k++}>{inline(line.slice(3), k)}</h2>); i++; continue; }
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) buf.push(lines[i++].slice(2));
      blocks.push(<blockquote key={k++}>{inline(buf.join(" "), k)}</blockquote>);
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={k++} className="overflow-x-auto"><table><thead><tr>{head.map((h, j) => <th key={j}>{inline(h, j)}</th>)}</tr></thead>
          <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, ci)}</td>)}</tr>)}</tbody></table></div>,
      );
      continue;
    }
    if (/^- \[[ x]\] /.test(line)) {
      const items: [boolean, string][] = [];
      while (i < lines.length && /^- \[[ x]\] /.test(lines[i])) { items.push([lines[i][3] === "x", lines[i].slice(6)]); i++; }
      blocks.push(
        <ul key={k++} className="!list-none !pl-0">
          {items.map(([done, t], j) => (
            <li key={j} className="flex items-start gap-2.5">
              <span className={cn("mt-1 grid size-4 shrink-0 place-items-center rounded border", done ? "border-success-500 bg-success-500 text-white" : "border-midnight-200")}>{done ? "✓" : ""}</span>
              <span>{inline(t, j)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^(-|\*) /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(-|\*) /.test(lines[i])) items.push(lines[i++].slice(2));
      blocks.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t, j)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""));
      blocks.push(<ol key={k++}>{items.map((t, j) => <li key={j}>{inline(t, j)}</li>)}</ol>);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|>|\||- |\* |\d+\. )/.test(lines[i])) buf.push(lines[i++]);
    blocks.push(<p key={k++}>{inline(buf.join(" "), k)}</p>);
  }
  return <div className={cn("prose-vw", className)}>{blocks}</div>;
}
