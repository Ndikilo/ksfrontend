import type { PractitionerSort } from '@/types';

/**
 * "Doctors near you" carousel query (P8.T3).
 *
 * The backend DOES have a distance sort (`sort: 'distance'`), but it 422s
 * unless `lat` + `lng` accompany the request, and this app deliberately ships
 * no location dependency (expo-location is absent from package.json — a new
 * native dep needs a reviewed justification per standard §5). The documented
 * graceful fallback is therefore, in order:
 *
 *   1. city — when a user city is known, narrow with the server-side `city`
 *      contains-match and rank by rating inside that city;
 *   2. top-rated — with no location basis, no location filter at all and the
 *      list is simply the best-rated practitioners.
 *
 * Today NO profile source carries a city (the auth user exposes only
 * identity fields; the patient profile has surname/givenNames/phone/dob/sex),
 * so the runtime input is `null` and branch 2 renders. The city branch is
 * kept here so the fallback flips on the moment a city source lands.
 *
 * Window honesty (standard §7): with no location filter, a successful empty
 * first page IS the full window (the filter is server-side), so an
 * "none yet" empty state is a provable claim, not a window artifact.
 */

export type NearbyQuery = { sort: PractitionerSort; city?: string };

/** True when the fallback has a location basis (drives the honest header). */
export const nearbyHasLocation = (city: string | null | undefined): boolean =>
  city !== null && city !== undefined && city.trim() !== '';

/** The carousel's search query for an optional known city (see header). */
export const nearbyQuery = (city: string | null | undefined): NearbyQuery => {
  const trimmed = city?.trim();
  return trimmed ? { sort: 'rating', city: trimmed } : { sort: 'rating' };
};
