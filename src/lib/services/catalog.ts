import "server-only";
import { sql, num } from "@/lib/db";

export type Market = { id: string; slug: string; city: string; state: string; state_name: string; country: string; region: string; price_multiplier: number; team_size: number };
export type Package = { id: string; slug: string; service_slug: string; name: string; tagline: string; base_price: number; hours: number; photographers: number; videographers: number; turnaround_days: number; deliverables: string[]; features: string[]; popular: boolean };
export type Addon = { id: string; slug: string; name: string; description: string; price: number; unit: string; applies_to: string[] };

export async function catalog() {
  const [markets, packages, addons, services, venues] = await Promise.all([
    sql`select id, slug, city, state, state_name, country, region, price_multiplier, team_size from markets where active order by state_name, city`,
    sql`select id, slug, service_slug, name, tagline, base_price, hours, photographers, videographers, turnaround_days, deliverables, features, popular from packages where active order by sort`,
    sql`select id, slug, name, description, price, unit, applies_to from addons where active order by sort`,
    sql`select slug, name, tagline, description from services order by sort`,
    sql`select v.id, v.name, v.address, v.kind, m.slug as market from venues v join markets m on m.id = v.market_id order by v.name`,
  ]);
  return {
    markets: markets.map((m) => ({ ...m, price_multiplier: num(m.price_multiplier) })) as unknown as Market[],
    packages: packages as unknown as Package[],
    addons: addons as unknown as Addon[],
    services: services as unknown as { slug: string; name: string; tagline: string; description: string }[],
    venues: venues as unknown as { id: string; name: string; address: string; kind: string; market: string }[],
  };
}

/**
 * Availability for a market/date: compares available team members against weddings already booked.
 * Returns a level the booking UI can show plus nearby open dates as suggestions.
 */
export async function checkAvailability(marketSlug: string, date: string, service: "photo" | "video" | "both" = "photo") {
  const [m] = await sql`select id, team_size, city, state from markets where slug = ${marketSlug}`;
  if (!m) return { level: "unknown" as const, remaining: 0, suggestions: [] as string[] };
  const capacity = async (d: string) => {
    const [r] = await sql`
      select
        (select count(*) from availability av join team_members tm on tm.id = av.team_member_id
          where tm.home_market_id = ${m.id} and av.date = ${d} and av.status = 'available')::int as available,
        (select count(*) from weddings w where w.market_id = ${m.id} and w.wedding_date = ${d} and w.status <> 'cancelled')::int as booked`;
    // Markets have more freelancers than we model in the demo; team_size reflects bookable crews per date.
    const crews = Math.max(r.available, Math.ceil(m.team_size / 2));
    const need = service === "both" ? 2 : 1;
    return Math.max(0, Math.floor(crews / need) - r.booked);
  };
  const remaining = await capacity(date);
  const dow = new Date(date + "T12:00:00").getDay();
  const peak = dow === 6 || dow === 5;
  const level = remaining <= 0 ? "full" : remaining <= (peak ? 2 : 1) ? "limited" : "available";
  const suggestions: string[] = [];
  if (level !== "available") {
    for (const off of [-7, 7, -1, 1, 14, -14]) {
      const d = new Date(date + "T12:00:00");
      d.setDate(d.getDate() + off);
      if (d < new Date()) continue;
      const iso = d.toISOString().slice(0, 10);
      if ((await capacity(iso)) > 1) suggestions.push(iso);
      if (suggestions.length >= 3) break;
    }
  }
  return { level, remaining, suggestions, city: `${m.city}, ${m.state}`, peak };
}
