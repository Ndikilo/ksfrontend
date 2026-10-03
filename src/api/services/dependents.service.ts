import type { CursorPage, Dependent } from '@/types';

import { http } from '../client';
import { endpoints } from '../endpoints';

/** Managed dependents: care recipients without a login of their own. */
export const dependentsService = {
  list: (params: { limit?: number; cursor?: string } = {}) =>
    http.get<CursorPage<Dependent>>(endpoints.dependents.root, { params }),
};
