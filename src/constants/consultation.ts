import type { ConsultationType } from '@/types';

/**
 * Consultation type → i18n key suffix under the `search` namespace. Typed as a
 * total Record so adding a ConsultationType without a label is a compile
 * error — dynamic `search.${type}` keys silently rendered the raw key for
 * home_visit before this map existed (P4.T1 Review 005, BLOCKER A1).
 */
export const CONSULTATION_TYPE_KEYS: Record<ConsultationType, string> = {
  in_person: 'inPerson',
  video: 'video',
  home_visit: 'homeVisit',
};
