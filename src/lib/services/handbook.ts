import "server-only";
import { sql } from "@/lib/db";

export type Article = { id: string; slug: string; title: string; summary: string | null; body: string; audience: string; read_minutes: number; updated_at: Date; category_slug: string; category_title: string };

export async function handbookTree() {
  const [cats, arts] = await Promise.all([
    sql`select id, slug, title, description, icon, sort from handbook_categories order by sort`,
    sql`select a.slug, a.title, a.summary, a.audience, a.read_minutes, a.category_id, a.updated_at from handbook_articles a order by a.sort`,
  ]);
  return cats.map((c) => ({ ...c, articles: arts.filter((a) => a.category_id === c.id) })) as unknown as {
    id: string; slug: string; title: string; description: string; icon: string; articles: { slug: string; title: string; summary: string; audience: string; read_minutes: number; updated_at: Date }[];
  }[];
}

export async function article(slug: string) {
  const [a] = await sql<Article[]>`select a.*, c.slug as category_slug, c.title as category_title from handbook_articles a join handbook_categories c on c.id = a.category_id where a.slug = ${slug}`;
  return a ?? null;
}
