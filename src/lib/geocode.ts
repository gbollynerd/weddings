import "server-only";

/**
 * Address search + verification, proxied through our server so results are cached,
 * rate-limited, and the provider can be swapped (e.g. for Google Places) in one place.
 * Provider: Photon (OpenStreetMap data), https://photon.komoot.io — free, no key.
 */
export type AddressHit = {
  label: string;            // "8800 Willow Creek Rd, Charlotte, NC 28277"
  line1: string | null;     // "8800 Willow Creek Rd"
  name: string | null;      // place name for venues/POIs
  city: string | null; state: string | null; postcode: string | null;
  lat: number; lon: number;
  kind: "address" | "place" | "street";
};

const STATES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "Puerto Rico": "PR",
};
const PLACE_KEYS = new Set(["amenity", "tourism", "leisure", "building", "shop", "historic", "club", "craft", "office"]);

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> };

export function toHit(f: PhotonFeature): AddressHit | null {
  const p = f.properties ?? {};
  const [lon, lat] = f.geometry?.coordinates ?? [];
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (p.countrycode && p.countrycode.toUpperCase() !== "US") return null;
  const street = p.street ?? (p.osm_key === "highway" ? p.name : undefined);
  const line1 = p.housenumber && street ? `${p.housenumber} ${street}` : street ?? null;
  const isPlace = !!p.name && !!p.osm_key && PLACE_KEYS.has(p.osm_key);
  const kind: AddressHit["kind"] | null = p.housenumber ? "address" : isPlace ? "place" : p.osm_key === "highway" || p.type === "street" ? "street" : null;
  if (!kind) return null; // cities, counties, countries… aren't addresses
  const city = p.city ?? p.town ?? p.village ?? p.district ?? p.county ?? null;
  const state = p.state ? STATES[p.state] ?? p.state : null;
  const name = isPlace && p.name !== line1 ? p.name! : null;
  const tail = [state, p.postcode].filter(Boolean).join(" ");
  const label = [name, line1, city, tail].filter(Boolean).join(", ");
  return { label, line1, name, city, state, postcode: p.postcode ?? null, lat, lon, kind };
}

const cache = new Map<string, { at: number; hits: AddressHit[] }>();
const TTL = 24 * 3600_000;

export async function searchAddresses(q: string): Promise<{ ok: true; hits: AddressHit[] } | { ok: false }> {
  const key = q.trim().toLowerCase().replace(/\s+/g, " ");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { ok: true, hits: hit.hits };
  const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q: key, limit: "8", lang: "en", bbox: "-180,17,-64,72" })}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "VisualWeddings/1.0 (venue address lookup)" }, signal: AbortSignal.timeout(4500), cache: "no-store" });
    if (!r.ok) return { ok: false };
    const data = (await r.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const hits = (data.features ?? []).map(toHit).filter((h): h is AddressHit => !!h && !seen.has(h.label) && !!seen.add(h.label))
      .sort((a, b) => rank(a) - rank(b)).slice(0, 5);
    if (cache.size > 1000) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), hits });
    return { ok: true, hits };
  } catch {
    return { ok: false };
  }
}
const rank = (h: AddressHit) => (h.kind === "address" ? 0 : h.kind === "place" ? 1 : 2);
