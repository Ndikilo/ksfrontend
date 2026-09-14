/** Shared shapes for talking to the KanaSanté backend. */

/** Normalised error shape produced by the API client (see `api/httpError.ts`). */
export type ApiError = {
  /** HTTP status, or 0 for network/timeout failures. */
  status: number;
  /** Safe, user-presentable message. */
  message: string;
  /** Machine-readable code from the backend, when provided. */
  code?: string;
  /** Field-level validation errors keyed by field name. */
  fieldErrors?: Record<string, string>;
};

/** Backend validation detail (422 VALIDATION_FAILED): one entry per bad field. */
export type FieldErrorDetail = { path: string; message: string };

/** Error envelope every /v1 non-2xx response uses. */
export type ApiErrorEnvelope = {
  error: { code: string; message: string; details?: FieldErrorDetail[] };
  requestId: string;
};

/** Cursor pagination metadata (reviews, availability, lists of references…). */
export type CursorPageMeta = {
  count: number;
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type CursorPage<T> = { data: T[]; meta: CursorPageMeta };

/** Offset pagination metadata (practitioner search). */
export type OffsetPageMeta = {
  count: number;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type OffsetPage<T> = { data: T[]; meta: OffsetPageMeta };
