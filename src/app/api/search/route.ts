import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isTeam } from "@/lib/permissions";

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ hits: [] }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const like = `%${q}%`;
  const hits: { type: string; title: string; sub?: string; href: string }[] = [];
  if (isTeam(user.role)) {
    const w = await sql`select distinct w.id, w.couple, w.wedding_date::text, w.venue_name from weddings w join wedding_assignments a on a.wedding_id = w.id
      join team_members t on t.id = a.team_member_id where t.user_id = ${user.id} and (w.couple ilike ${like} or w.venue_name ilike ${like}) limit 6`;
    hits.push(...w.map((r) => ({ type: "wedding", title: r.couple, sub: `${r.wedding_date} · ${r.venue_name}`, href: `/team/weddings/${r.id}` })));
    const a = await sql`select slug, title, summary from handbook_articles where title ilike ${like} or body ilike ${like} limit 6`;
    hits.push(...a.map((r) => ({ type: "article", title: r.title, sub: r.summary, href: `/team/handbook/${r.slug}` })));
  } else if (user.role === "client") {
    const w = await sql`select w.id, w.couple, w.venue_name from weddings w join clients c on c.id = w.client_id where c.user_id = ${user.id} and (w.couple ilike ${like} or w.venue_name ilike ${like})`;
    hits.push(...w.map((r) => ({ type: "wedding", title: r.couple, sub: r.venue_name, href: `/client` })));
  } else {
    const w = await sql`select w.id, w.couple, w.wedding_date::text, w.venue_name from weddings w where w.couple ilike ${like} or w.venue_name ilike ${like} limit 8`;
    hits.push(...w.map((r) => ({ type: "wedding", title: r.couple, sub: `${r.wedding_date} · ${r.venue_name}`, href: `/admin#bookings` })));
  }
  const base = user.role === "client" ? "/client" : isTeam(user.role) ? "/team" : "/admin";
  const c = await sql`select c.id, c.subject from conversations c join conversation_participants p on p.conversation_id = c.id
    where p.user_id = ${user.id} and (c.subject ilike ${like} or exists (select 1 from messages m where m.conversation_id = c.id and m.body ilike ${like})) limit 5`;
  hits.push(...c.map((r) => ({ type: "conversation", title: r.subject, sub: "Conversation", href: `${base}/messages?c=${r.id}` })));
  return NextResponse.json({ hits });
}
