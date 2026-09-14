import { useCallback, useEffect, useRef, useState } from 'react';

/** Zero-pad to mm:ss (e.g. 125 → "02:05"). */
export const formatMMSS = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Counts down from `seconds` to 0, ticking once per second. Returns the time
 * left, a `mmss` string, whether it's finished, and a `restart`. Used by the
 * OTP resend timer ("Resend code in 02:00").
 */
export function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback((from: number) => {
    clear();
    setRemaining(from);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clear();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    start(seconds);
    return clear;
    // Only auto-start once on mount; callers use `restart` afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = useCallback((from: number = seconds) => start(from), [seconds, start]);

  return { remaining, mmss: formatMMSS(remaining), isDone: remaining <= 0, restart };
}
