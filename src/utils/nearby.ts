import type { PractitionerSort } from '@/types';

import type { NearbyCoords } from './location';

/**
 * "Doctors near you" carousel query (P8.T3).
 *
 * The backend sorts by distance (`sort: 'distance'`) but 422s unless BOTH
 * `lat` and `lng` accompany the request (ksbackend practitioner search
 * contract: lat must accompany lng, and a distance sort requires the point),
 * so the query runs exactly one of these branches — and the header only ever
 * claims what the query actually does:
 *
 *   1. distance — a one-shot coarse device fix (see `utils/location`) sorts
 *      server-side; the only branch allowed to say "near you";
 *   2. city — when a user city is known, narrow with the server-side `city`
 *      contains-match and rank by rating inside that city (no city source
 *      exists in the MVP yet — kept so the branch flips on the moment one
 *      lands);
 *   3. top-rated — with no location basis, no location filter at all and the
 *      list is simply the best-rated practitioners (permission denied,
 *      location unavailable, or any fix error).
 *
 * Window honesty (standard §7): with no location filter, a successful empty
 * first page IS the full window (the filter is server-side), so a
 * "none yet" empty state is a provable claim, not a window artifact.
 */

export type NearbyQuery = {
  sort: PractitionerSort;
  city?: string;
  lat?: number;
  lng?: number;
};

/** The carousel's search query for an optional device fix / known city. */
export const nearbyQuery = (
  coords: NearbyCoords | null | undefined,
  city?: string | null,
): NearbyQuery => {
  if (coords) return { sort: 'distance', lat: coords.lat, lng: coords.lng };
  const trimmed = city?.trim();
  return trimmed ? { sort: 'rating', city: trimmed } : { sort: 'rating' };
};

/**
 * True when distance sorting is actually in effect — the ONLY basis for a
 * "near you" header (denied / unavailable / error never fake it).
 */
export const nearbyIsDistanceSorted = (query: NearbyQuery): boolean =>
  query.sort === 'distance' && query.lat !== undefined && query.lng !== undefined;

/** True when the city fallback has a location basis (drives its header). */
export const nearbyHasLocation = (city: string | null | undefined): boolean =>
  city !== null && city !== undefined && city.trim() !== '';
