import { useEffect, useState } from 'react';

/**
 * Return a debounced copy of `value` that only updates after `delay` ms of
 * quiet. Ideal for search inputs so you don't fire an API call per keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
