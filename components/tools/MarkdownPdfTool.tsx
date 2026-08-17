'use client';

import { useEffect, useRef, useState } from 'react';
import { File, FileDown, Info, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { usePersistentState } from '@/lib/usePersistentState';
import { renderMarkdownToHtml, hasMermaidFence } from '@/lib/markdown';
import { DOCUMENT_CSS, buildPageCss, type MarginPreset, type PageSize } from '@/lib/markdown-css';
import { printDocument } from '@/lib/print-document';
import Seg from '@/components/ui/Seg';

type SourceMode = 'paste' | 'upload';
type LayoutMode = 'split' | 'preview';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
// Above this, the document is kept in memory only — usePersistentState writes
// on every keystroke, and stringifying a large document that often janks the
// editor well before localStorage's quota becomes the problem.
const PERSIST_LIMIT = 200_000;

const DEFAULT_MARKDOWN = `# Deployment Runbook

Rolling a new build out to the **branch servers**. Read the whole thing before
you start — step 4 is not reversible.

## Release flow

\`\`\`mermaid
flowchart LR
  A[Merge to main] --> B[CI build]
  B --> C{Tests green?}
  C -->|yes| D[Publish image]
  C -->|no| E[Notify author]
  D --> F[Roll out to branches]
\`\`\`

## Environments

| Environment | Host              | Replicas | Auto-deploy |
| ----------- | ----------------- | -------- | ----------- |
| Staging     | \`stg.internal\`    | 1        | Yes         |
| Branch      | \`branch-*.prod\`   | 12       | No          |
| HQ          | \`hq.prod\`         | 3        | No          |

## Health check

\`\`\`typescript
async function waitForHealthy(host: string, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(\`https://\${host}/actuator/health\`);
    if (res.ok) return true;
    await new Promise(r => setTimeout(r, 2_000));
  }
  return false;
}
\`\`\`

> **Rollback:** \`./deploy.sh --revision previous\` restores the last image.
> Config changes are *not* covered — revert those by hand.

### Checklist

- [x] Changelog updated
- [x] Migrations reviewed
- [ ] On-call notified
- [ ] Dashboards checked after rollout
`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** First ATX heading, used when the author hasn't named the document. */
function deriveTitle(md: string): string {
  const match = md.match(/^[ \t]*#[ \t]+(.+)$/m);
  return match ? match[1].trim().replace(/\s*#+\s*$/, '') : 'document';
}

export default function MarkdownPdfTool() {
  const [stored, setStored] = usePersistentState<string>('tool:md-to-pdf:source', DEFAULT_MARKDOWN);
  const [sourceMode, setSourceMode] = usePersistentState<SourceMode>('tool:md-to-pdf:source-mode', 'paste');
  const [layout, setLayout] = usePersistentState<LayoutMode>('tool:md-to-pdf:layout', 'split');
  const [pageSize, setPageSize] = usePersistentState<PageSize>('tool:md-to-pdf:page-size', 'A4');
  const [margin, setMargin] = usePersistentState<MarginPreset>('tool:md-to-pdf:margin', 'normal');
  const [docTitle, setDocTitle] = usePersistentState<string>('tool:md-to-pdf:title', '');

  // Documents past PERSIST_LIMIT live here instead of in localStorage.
  const [oversized, setOversized] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [html, setHtml] = useState('');
  const [diagramErrors, setDiagramErrors] = useState<string[]>([]);
  const [renderError, setRenderError] = useState('');
  const [rendering, setRendering] = useState(true);
  const [printing, setPrinting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const runIdRef = useRef(0);

  const markdown = oversized ?? stored;

  const setMarkdown = (next: string) => {
    if (next.length > PERSIST_LIMIT) {
      setOversized(next);
      if (stored !== '') setStored('');
    } else {
      if (oversized !== null) setOversized(null);
      setStored(next);
    }
  };

  // Debounced because mermaid rendering is slow; the run id discards results
  // that land out of order after a later edit has already superseded them.
  useEffect(() => {
    const runId = ++runIdRef.current;
    const timer = window.setTimeout(() => {
      setRendering(true);
      renderMarkdownToHtml(markdown)
        .then(result => {
          if (runIdRef.current !== runId) return;
          setHtml(result.html);
          setDiagramErrors(result.diagramErrors);
          setRenderError('');
          setRendering(false);
        })
        .catch(err => {
          if (runIdRef.current !== runId) return;
          setRenderError(String((err as Error)?.message || err));
          setRendering(false);
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [markdown]);

  const loadFile = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`File is ${formatBytes(file.size)} — the limit is 2 MB.`);
      return;
    }
    try {
      const text = await file.text();
      setMarkdown(text);
      setFileMeta({ name: file.name, size: file.size });
      setUploadError('');
      if (!docTitle.trim()) setDocTitle(file.name.replace(/\.(md|markdown|mdx|txt)$/i, ''));
    } catch {
      setUploadError('Could not read that file.');
    }
  };

  const clearFile = () => {
    setFileMeta(null);
    setUploadError('');
    setMarkdown('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePrint = () => {
    setPrinting(true);
    printDocument({
      html,
      css: `${DOCUMENT_CSS}\n${buildPageCss(pageSize, margin)}`,
      title: docTitle.trim() || deriveTitle(markdown),
      onFinished: () => setPrinting(false),
    });
  };

  const showEditor = layout === 'split';
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  const editorPane = (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span className="field-label" style={{ marginBottom: 0 }}>Markdown</span>
        <span className="caption muted">{wordCount.toLocaleString()} words</span>
      </div>
      <textarea
        className="input mono"
        placeholder="# Your document&#10;&#10;Paste Markdown here…"
        value={markdown}
        onChange={e => setMarkdown(e.target.value)}
        style={{ fontSize: 13, resize: 'vertical', minHeight: 560, lineHeight: 1.6 }}
      />
      {oversized !== null && (
        <span className="caption muted">
          This document is over {Math.round(PERSIST_LIMIT / 1000)} KB, so it won&rsquo;t be restored after a reload.
        </span>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>Markdown to PDF</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Turn a Markdown file into a typeset PDF. Mermaid fences become rendered diagrams, tables
        become real tables, and other code fences get syntax highlighting.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ── Source ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
          <div>
            <label className="field-label">Source</label>
            <Seg
              options={[
                { value: 'paste', label: 'Paste' },
                { value: 'upload', label: 'Upload' },
              ]}
              value={sourceMode}
              onChange={setSourceMode}
            />
          </div>
          <div>
            <label className="field-label">View</label>
            <Seg
              options={[
                { value: 'split', label: 'Editor + preview' },
                { value: 'preview', label: 'Preview only' },
              ]}
              value={layout}
              onChange={setLayout}
            />
          </div>
        </div>

        {sourceMode === 'upload' &&
          (fileMeta ? (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div className="tool-icon-wrap" style={{ width: 44, height: 44, background: 'var(--color-canvas)', flexShrink: 0 }}>
                  <File size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 4 }}>
                  <span className="title-md" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fileMeta.name}
                  </span>
                  <span className="body-sm muted">{formatBytes(fileMeta.size)}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={clearFile} aria-label="Remove file">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setDragging(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped) void loadFile(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                borderRadius: 12,
                padding: '48px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? 'var(--color-surface-cream-strong)' : 'var(--color-surface-soft)',
                transition: 'border-color 150ms ease, background-color 150ms ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".md,.markdown,.mdx,.txt,text/markdown,text/plain"
                onChange={e => {
                  const selected = e.target.files?.[0];
                  if (selected) void loadFile(selected);
                }}
                style={{ display: 'none' }}
              />
              <UploadCloud size={44} style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="title-md" style={{ margin: '0 0 4px' }}>Drag &amp; drop a Markdown file</p>
                <p className="body-sm muted" style={{ margin: 0 }}>or click to browse from your computer</p>
              </div>
              <p className="caption" style={{ color: 'var(--color-muted-soft)', margin: 0 }}>
                .md, .markdown, .mdx or .txt &mdash; max 2 MB
              </p>
            </div>
          ))}

        {uploadError && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(198, 69, 69, 0.08)',
              border: '1px solid var(--color-error)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Info size={18} style={{ color: 'var(--color-error)' }} />
            <span className="body-sm" style={{ color: 'var(--color-error)', fontWeight: 500 }}>{uploadError}</span>
          </div>
        )}

        {/* ── Editor + preview ───────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: showEditor ? 'repeat(auto-fit, minmax(420px, 1fr))' : '1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {showEditor && editorPane}

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Preview</span>
              {rendering ? (
                <span className="caption muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <LoaderCircle size={13} className="md-spin" />
                  Rendering…
                </span>
              ) : (
                <span className="caption muted">{pageSize} &middot; {margin} margins</span>
              )}
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--color-hairline)',
                borderRadius: 8,
                padding: 28,
                maxHeight: 640,
                overflow: 'auto',
              }}
            >
              <style dangerouslySetInnerHTML={{ __html: DOCUMENT_CSS }} />
              {markdown.trim() ? (
                <div className="md-doc" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p className="body-sm muted" style={{ margin: 0 }}>Nothing to preview yet.</p>
              )}
            </div>
          </div>
        </div>

        {renderError && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(198, 69, 69, 0.08)',
              border: '1px solid var(--color-error)',
              borderRadius: 8,
            }}
          >
            <span className="body-sm" style={{ color: 'var(--color-error)', fontWeight: 500 }}>
              Could not render this document: {renderError}
            </span>
          </div>
        )}

        {diagramErrors.length > 0 && (
          <div className="body-sm" style={{ color: 'var(--color-warning)' }}>
            {diagramErrors.length} diagram{diagramErrors.length > 1 ? 's' : ''} could not be drawn — see the
            highlighted block{diagramErrors.length > 1 ? 's' : ''} in the preview.
          </div>
        )}

        {/* ── Page setup + export ────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
            <div>
              <label className="field-label">Page size</label>
              <Seg
                options={[
                  { value: 'A4', label: 'A4' },
                  { value: 'Letter', label: 'Letter' },
                ]}
                value={pageSize}
                onChange={setPageSize}
              />
            </div>
            <div>
              <label className="field-label">Margins</label>
              <Seg
                options={[
                  { value: 'narrow', label: 'Narrow' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'wide', label: 'Wide' },
                ]}
                value={margin}
                onChange={setMargin}
              />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label className="field-label">Document title</label>
              <input
                className="input"
                type="text"
                placeholder={deriveTitle(markdown)}
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handlePrint}
              disabled={printing || rendering || !markdown.trim()}
            >
              <FileDown size={15} />
              {printing ? 'Opening print dialog…' : 'Download PDF'}
            </button>
            <span className="caption muted" style={{ maxWidth: 560 }}>
              Your browser&rsquo;s print dialog opens — choose <strong>Save as PDF</strong> as the destination. Text and
              diagrams stay vector, so the result is selectable and searchable. Page numbers come from the
              dialog&rsquo;s own &ldquo;Headers and footers&rdquo; option.
            </span>
          </div>

          {hasMermaidFence(markdown) && (
            <span className="caption muted">
              This document contains mermaid diagrams, so the first render loads the diagram engine.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
