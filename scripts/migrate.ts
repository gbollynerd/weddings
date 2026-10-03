import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { loadEnv } from "./env";

loadEnv();
const url = process.env.DATABASE_URL!;
const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", prepare: false, onnotice: () => {} });

async function main() {
  if (process.argv.includes("--reset")) {
    console.log("↺ Dropping public schema objects…");
    await sql.unsafe(`drop schema public cascade; create schema public; grant all on schema public to postgres; grant all on schema public to public;`);
  }
  const schema = readFileSync(join(process.cwd(), "db/schema.sql"), "utf8");
  await sql.unsafe(schema);
  const rls = readFileSync(join(process.cwd(), "db/rls.sql"), "utf8");
  await sql.unsafe(rls);
  console.log("✓ Schema applied");
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
