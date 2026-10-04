/** Shared (client + server) check: does free-typed text describe this address suggestion? */
type HitLike = { line1: string | null; name: string | null; kind: "address" | "place" | "street" };

const SUFFIX = /\b(street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|parkway|pkwy|highway|hwy|way|circle|cir|terrace|ter|trail|trl|northeast|northwest|southeast|southwest|north|south|east|west|n|s|e|w|ne|nw|se|sw)\b\.?/g;
const DIR: Record<string, string> = { n: "n", north: "n", s: "s", south: "s", e: "e", east: "e", w: "w", west: "w", ne: "ne", northeast: "ne", nw: "nw", northwest: "nw", se: "se", southeast: "se", sw: "sw", southwest: "sw" };
const dirsOf = (words: string[]) => new Set(words.map((w) => DIR[w]).filter(Boolean));
const norm = (s: string) => s.toLowerCase().replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim();
/** House number + street name, or the place name. */
export function matchesHit(typed: string, h: HitLike) {
  const t = ` ${norm(typed)} `;
  if (h.kind === "place" && h.name && t.includes(` ${norm(h.name)} `)) return true;
  if (!h.line1) return false;
  const [num, ...rest] = norm(h.line1).split(" ");
  if (!/^\d+[a-z]?$/.test(num) || !t.includes(` ${num} `)) return false;
  const core = rest.join(" ").replace(SUFFIX, " ").split(" ").filter((w) => w.length > 1);
  if (!core.length || !core.every((w) => t.includes(` ${w} `) || t.includes(` ${w}`))) return false;
  // "401 S Tryon" must not verify as "401 North Tryon": if a direction was typed, it has to agree
  const typedDirs = dirsOf(t.split(" ")), hitDirs = dirsOf(rest);
  return !typedDirs.size || !hitDirs.size || [...typedDirs].some((d) => hitDirs.has(d));
}
