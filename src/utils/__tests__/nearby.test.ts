import { nearbyHasLocation, nearbyIsDistanceSorted, nearbyQuery } from '../nearby';

/**
 * P8.T3 query rules (Review 014 MAJOR-3): distance sorting requires BOTH lat
 * and lng (the API 422s otherwise — ksbackend search contract), so the query
 * runs exactly one branch — distance from a one-shot device fix, city when
 * known, else top-rated — and the header only claims what the query does.
 */
describe('nearbyQuery (P8.T3 branches)', () => {
  it('with a device fix: distance sort with BOTH coordinates', () => {
    expect(nearbyQuery({ lat: 4.05, lng: 9.7 })).toEqual({
      sort: 'distance',
      lat: 4.05,
      lng: 9.7,
    });
  });

  it('with no fix and no city: top-rated — rating sort, no location filter', () => {
    expect(nearbyQuery(null)).toEqual({ sort: 'rating' });
    expect(nearbyQuery(undefined)).toEqual({ sort: 'rating' });
    expect(nearbyQuery(null, null)).toEqual({ sort: 'rating' });
    expect(nearbyQuery(null, '   ')).toEqual({ sort: 'rating' });
  });

  it('with no fix but a known city: server-side city filter, still rated inside it', () => {
    // A city string can never buy the distance sort — rating remains the rank.
    expect(nearbyQuery(null, 'Douala')).toEqual({ sort: 'rating', city: 'Douala' });
    expect(nearbyQuery(undefined, 'Douala')).toEqual({ sort: 'rating', city: 'Douala' });
  });

  it('trims the city before sending it', () => {
    expect(nearbyQuery(null, '  Douala ')).toEqual({ sort: 'rating', city: 'Douala' });
  });
});

describe('nearbyIsDistanceSorted (drives the honest "near you" header)', () => {
  it('true only when the distance sort carries both coordinates', () => {
    expect(nearbyIsDistanceSorted({ sort: 'distance', lat: 4.05, lng: 9.7 })).toBe(true);
  });

  it('false for every fallback — the header must not claim "near you"', () => {
    expect(nearbyIsDistanceSorted({ sort: 'rating' })).toBe(false);
    expect(nearbyIsDistanceSorted({ sort: 'rating', city: 'Douala' })).toBe(false);
    expect(nearbyIsDistanceSorted({ sort: 'availability' })).toBe(false);
    // A malformed distance query (missing a coordinate) can never claim it.
    expect(nearbyIsDistanceSorted({ sort: 'distance', lat: 4.05 })).toBe(false);
  });
});

describe('nearbyHasLocation (drives the city header)', () => {
  it('false without a usable city', () => {
    expect(nearbyHasLocation(null)).toBe(false);
    expect(nearbyHasLocation(undefined)).toBe(false);
    expect(nearbyHasLocation('  ')).toBe(false);
  });

  it('true with a city', () => {
    expect(nearbyHasLocation('Douala')).toBe(true);
  });
});
