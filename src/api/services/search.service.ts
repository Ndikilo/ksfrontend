import type {
  ConsultationType,
  ID,
  OffsetPage,
  PractitionerCard,
  PractitionerDetail,
  PractitionerSort,
} from '@/types';

import { http } from '../client';
import { endpoints } from '../endpoints';

/** Query params for `GET /v1/practitioners` (offset-paginated search). */
export type PractitionerSearchParams = {
  page?: number;
  pageSize?: number;
  sort?: PractitionerSort;
  /** Free-text name/specialty search. */
  q?: string;
  specialty?: string;
  city?: string;
  /** ISO 639-1 code. */
  language?: string;
  /** Comma-separated consultation types — the backend's multi-select param. */
  consultationType?: string;
  feeMin?: number;
  feeMax?: number;
  /** Single profession filter (the API accepts one id; multi-profession
   *  filtering needs a backend `professionIds` param — see team notes). */
  professionId?: string;
};

/** Practitioner discovery: search results and public bookable profiles. */
export const searchService = {
  practitioners: (params: PractitionerSearchParams) =>
    http.get<OffsetPage<PractitionerCard>>(endpoints.practitioners.search, { params }),

  practitioner: (id: ID) => http.get<PractitionerDetail>(endpoints.practitioners.byId(id)),
};

/** Join the selected consultation types into the API's comma-separated form. */
export const consultationTypeParam = (types: ConsultationType[]): string | undefined =>
  types.length > 0 ? types.join(',') : undefined;
