import * as Location from 'expo-location';

/**
 * Location permission + one-shot fix seam for the "Doctors near you" carousel
 * (P8.T3). expo-location is the ONLY new native dependency (justified in
 * review against standard §5); every call here is failure-tolerant by design:
 * the seam RESOLVES to a benign outcome instead of throwing, so a GPS or
 * provider error can never break the section that asked for it — the screen
 * stays try/catch-free (same shape as `api/netState` for connectivity).
 *
 * Honesty rules (P8.T3): the permission ASK is contextual — bound to an
 * explicit "Near me" affordance, never fired at cold launch; the fix is
 * ONE-SHOT coarse (`Accuracy.Balanced`) — no watcher, no continuous tracking.
 */

/** A coarse device fix, enough to sort discovery by distance. */
export type NearbyCoords = { lat: number; lng: number };

/**
 * Normalized permission outcome. `undetermined` = the OS has never asked, so a
 * contextual ask can still succeed; `denied` = a definitive no (a re-ask would
 * resolve instantly without a prompt — a dead affordance).
 */
export type LocationPermissionOutcome = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** Silent permission check — NEVER triggers the OS prompt. */
export const getLocationPermission = async (): Promise<LocationPermissionOutcome> => {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied' && !canAskAgain) return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
};

/**
 * The contextual ask — call ONLY from a user affordance tap (the home
 * "Near me" chip), never from a mount/focus effect.
 */
export const requestLocationPermission = async (): Promise<LocationPermissionOutcome> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
};

/**
 * ONE-SHOT coarse position fix (`Accuracy.Balanced`). Any failure — provider
 * off, timeout, mock denied — resolves `null`, which the caller maps to the
 * documented top-rated fallback (never an error surface).
 */
export const getCurrentCoordsOnce = async (): Promise<NearbyCoords | null> => {
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: coords.latitude, lng: coords.longitude };
  } catch {
    return null;
  }
};
