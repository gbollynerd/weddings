/**
 * Straight-line ("as the crow flies") distance between a team member's home base and a venue.
 * Coordinates come from geocoding the saved addresses; when an address hasn't been geocoded yet
 * we fall back to the centre of the market (city) it belongs to, and say so.
 */
export type LatLng = { lat: number; lng: number };

// City centres for each market slug (used when an address hasn't been geocoded).
export const MARKET_CENTERS: Record<string, LatLng> = {
  "charlotte-nc": { lat: 35.2271, lng: -80.8431 }, "raleigh-durham-nc": { lat: 35.8992, lng: -78.8636 }, "greensboro-nc": { lat: 36.0726, lng: -79.792 },
  "asheville-nc": { lat: 35.5951, lng: -82.5515 }, "wilmington-nc": { lat: 34.2257, lng: -77.9447 }, "charleston-sc": { lat: 32.7765, lng: -79.9311 },
  "atlanta-ga": { lat: 33.749, lng: -84.388 }, "nashville-tn": { lat: 36.1627, lng: -86.7816 }, "huntsville-al": { lat: 34.7304, lng: -86.5861 },
  "birmingham-al": { lat: 33.5186, lng: -86.8104 }, "richmond-va": { lat: 37.5407, lng: -77.436 }, "washington-dc": { lat: 38.9072, lng: -77.0369 },
  "baltimore-md": { lat: 39.2904, lng: -76.6122 }, "philadelphia-pa": { lat: 39.9526, lng: -75.1652 }, "new-york-ny": { lat: 40.7128, lng: -74.006 },
  "boston-ma": { lat: 42.3601, lng: -71.0589 }, "chicago-il": { lat: 41.8781, lng: -87.6298 }, "minneapolis-mn": { lat: 44.9778, lng: -93.265 },
  "austin-tx": { lat: 30.2672, lng: -97.7431 }, "dallas-tx": { lat: 32.7767, lng: -96.797 }, "houston-tx": { lat: 29.7604, lng: -95.3698 },
  "miami-fl": { lat: 25.7617, lng: -80.1918 }, "orlando-fl": { lat: 28.5383, lng: -81.3792 }, "tampa-fl": { lat: 27.9506, lng: -82.4572 },
  "denver-co": { lat: 39.7392, lng: -104.9903 }, "phoenix-az": { lat: 33.4484, lng: -112.074 }, "los-angeles-ca": { lat: 34.0522, lng: -118.2437 },
  "san-francisco-ca": { lat: 37.7749, lng: -122.4194 }, "san-diego-ca": { lat: 32.7157, lng: -117.1611 }, "seattle-wa": { lat: 47.6062, lng: -122.3321 },
};

/** Great-circle distance in miles (haversine). */
export function haversineMiles(a: LatLng, b: LatLng) {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const point = (lat: unknown, lng: unknown): LatLng | null =>
  lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? { lat: Number(lat), lng: Number(lng) } : null;

export type Distance = {
  miles: number;            // rounded to whole miles
  exact: boolean;           // both ends were geocoded addresses (otherwise a city-centre estimate)
  from: "home" | "market";  // what the origin was
};

/**
 * Distance from a team member to a wedding venue.
 * member: their geocoded home (lat/lng) and/or home market slug
 * venue:  geocoded venue lat/lng and/or the wedding's market slug
 */
export function distanceTo(
  member: { lat?: unknown; lng?: unknown; market_slug?: string | null },
  venue: { lat?: unknown; lng?: unknown; market_slug?: string | null },
): Distance | null {
  const home = point(member.lat, member.lng);
  const origin = home ?? (member.market_slug ? MARKET_CENTERS[member.market_slug] : null);
  const v = point(venue.lat, venue.lng);
  const dest = v ?? (venue.market_slug ? MARKET_CENTERS[venue.market_slug] : null);
  if (!origin || !dest) return null;
  return { miles: Math.round(haversineMiles(origin, dest)), exact: !!home && !!v, from: home ? "home" : "market" };
}

/** "≈ 42 mi" — always approximate: straight-line, not driving distance. */
export const milesLabel = (d: { miles: number } | number | null | undefined) => {
  const m = typeof d === "number" ? d : d?.miles;
  return m == null ? "—" : m < 1 ? "< 1 mi" : `≈ ${m.toLocaleString("en-US")} mi`;
};

/** Mileage paid on straight-line miles beyond the first 100 (one-way), at the IRS-style rate. */
export const MILEAGE_FREE_MILES = 100;
export const MILEAGE_RATE = 0.67;
export const mileagePay = (miles: number | null | undefined) => (miles && miles > MILEAGE_FREE_MILES ? Math.round((miles - MILEAGE_FREE_MILES) * MILEAGE_RATE) : 0);
/** Weddings this far away are flagged as long-distance for the coordinator. */
export const LONG_DISTANCE_MILES = 300;

export function nearestMarket(p: LatLng) {
  let best: { slug: string; miles: number } | null = null;
  for (const [slug, c] of Object.entries(MARKET_CENTERS)) {
    const miles = haversineMiles(p, c);
    if (!best || miles < best.miles) best = { slug, miles };
  }
  return best;
}
