'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MAX_FAVORITES, ToolId } from './tools';
import { loadLocal, saveLocal } from './storage';
import { usePersistentState } from './usePersistentState';

// Favourites live in localStorage for anonymous users. On sign-in, the local
// list is merged into the server set once; from then on every toggle PUTs and
// the server is the source of truth (per spec, backend stores user + favourite
// tool ids only).
export function useFavorites() {
  const { status } = useSession();
  const [favorites, setFavorites] = usePersistentState<ToolId[]>('favorites', []);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || syncedRef.current) return;
    syncedRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/favorites');
        if (!res.ok) return;
        const data = (await res.json()) as { favorites: ToolId[] };
        const local = loadLocal<ToolId[]>('favorites', []);
        const merged = [...new Set([...data.favorites, ...local])].slice(0, MAX_FAVORITES);
        setFavorites(merged);
        saveLocal('favorites', merged);
        if (JSON.stringify(merged) !== JSON.stringify(data.favorites)) {
          await fetch('/api/favorites', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorites: merged }),
          });
        }
      } catch {
        // offline or DB not configured — localStorage keeps working
      }
    })();
  }, [status, setFavorites]);

  useEffect(() => {
    if (status === 'unauthenticated') syncedRef.current = false;
  }, [status]);

  const toggleFavorite = useCallback(
    (id: ToolId) => {
      setFavorites(prev => {
        const isFav = prev.includes(id);
        if (!isFav && prev.length >= MAX_FAVORITES) return prev;
        const next = isFav ? prev.filter(x => x !== id) : [...prev, id];
        if (status === 'authenticated') {
          fetch('/api/favorites', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorites: next }),
          }).catch(() => {});
        }
        return next;
      });
    },
    [status, setFavorites]
  );

  return { favorites, toggleFavorite };
}
