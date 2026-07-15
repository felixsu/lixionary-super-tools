'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { ToolId, TOOLS } from '@/lib/tools';
import { searchTools } from '@/lib/fuzzy';
import ToolIcon from './ToolIcon';

export default function CommandPalette({
  query,
  onQueryChange,
  onSelect,
  onClose,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (id: ToolId) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchTools(query, TOOLS);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 110 }} onClick={onClose}>
      <div
        className="modal"
        style={{ width: 560, maxWidth: 'calc(100vw - 48px)', padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--color-hairline)' }}>
          <Search size={18} color="var(--color-muted-soft)" />
          <input
            ref={inputRef}
            className="input"
            style={{ border: 'none', boxShadow: 'none', padding: 0, height: 'auto', fontSize: 16 }}
            type="text"
            placeholder="Search tools…"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && results.length > 0) onSelect(results[0].id);
            }}
          />
          <span className="kbd-chip">Esc</span>
        </div>
        <div style={{ maxHeight: 380, overflow: 'auto', padding: 8 }}>
          {results.map(tool => (
            <button key={tool.id} className="palette-result" onClick={() => onSelect(tool.id)}>
              <div className="tool-icon-wrap" style={{ width: 34, height: 34 }}>
                <ToolIcon name={tool.icon} size={16} color="var(--color-primary)" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="body-sm" style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{tool.name}</span>
                <span className="caption muted">{tool.category}</span>
              </div>
            </button>
          ))}
          {query.trim() && results.length === 0 && (
            <div className="body-sm muted" style={{ padding: 20, textAlign: 'center' }}>
              No tools match &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
