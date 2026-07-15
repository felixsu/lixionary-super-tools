'use client';

import { House, X } from 'lucide-react';
import { ToolId, TOOLS_BY_ID } from '@/lib/tools';
import ToolIcon from './ToolIcon';

export default function TabStrip({
  openTools,
  activeTool,
  onSelect,
  onClose,
  onHome,
}: {
  openTools: ToolId[];
  activeTool: ToolId | null;
  onSelect: (id: ToolId) => void;
  onClose: (id: ToolId) => void;
  onHome: () => void;
}) {
  return (
    <div className="tab-strip">
      <div className={`tab-item${activeTool === null ? ' active' : ''}`} onClick={onHome} role="tab" aria-selected={activeTool === null}>
        <House size={14} />
        Home
      </div>
      {openTools.map(id => {
        const tool = TOOLS_BY_ID[id];
        if (!tool) return null;
        return (
          <div
            key={id}
            className={`tab-item${activeTool === id ? ' active' : ''}`}
            onClick={() => onSelect(id)}
            role="tab"
            aria-selected={activeTool === id}
          >
            <ToolIcon name={tool.icon} size={14} />
            {tool.tabName}
            <button
              className="tab-close"
              aria-label={`Close ${tool.tabName} tab`}
              onClick={e => {
                e.stopPropagation();
                onClose(id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
