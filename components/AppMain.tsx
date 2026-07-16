'use client';

import { useCallback, useEffect, useState } from 'react';
import { isToolId, ToolId } from '@/lib/tools';
import { usePersistentState } from '@/lib/usePersistentState';
import { useFavorites } from '@/lib/useFavorites';
import HeaderBar from '@/components/HeaderBar';
import TabStrip from '@/components/TabStrip';
import GoogleAd from '@/components/GoogleAd';
import HomeScreen from '@/components/HomeScreen';
import CommandPalette from '@/components/CommandPalette';
import Base64Tool from '@/components/tools/Base64Tool';
import UrlTool from '@/components/tools/UrlTool';
import HmacTool from '@/components/tools/HmacTool';
import JwtTool from '@/components/tools/JwtTool';
import RsaTool from '@/components/tools/RsaTool';
import CoinTossTool from '@/components/tools/CoinTossTool';
import DiceRollTool from '@/components/tools/DiceRollTool';
import PasswordTool from '@/components/tools/PasswordTool';
import JsonFormatterTool from '@/components/tools/JsonFormatterTool';
import YamlFormatterTool from '@/components/tools/YamlFormatterTool';
import TextDiffTool from '@/components/tools/TextDiffTool';
import ChecksumTool from '@/components/tools/ChecksumTool';
import UuidTool from '@/components/tools/UuidTool';

interface TabsState {
  open: ToolId[];
  active: ToolId | null;
}

const TOOL_VIEWS: Record<ToolId, React.ComponentType> = {
  base64: Base64Tool,
  url: UrlTool,
  hmac: HmacTool,
  jwt: JwtTool,
  rsa: RsaTool,
  coin: CoinTossTool,
  dice: DiceRollTool,
  password: PasswordTool,
  'json-formatter': JsonFormatterTool,
  'yaml-formatter': YamlFormatterTool,
  'text-diff': TextDiffTool,
  checksum: ChecksumTool,
  uuid: UuidTool,
};

export default function AppMain({ initialActiveTool }: { initialActiveTool: ToolId | null }) {
  const [tabs, setTabs] = usePersistentState<TabsState>('tabs', { open: [], active: null });
  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  const openTool = useCallback(
    (id: ToolId) => {
      setTabs(t => ({
        open: t.open.includes(id) ? t.open : [...t.open, id],
        active: id,
      }));
    },
    [setTabs]
  );

  const closeTool = useCallback(
    (id: ToolId) => {
      setTabs(t => {
        const idx = t.open.indexOf(id);
        const open = t.open.filter(x => x !== id);
        let active = t.active;
        if (active === id) {
          active = open[idx - 1] !== undefined ? open[idx - 1] : open[0] !== undefined ? open[0] : null;
        }
        return { open, active };
      });
    },
    [setTabs]
  );

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setQuery('');
  }, []);

  // 1. Sync initial active tool on mount/load
  useEffect(() => {
    if (initialActiveTool) {
      setTabs(t => {
        const open = t.open.includes(initialActiveTool) ? t.open : [...t.open, initialActiveTool];
        return { open, active: initialActiveTool };
      });
    }
  }, [initialActiveTool, setTabs]);

  // 2. Sync URL when active tab changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    const expectedPath = tabs.active ? `/${tabs.active}` : '/';
    if (currentPath !== expectedPath) {
      window.history.pushState(null, '', expectedPath);
    }
  }, [tabs.active]);

  // 3. Sync state on browser back/forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const path = window.location.pathname.substring(1); // remove leading '/'
      const toolId = path as ToolId;
      if (!path) {
        setTabs(t => ({ ...t, active: null }));
      } else if (isToolId(toolId)) {
        setTabs(t => {
          const open = t.open.includes(toolId) ? t.open : [...t.open, toolId];
          return { open, active: toolId };
        });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setTabs]);

  // Views have different heights; scroll to top when tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tabs.active]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (key === 'escape') {
        closePalette();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePalette]);

  const ActiveView = tabs.active ? TOOL_VIEWS[tabs.active] : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', fontFamily: 'var(--font-sans)' }}>
      <HeaderBar onOpenSearch={() => setPaletteOpen(true)} />
      <TabStrip
        openTools={tabs.open}
        activeTool={tabs.active}
        onSelect={id => setTabs(t => ({ ...t, active: id }))}
        onClose={closeTool}
        onHome={() => setTabs(t => ({ ...t, active: null }))}
      />

      <div className="main-layout-body">
        <GoogleAd type="sidebar" />
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 110px)' }}>
          <div style={{ flex: 1 }}>
            {ActiveView ? (
              <ActiveView />
            ) : (
              <HomeScreen
                query={query}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onOpenTool={openTool}
              />
            )}
          </div>
          <GoogleAd type="bottom" />
        </div>
      </div>

      {paletteOpen && (
        <CommandPalette
          query={query}
          onQueryChange={setQuery}
          onSelect={id => {
            openTool(id);
            closePalette();
          }}
          onClose={closePalette}
        />
      )}
    </div>
  );
}
