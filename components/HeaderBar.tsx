'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Lock, LogOut, Search } from 'lucide-react';

const noopSubscribe = () => () => {};

export default function HeaderBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const kbdChip = useSyncExternalStore(
    noopSubscribe,
    () => (/Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K'),
    () => '⌘K'
  );

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const user = session?.user;

  return (
    <div className="tb">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Lixionary Logo"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            objectFit: 'cover',
            objectPosition: '50% 35%',
            border: '1px solid var(--color-hairline)',
          }}
        />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>
          Lixionary Tools
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-secondary search-trigger" onClick={onOpenSearch}>
          <Search size={15} />
          Search
          <span className="kbd-chip">{kbdChip}</span>
        </button>
        {user ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="avatar"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Account menu"
              style={{ width: 36, height: 36, border: '1px solid var(--color-hairline)', padding: 0, background: 'var(--color-surface-card)' }}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name ?? 'Profile'} width={36} height={36} referrerPolicy="no-referrer" />
              ) : (
                <span>{(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}</span>
              )}
            </button>
            {menuOpen && (
              <div className="user-menu">
                <div style={{ padding: '6px 12px 10px', borderBottom: '1px solid var(--color-hairline)', marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{user.email}</div>
                </div>
                <button onClick={() => signOut()}>
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={() => signIn('google')} disabled={status === 'loading'}>
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}
