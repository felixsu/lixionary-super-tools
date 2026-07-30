'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, SearchX, Star } from 'lucide-react';
import { CATEGORIES, ToolDef, ToolId, TOOLS, TOOLS_BY_ID } from '@/lib/tools';
import { searchTools } from '@/lib/fuzzy';
import ToolIcon from './ToolIcon';

const FAV_CARD_STEP = 316; // card width (300) + gap (16)

export default function HomeScreen({
  query,
  favorites,
  onToggleFavorite,
  onOpenTool,
}: {
  query: string;
  favorites: ToolId[];
  onToggleFavorite: (id: ToolId) => void;
  onOpenTool: (id: ToolId) => void;
}) {
  const [rawFavIndex, setFavIndex] = useState(0);
  const [favVisible, setFavVisible] = useState(3);
  const favViewportRef = useRef<HTMLDivElement>(null);

  const favoriteTools = favorites.map(id => TOOLS_BY_ID[id]).filter(Boolean);
  const hasFavorites = favoriteTools.length > 0;

  useEffect(() => {
    const el = favViewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      // The track has a trailing-gap-free layout, so N cards need N*316 - 16px.
      setFavVisible(Math.max(1, Math.floor((width + 16) / FAV_CARD_STEP)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasFavorites]);

  const favMaxIndex = Math.max(0, favoriteTools.length - favVisible);
  // Clamp at render time so removing favourites never leaves the carousel
  // scrolled past the end.
  const favIndex = Math.min(rawFavIndex, favMaxIndex);

  const matched = new Set(searchTools(query, TOOLS).map(t => t.id));
  const grouped = CATEGORIES.map(category => ({
    category,
    tools: TOOLS.filter(t => t.category === category && matched.has(t.id)),
  })).filter(g => g.tools.length > 0);
  const noResults = !!query.trim() && grouped.length === 0;

  const renderStar = (tool: ToolDef) => {
    const isFav = favorites.includes(tool.id);
    return (
      <button
        className={`fav-star-btn${isFav ? ' active' : ''}`}
        aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
        onClick={e => {
          e.stopPropagation();
          onToggleFavorite(tool.id);
        }}
      >
        <Star size={14} color={isFav ? '#fff' : 'var(--color-muted)'} />
      </button>
    );
  };

  return (
    <div className="page page--wide">
      <h1 className="h1" style={{ marginBottom: 8 }}>Tools</h1>
      <p className="body-md muted" style={{ margin: '0 0 24px' }}>
        Encoding, signing and key-generation utilities. Press <span className="kbd-chip">⌘K</span> to search.
        Click the star on a tool to add it here.
      </p>

      {hasFavorites && (
        <div style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 className="h2" style={{ margin: 0 }}>Favourites</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-icon"
                aria-label="Previous favourite"
                disabled={favoriteTools.length <= favVisible}
                onClick={() => setFavIndex(favIndex <= 0 ? favMaxIndex : favIndex - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn-icon"
                aria-label="Next favourite"
                disabled={favoriteTools.length <= favVisible}
                onClick={() => setFavIndex(favIndex >= favMaxIndex ? 0 : favIndex + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="fav-carousel-viewport" ref={favViewportRef}>
            <div className="fav-carousel-track" style={{ transform: `translateX(-${favIndex * FAV_CARD_STEP}px)` }}>
              {favoriteTools.map(tool => (
                <div key={tool.id} className="fav-card" onClick={() => onOpenTool(tool.id)}>
                  <div className="tool-icon-wrap" style={{ width: 44, height: 44, flexShrink: 0 }}>
                    <ToolIcon name={tool.icon} size={20} color="var(--color-primary)" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                    <span className="title-md" style={{ color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tool.name}
                    </span>
                    <span className="body-sm muted">{tool.category}</span>
                  </div>
                  {renderStar(tool)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {grouped.map(group => (
        <div key={group.category} style={{ marginBottom: 44 }}>
          <h2 className="h2" style={{ marginBottom: 16 }}>{group.category}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {group.tools.map(tool => (
              <div key={tool.id} className="tool-card" onClick={() => onOpenTool(tool.id)} role="button" tabIndex={0}>
                {renderStar(tool)}
                <div className="tool-icon-wrap">
                  <ToolIcon name={tool.icon} size={19} color="var(--color-primary)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="title-md" style={{ color: 'var(--color-ink)' }}>{tool.name}</span>
                  <span className="body-sm muted">{tool.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {noResults && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-muted)' }}>
          <SearchX size={40} color="var(--color-muted-soft)" />
          <p className="body-md muted" style={{ marginTop: 12 }}>No tools match &ldquo;{query}&rdquo;.</p>
        </div>
      )}

      <p className="body-sm muted" style={{ marginTop: 8 }}>More tools are added over time &mdash; check back soon.</p>
    </div>
  );
}
