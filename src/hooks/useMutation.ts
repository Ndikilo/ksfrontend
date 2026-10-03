import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError } from '@/api';
import i18n from '@/i18n';
import type { ApiError } from '@/types';

type MutationState<T> = {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
};

type UseMutationOptions<T, V> = {
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: ApiError, variables: V) => void;
};

type UseMutationResult<T, V> = MutationState<T> & {
  /** Trigger the mutation; resolves with data or `null` on failure. */
  mutate: (variables: V) => Promise<T | null>;
  reset: () => void;
};

/**
 * Imperative counterpart to `useAsync` for actions the user triggers
 * (login, save, delete). Tracks loading/error and fires success/error
 * callbacks — perfect for wiring a submit button to a service function.
 * A re-entrancy guard makes a fast double-tap fire exactly ONE request
 * (the Button's `disabled` only lands after a re-render — too slow on 3G).
 *
 *   const { mutate, isLoading, error } = useMutation(authService.login, {
 *     onSuccess: (session) => signIn(session),
 *   });
 *   <Button loading={isLoading} onPress={() => mutate({ email, password })} />
 */
export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options: UseMutationOptions<T, V> = {},
): UseMutationResult<T, V> {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Synchronous in-flight marker: setState is async, so `isLoading` alone
  // can't stop a double-tap that lands within the same frame.
  const isLoadingRef = useRef(false);

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      if (isLoadingRef.current) return null;
      isLoadingRef.current = true;
      setState({ data: null, error: null, isLoading: true });
      try {
        const data = await mutationFn(variables);
        if (isMounted.current) setState({ data, error: null, isLoading: false });
        options.onSuccess?.(data, variables);
        return data;
      } catch (err) {
        const error: ApiError = isApiError(err)
          ? err
          : { status: 0, message: i18n.t('errors.generic') };
        if (isMounted.current) setState({ data: null, error, isLoading: false });
        options.onError?.(error, variables);
        return null;
      } finally {
        isLoadingRef.current = false;
      }
    },
    [mutationFn, options],
  );

  const reset = useCallback(() => {
    isLoadingRef.current = false;
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return { ...state, mutate, reset };
}
