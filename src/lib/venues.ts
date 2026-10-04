// Ceremony and reception locations for a wedding. Shared by server pages and client components.

export type Place = { venue: string; address: string | null; area: string | null };
export type WeddingPlaces = { same: boolean; ceremony: Place; reception: Place };

type Row = {
  venue_name: string; venue_address?: string | null; ceremony_location?: string | null; reception_location?: string | null;
  reception_venue_name?: string | null; reception_venue_address?: string | null;
};

/** Older bookings stored "Venue — area"; show just the area when it repeats the venue name. */
export function areaOf(raw: string | null | undefined, venue: string) {
  const v = (raw ?? "").trim();
  if (!v) return null;
  for (const sep of [" — ", " - ", ", "]) if (v.toLowerCase().startsWith((venue + sep).toLowerCase())) return v.slice(venue.length + sep.length).trim() || null;
  return v.toLowerCase() === venue.toLowerCase() ? null : v;
}

export function weddingPlaces(w: Row): WeddingPlaces {
  const same = !w.reception_venue_name;
  const ceremony = { venue: w.venue_name, address: w.venue_address ?? null, area: areaOf(w.ceremony_location, w.venue_name) };
  const rVenue = w.reception_venue_name || w.venue_name;
  const reception = { venue: rVenue, address: same ? ceremony.address : w.reception_venue_address ?? null, area: areaOf(w.reception_location, rVenue) };
  return { same, ceremony, reception };
}

/** "Willow Creek Estate · Garden lawn" */
export const placeLine = (p: Place) => (p.area ? `${p.venue} · ${p.area}` : p.venue);
