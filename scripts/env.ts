import { existsSync, readFileSync } from "node:fs";
export function loadEnv() {
  for (const f of [".env.local", process.env.NODE_ENV === "production" || process.env.VERCEL ? ".env.production" : "", ".env"].filter(Boolean)) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
