import { useCallback, useState } from 'react';

/** Boolean state with memoised on/off/toggle helpers (modals, switches, etc.). */
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const on = useCallback(() => setValue(true), []);
  const off = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return { value, on, off, toggle, setValue } as const;
}
