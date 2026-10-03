import { act, renderHook, waitFor } from '@testing-library/react-native';

import '@/i18n'; // useMutation falls back to i18n.t('errors.generic')

import { useMutation } from '../useMutation';

// Re-entrancy guard (P4.T1 Review 005 A3): setState is async, so a fast
// double-tap used to slip past `isLoading` and fire two POSTs. The synchronous
// ref guard must make the second call a no-op until the first settles.
describe('useMutation re-entrancy guard', () => {
  it('a double-tap in the same frame fires exactly one request', async () => {
    let resolve!: (value: string) => void;
    const mutationFn = jest.fn(
      () =>
        new Promise<string>((res) => {
          resolve = res;
        }),
    );
    const { result } = renderHook(() => useMutation<string, string>(mutationFn));
    let first!: Promise<string | null>;
    act(() => {
      first = result.current.mutate('a');
      void result.current.mutate('b'); // second tap before any re-render
    });
    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(mutationFn).toHaveBeenCalledWith('a');

    await act(async () => {
      resolve('done');
      await first;
    });
    expect(result.current.data).toBe('done');
    expect(result.current.isLoading).toBe(false);
  });

  it('releases the guard after settle, and after reset', async () => {
    const mutationFn = jest.fn(async (value: string) => value);
    const { result } = renderHook(() => useMutation<string, string>(mutationFn));
    await act(async () => {
      await result.current.mutate('one');
    });
    await act(async () => {
      await result.current.mutate('two');
    });
    expect(mutationFn).toHaveBeenCalledTimes(2);

    result.current.reset();
    await act(async () => {
      await result.current.mutate('three');
    });
    expect(mutationFn).toHaveBeenCalledTimes(3);
    expect(await waitFor(() => result.current.data)).toBe('three');
  });
});
