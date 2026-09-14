import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError } from '@/api';
import type { ApiError } from '@/types';

type AsyncState<T> = {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
};

type UseAsyncResult<T> = AsyncState<T> & {
  /** Re-run the async function (e.g. pull-to-refresh or retry). */
  refetch: () => Promise<void>;
};

/**
 * Run an async function (typically a service call) on mount and expose
 * loading/error/data. Guards against setting state after unmount, and
 * normalises anything thrown into an `ApiError`.
 *
 *   const { data, error, isLoading, refetch } = useAsync(() => accountService.getProfile());
 *
 * `deps` controls when the function re-runs, exactly like `useEffect`.
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await asyncFn();
      if (isMounted.current) setState({ data, error: null, isLoading: false });
    } catch (err) {
      const error: ApiError = isApiError(err)
        ? err
        : { status: 0, message: 'Something went wrong.' };
      if (isMounted.current) setState((prev) => ({ ...prev, error, isLoading: false }));
    }
    // asyncFn is intentionally excluded; callers control re-runs via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, refetch: run };
}
