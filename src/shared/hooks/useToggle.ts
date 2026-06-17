import { useState, useCallback } from 'react';

/**
 * Hook utilitário para boolean toggles.
 * Retorna [value, toggle, setValue] — exatamente como useState mas com toggle incluído.
 */
export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle, setValue];
}
