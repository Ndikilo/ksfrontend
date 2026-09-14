import type { CursorPage, Language, Profession } from '@/types';

import { http } from '../client';
import { endpoints } from '../endpoints';

/** Reference data (`/v1/professions`, `/v1/languages`) — cursor-paginated. */
export const referenceService = {
  professions: (params?: { limit?: number; cursor?: string }) =>
    http.get<CursorPage<Profession>>(endpoints.reference.professions, { params }),

  languages: (params?: { limit?: number; cursor?: string }) =>
    http.get<CursorPage<Language>>(endpoints.reference.languages, { params }),
};
