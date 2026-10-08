import { nearbyHasLocation, nearbyQuery } from '../nearby';

/**
 * P8.T3 fallback rules: no location dependency ships with the app, so the
 * carousel query degrades to city-when-known, else top-rated (rating sort,
 * no location filter).
 */
describe('nearbyQuery (P8.T3 graceful fallback)', () => {
  it('with no city at all: top-rated — rating sort, no location filter', () => {
    expect(nearbyQuery(null)).toEqual({ sort: 'rating' });
    expect(nearbyQuery(undefined)).toEqual({ sort: 'rating' });
    expect(nearbyQuery('   ')).toEqual({ sort: 'rating' });
  });

  it('with a known city: server-side city filter, still rated inside it', () => {
    // Distance sort needs lat+lng (backend 422s otherwise) — a city string
    // can never buy the distance sort, so rating remains the rank.
    expect(nearbyQuery('Douala')).toEqual({ sort: 'rating', city: 'Douala' });
  });

  it('trims the city before sending it', () => {
    expect(nearbyQuery('  Douala ')).toEqual({ sort: 'rating', city: 'Douala' });
  });
});

describe('nearbyHasLocation (drives the honest section header)', () => {
  it('false without a usable city — the header must not claim "near you"', () => {
    expect(nearbyHasLocation(null)).toBe(false);
    expect(nearbyHasLocation(undefined)).toBe(false);
    expect(nearbyHasLocation('  ')).toBe(false);
  });

  it('true with a city', () => {
    expect(nearbyHasLocation('Douala')).toBe(true);
  });
});
