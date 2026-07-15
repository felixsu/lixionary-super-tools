'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLocal, saveLocal } from './storage';

// useState backed by localStorage. Loads after mount (SSR-safe, no hydration
// mismatch) and saves on every change thereafter.
export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<{ v: T; loaded: boolean }>({ v: initial, loaded: false });
  const initialRef = useRef(initial);

  useEffect(() => {
    // Loading in an effect (not initial state) is deliberate: localStorage is
    // unavailable during SSR, so reading it at first render would mismatch
    // the server HTML. One post-hydration setState is the supported pattern.
    setState({ v: loadLocal(key, initialRef.current), loaded: true });
  }, [key]);

  useEffect(() => {
    if (state.loaded) saveLocal(key, state.v);
  }, [key, state]);

  const setValue = useCallback((update: T | ((prev: T) => T)) => {
    setState(s => ({
      v: typeof update === 'function' ? (update as (prev: T) => T)(s.v) : update,
      loaded: s.loaded,
    }));
  }, []);

  return [state.v, setValue] as const;
}
