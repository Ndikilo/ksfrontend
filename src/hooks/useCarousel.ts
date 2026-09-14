import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type UseCarouselOptions = {
  count: number;
  /** Width of one page (usually the screen width). */
  itemWidth: number;
  /** Auto-advance interval in ms. Omit/0 to disable autoplay. */
  intervalMs?: number;
  /** Wrap from the last page back to the first (default true). */
  loop?: boolean;
};

/**
 * Drives a horizontally-paged FlatList: tracks the active index, exposes an
 * imperative `scrollTo`, and auto-advances on a timer that pauses while the
 * user is interacting. Reusable for any carousel (onboarding, galleries…).
 */
export function useCarousel<T>({ count, itemWidth, intervalMs, loop = true }: UseCarouselOptions) {
  const listRef = useRef<FlatList<T>>(null);
  const [index, setIndex] = useState(0);
  const interacting = useRef(false);

  const scrollTo = useCallback(
    (next: number) => {
      if (itemWidth <= 0 || count === 0) return;
      const clamped = ((next % count) + count) % count;
      listRef.current?.scrollToOffset({ offset: clamped * itemWidth, animated: true });
      setIndex(clamped);
    },
    [count, itemWidth],
  );

  // Autoplay. The interval is stable (functional state update) so it isn't torn
  // down every second; it simply skips a tick while the user is dragging.
  useEffect(() => {
    if (!intervalMs || count <= 1 || itemWidth <= 0) return;
    const id = setInterval(() => {
      if (interacting.current) return;
      setIndex((current) => {
        const next = loop ? (current + 1) % count : Math.min(current + 1, count - 1);
        listRef.current?.scrollToOffset({ offset: next * itemWidth, animated: true });
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, count, itemWidth, loop]);

  const onScrollBeginDrag = useCallback(() => {
    interacting.current = true;
  }, []);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (itemWidth <= 0) return;
      setIndex(Math.round(event.nativeEvent.contentOffset.x / itemWidth));
      interacting.current = false;
    },
    [itemWidth],
  );

  return { listRef, index, scrollTo, onScrollBeginDrag, onMomentumScrollEnd };
}
