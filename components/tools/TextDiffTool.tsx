'use client';

import { useState } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import Seg from '@/components/ui/Seg';
import { diffLines, diffWords } from 'diff';
import { Check, Copy, RefreshCw } from 'lucide-react';

// --- Type Definitions ---
type DiffLayout = 'split' | 'unified';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'empty';
  text: string;
  num?: number;
  words?: { added?: boolean; removed?: boolean; value: string }[];
}

interface AlignedRow {
  left: DiffLine;
  right: DiffLine;
}

const DEFAULT_ORIGINAL = `{
  "name": "lixionary-super-tools",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "next": "16.0.0",
    "react": "19.0.0",
    "lucide-react": "^1.0.0"
  },
  "config": {
    "port": 8120,
    "env": "production"
  }
}`;

const DEFAULT_MODIFIED = `{
  "name": "lixionary-super-tools-v2",
  "version": "1.1.0",
  "private": true,
  "dependencies": {
    "next": "16.2.10",
    "react": "19.2.4",
    "lucide-react": "^1.24.0",
    "yaml": "^2.3.0"
  },
  "config": {
    "port": 8122,
    "env": "production"
  }
}`;

// --- Diff Alignment Algorithm ---
function computeAlignedDiff(original: string, modified: string): AlignedRow[] {
  const changes = diffLines(original, modified);
  const rows: AlignedRow[] = [];

  let leftLineNum = 1;
  let rightLineNum = 1;

  let i = 0;
  while (i < changes.length) {
    const current = changes[i];

    if (!current.added && !current.removed) {
      // Unchanged block
      const lines = current.value.split('\n');
      if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop(); // trailing split newline
      }
      lines.forEach(lineText => {
        rows.push({
          left: { type: 'unchanged', text: lineText, num: leftLineNum++ },
          right: { type: 'unchanged', text: lineText, num: rightLineNum++ },
        });
      });
      i++;
    } else {
      // Deletions / Additions block
      const deletedLines: string[] = [];
      const addedLines: string[] = [];

      // Collect adjacent deletions and additions
      while (i < changes.length && (changes[i].added || changes[i].removed)) {
        const lines = changes[i].value.split('\n');
        if (lines.length > 1 && lines[lines.length - 1] === '') {
          lines.pop();
        }
        if (changes[i].removed) {
          deletedLines.push(...lines);
        } else {
          addedLines.push(...lines);
        }
        i++;
      }

      const maxLen = Math.max(deletedLines.length, addedLines.length);
      for (let k = 0; k < maxLen; k++) {
        const hasDel = k < deletedLines.length;
        const hasAdd = k < addedLines.length;

        if (hasDel && hasAdd) {
          // Modification pair: calculate inline character/word diff
          const oldText = deletedLines[k];
          const newText = addedLines[k];
          const wordChanges = diffWords(oldText, newText);

          rows.push({
            left: {
              type: 'removed',
              text: oldText,
              num: leftLineNum++,
              words: wordChanges,
            },
            right: {
              type: 'added',
              text: newText,
              num: rightLineNum++,
              words: wordChanges,
            },
          });
        } else if (hasDel) {
          // Deletion only
          rows.push({
            left: { type: 'removed', text: deletedLines[k], num: leftLineNum++ },
            right: { type: 'empty', text: '' },
          });
        } else if (hasAdd) {
          // Addition only
          rows.push({
            left: { type: 'empty', text: '' },
            right: { type: 'added', text: addedLines[k], num: rightLineNum++ },
          });
        }
      }
    }
  }

  return rows;
}

export default function TextDiffTool() {
  const [original, setOriginal] = usePersistentState<string>('tool:text-diff:original', DEFAULT_ORIGINAL);
  const [modified, setModified] = usePersistentState<string>('tool:text-diff:modified', DEFAULT_MODIFIED);
  const [layout, setLayout] = usePersistentState<DiffLayout>('tool:text-diff:layout', 'split');

  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedModified, setCopiedModified] = useState(false);

  const swapTexts = () => {
    const temp = original;
    setOriginal(modified);
    setModified(temp);
  };

  const handleClear = () => {
    setOriginal('');
    setModified('');
  };

  const copyText = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const rows = computeAlignedDiff(original, modified);

  // Stats
  const addedCount = rows.filter(r => r.right.type === 'added').length;
  const removedCount = rows.filter(r => r.left.type === 'removed').length;

  const renderInlineWords = (words: { added?: boolean; removed?: boolean; value: string }[], filterOut: 'added' | 'removed') => {
    return words
      .filter(w => (filterOut === 'added' ? !w.added : !w.removed))
      .map((w, idx) => {
        const isEdit = filterOut === 'added' ? w.removed : w.added;
        const bg = isEdit
          ? filterOut === 'added'
            ? 'rgba(239, 68, 68, 0.25)' // Deletion highlight
            : 'rgba(34, 197, 94, 0.25)' // Addition highlight
          : 'transparent';
        const fw = isEdit ? 'bold' : 'normal';
        return (
          <span key={idx} style={{ background: bg, fontWeight: fw, borderRadius: 2, padding: '0 1px' }}>
            {w.value}
          </span>
        );
      });
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>Text Diff</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Compare two texts line-by-line and character-by-character with visual git-like markers.
      </p>

      {/* Editor Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Left Side: Original */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="field-label" style={{ marginBottom: 0 }}>Original text</span>
            <button
              onClick={() => copyText(original, setCopiedOriginal)}
              className="btn btn-ghost"
              style={{ padding: '0 8px', height: 32, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {copiedOriginal ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              Copy
            </button>
          </div>
          <textarea
            className="input mono"
            rows={10}
            placeholder="Paste original text here..."
            value={original}
            onChange={e => setOriginal(e.target.value)}
            style={{ fontSize: 13, resize: 'vertical', minHeight: 220 }}
          />
        </div>

        {/* Right Side: Modified */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="field-label" style={{ marginBottom: 0 }}>Modified text</span>
            <button
              onClick={() => copyText(modified, setCopiedModified)}
              className="btn btn-ghost"
              style={{ padding: '0 8px', height: 32, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {copiedModified ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              Copy
            </button>
          </div>
          <textarea
            className="input mono"
            rows={10}
            placeholder="Paste modified text here..."
            value={modified}
            onChange={e => setModified(e.target.value)}
            style={{ fontSize: 13, resize: 'vertical', minHeight: 220 }}
          />
        </div>
      </div>

      {/* Editor Actions bar */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
        <button className="btn btn-secondary" onClick={swapTexts}>
          <RefreshCw size={14} />
          Swap texts
        </button>
        <button className="btn btn-ghost" onClick={handleClear} style={{ color: 'var(--color-error)' }}>
          Clear all
        </button>
      </div>

      {/* Diff Output Container */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 className="title-md" style={{ margin: 0 }}>Diff output</h2>
            {original.trim() || modified.trim() ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-success" style={{ padding: '2px 8px' }}>
                  +{addedCount} additions
                </span>
                <span className="badge badge-error" style={{ padding: '2px 8px' }}>
                  -{removedCount} deletions
                </span>
              </div>
            ) : null}
          </div>

          <Seg
            options={[
              { value: 'split', label: 'Split view' },
              { value: 'unified', label: 'Unified view' },
            ]}
            value={layout}
            onChange={setLayout}
          />
        </div>

        {(!original.trim() && !modified.trim()) ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted-soft)' }}>
            Enter text in the original and modified boxes above to see the comparison output.
          </div>
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              lineHeight: '1.5',
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 8,
              overflowX: 'auto',
              maxHeight: 600,
            }}
          >
            {layout === 'split' ? (
              // Split View Layout
              <div style={{ minWidth: 800, display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--color-hairline)' }}>
                {/* Left Side: Original / Deletions */}
                <div style={{ background: 'var(--color-canvas)', display: 'flex', flexDirection: 'column' }}>
                  {rows.map((row, idx) => {
                    const line = row.left;
                    const bg =
                      line.type === 'removed'
                        ? 'rgba(239, 68, 68, 0.07)'
                        : line.type === 'empty'
                        ? 'var(--color-surface-soft)'
                        : 'transparent';

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          background: bg,
                          borderBottom: '1px solid var(--color-hairline-soft)',
                          minHeight: 20,
                        }}
                      >
                        {/* Line number */}
                        <div
                          style={{
                            width: 48,
                            padding: '0 8px',
                            textAlign: 'right',
                            color: 'var(--color-muted-soft)',
                            background: 'var(--color-surface-soft)',
                            borderRight: '1px solid var(--color-hairline)',
                            userSelect: 'none',
                          }}
                        >
                          {line.num}
                        </div>
                        {/* Marker */}
                        <div
                          style={{
                            width: 20,
                            paddingLeft: 6,
                            color: 'var(--color-error)',
                            userSelect: 'none',
                            fontWeight: 'bold',
                          }}
                        >
                          {line.type === 'removed' ? '-' : ''}
                        </div>
                        {/* Text */}
                        <div style={{ flex: 1, paddingLeft: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: line.type === 'removed' ? 'var(--color-ink)' : 'inherit' }}>
                          {line.words ? renderInlineWords(line.words, 'added') : line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Side: Modified / Additions */}
                <div style={{ background: 'var(--color-canvas)', borderLeft: '1px solid var(--color-hairline)', display: 'flex', flexDirection: 'column' }}>
                  {rows.map((row, idx) => {
                    const line = row.right;
                    const bg =
                      line.type === 'added'
                        ? 'rgba(34, 197, 94, 0.07)'
                        : line.type === 'empty'
                        ? 'var(--color-surface-soft)'
                        : 'transparent';

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          background: bg,
                          borderBottom: '1px solid var(--color-hairline-soft)',
                          minHeight: 20,
                        }}
                      >
                        {/* Line number */}
                        <div
                          style={{
                            width: 48,
                            padding: '0 8px',
                            textAlign: 'right',
                            color: 'var(--color-muted-soft)',
                            background: 'var(--color-surface-soft)',
                            borderRight: '1px solid var(--color-hairline)',
                            userSelect: 'none',
                          }}
                        >
                          {line.num}
                        </div>
                        {/* Marker */}
                        <div
                          style={{
                            width: 20,
                            paddingLeft: 6,
                            color: 'var(--color-success)',
                            userSelect: 'none',
                            fontWeight: 'bold',
                          }}
                        >
                          {line.type === 'added' ? '+' : ''}
                        </div>
                        {/* Text */}
                        <div style={{ flex: 1, paddingLeft: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: line.type === 'added' ? 'var(--color-ink)' : 'inherit' }}>
                          {line.words ? renderInlineWords(line.words, 'removed') : line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Unified View Layout (Single column)
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rows.map((row, idx) => {
                  const hasDel = row.left.type === 'removed';
                  const hasAdd = row.right.type === 'added';
                  const isUnchanged = row.left.type === 'unchanged';

                  if (isUnchanged) {
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          borderBottom: '1px solid var(--color-hairline-soft)',
                          minHeight: 20,
                        }}
                      >
                        {/* Left number */}
                        <div style={{ width: 44, padding: '0 6px', textAlign: 'right', color: 'var(--color-muted-soft)', background: 'var(--color-surface-soft)', borderRight: '1px solid var(--color-hairline-soft)', userSelect: 'none' }}>
                          {row.left.num}
                        </div>
                        {/* Right number */}
                        <div style={{ width: 44, padding: '0 6px', textAlign: 'right', color: 'var(--color-muted-soft)', background: 'var(--color-surface-soft)', borderRight: '1px solid var(--color-hairline)', userSelect: 'none' }}>
                          {row.right.num}
                        </div>
                        {/* Marker */}
                        <div style={{ width: 20, paddingLeft: 6, userSelect: 'none' }}> </div>
                        {/* Text */}
                        <div style={{ flex: 1, paddingLeft: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {row.left.text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Deletion Line */}
                      {hasDel && (
                        <div
                          style={{
                            display: 'flex',
                            background: 'rgba(239, 68, 68, 0.07)',
                            borderBottom: '1px solid var(--color-hairline-soft)',
                            minHeight: 20,
                          }}
                        >
                          <div style={{ width: 44, padding: '0 6px', textAlign: 'right', color: 'var(--color-muted-soft)', background: 'rgba(239, 68, 68, 0.04)', borderRight: '1px solid var(--color-hairline-soft)', userSelect: 'none' }}>
                            {row.left.num}
                          </div>
                          <div style={{ width: 44, padding: '0 6px', background: 'rgba(239, 68, 68, 0.04)', borderRight: '1px solid var(--color-hairline)', userSelect: 'none' }}>
                            {/* Empty space on modified side */}
                          </div>
                          <div style={{ width: 20, paddingLeft: 6, color: 'var(--color-error)', userSelect: 'none', fontWeight: 'bold' }}>-</div>
                          <div style={{ flex: 1, paddingLeft: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--color-ink)' }}>
                            {row.left.words ? renderInlineWords(row.left.words, 'added') : row.left.text}
                          </div>
                        </div>
                      )}

                      {/* Addition Line */}
                      {hasAdd && (
                        <div
                          style={{
                            display: 'flex',
                            background: 'rgba(34, 197, 94, 0.07)',
                            borderBottom: '1px solid var(--color-hairline-soft)',
                            minHeight: 20,
                          }}
                        >
                          <div style={{ width: 44, padding: '0 6px', background: 'rgba(34, 197, 94, 0.04)', borderRight: '1px solid var(--color-hairline-soft)', userSelect: 'none' }}>
                            {/* Empty space on original side */}
                          </div>
                          <div style={{ width: 44, padding: '0 6px', textAlign: 'right', color: 'var(--color-muted-soft)', background: 'rgba(34, 197, 94, 0.04)', borderRight: '1px solid var(--color-hairline)', userSelect: 'none' }}>
                            {row.right.num}
                          </div>
                          <div style={{ width: 20, paddingLeft: 6, color: 'var(--color-success)', userSelect: 'none', fontWeight: 'bold' }}>+</div>
                          <div style={{ flex: 1, paddingLeft: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--color-ink)' }}>
                            {row.right.words ? renderInlineWords(row.right.words, 'removed') : row.right.text}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
