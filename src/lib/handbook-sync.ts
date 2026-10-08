import type postgres from "postgres";
import { HANDBOOK } from "../content/handbook";

/** Built-in articles whose text changed in an update; each set is refreshed once per database, guarded by its flag. */
export const REFRESHES: { flag: string; slugs: string[] }[] = [
  { flag: "handbook_standards_v1", slugs: ["video-cheat-sheet", "footage-standards", "how-to-upload", "file-formats"] },
  { flag: "handbook_freelancers_v1", slugs: ["shooting-standard", "tagging-footage", "how-to-upload"] },
];

/**
 * Brings an existing database's handbook up to date with src/content/handbook.ts without wiping it:
 * adds missing categories and articles, keeps category order in step, and refreshes the few articles
 * whose built-in text changed (once, guarded by an app flag). Runs on every build; safe to repeat.
 */
export async function syncHandbook(sql: postgres.Sql) {
  const refresh = new Set<string>();
  for (const r of REFRESHES) {
    const claimed = await sql`insert into app_flags (key) values (${r.flag}) on conflict do nothing returning key`;
    if (claimed.length) r.slugs.forEach((x) => refresh.add(x));
  }
  let added = 0;
  for (const [ci, c] of HANDBOOK.entries()) {
    const [cat] = await sql`insert into handbook_categories (slug, title, description, icon, sort) values (${c.slug}, ${c.title}, ${c.description}, ${c.icon}, ${ci})
      on conflict (slug) do update set sort = excluded.sort returning id`;
    for (const [ai, a] of c.articles.entries()) {
      const [row] = await sql`insert into handbook_articles (category_id, slug, title, summary, body, audience, read_minutes, sort)
        values (${cat.id}, ${a.slug}, ${a.title}, ${a.summary}, ${a.body}, ${a.audience ?? "all"}, ${a.minutes ?? 3}, ${ai})
        on conflict (slug) do nothing returning id`;
      if (row) added++;
      else if (refresh.has(a.slug))
        await sql`update handbook_articles set title = ${a.title}, summary = ${a.summary}, body = ${a.body}, read_minutes = ${a.minutes ?? 3}, updated_at = now() where slug = ${a.slug}`;
    }
  }
  return { added, refreshed: refresh.size };
}
