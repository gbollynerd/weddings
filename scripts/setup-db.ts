/* Runs before `next build` on Vercel: creates the schema and loads demo data the first time. Safe to run repeatedly. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { loadEnv } from "./env";
import { syncHandbook } from "../src/lib/handbook-sync";

loadEnv();
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.warn("⚠ DATABASE_URL not set — skipping database setup"); return; }
  const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", prepare: false, onnotice: () => {}, connect_timeout: 20 });
  try {
    const [{ exists }] = await sql`select to_regclass('public.users') is not null as exists`;
    if (!exists) {
      console.log("◆ Creating schema…");
      await sql.unsafe(readFileSync(join(process.cwd(), "db/schema.sql"), "utf8"));
      await sql.unsafe(readFileSync(join(process.cwd(), "db/rls.sql"), "utf8"));
    } else {
      // apply additive changes idempotently
      await sql.unsafe(readFileSync(join(process.cwd(), "db/schema.sql"), "utf8"));
    }
    const [{ n }] = await sql`select count(*)::int as n from users`;
    if (n > 0) {
      const h = await syncHandbook(sql);
      if (h.added || h.refreshed) console.log(`◆ Handbook: ${h.added} new article(s), ${h.refreshed} refreshed`);
    }
    await sql.end();
    if (n === 0 || process.env.RESEED === "1") {
      console.log("◆ Seeding demo data…");
      execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env: process.env });
    } else console.log(`✓ Database ready (${n} users)`);
  } catch (e) {
    console.error("⚠ Database setup failed:", e instanceof Error ? e.message : e);
    await sql.end().catch(() => {});
    if (process.env.REQUIRE_DB === "1") process.exit(1);
  }
}
main();
