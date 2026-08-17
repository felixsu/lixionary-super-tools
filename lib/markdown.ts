// Markdown → document HTML, with mermaid fences rendered as diagrams and
// every other fence syntax-highlighted.
//
// Everything runs in the browser. The result is a single fully-inlined HTML
// string (diagram SVGs already substituted in), so the live preview and the
// print iframe can render the exact same artifact.

import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import { Marked, type Tokens } from 'marked';

// Individual language registrations — importing 'highlight.js' directly would
// pull in all ~190 grammars and add roughly 900 KB to the chunk.
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

export interface RenderResult {
  html: string;
  /** One entry per diagram that failed to draw; the document still renders. */
  diagramErrors: string[];
}

interface MermaidBlock {
  id: string;
  code: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalizes the fence info string ("ts", "TypeScript", "js title=x") to a
 *  registered highlight.js language, or null when we can't highlight it. */
function resolveLanguage(lang: string | undefined): string | null {
  if (!lang) return null;
  const first = lang.trim().split(/\s+/)[0].toLowerCase();
  if (!first) return null;
  return hljs.getLanguage(first) ? first : null;
}

// ── Mermaid ─────────────────────────────────────────────────────────
// The module is a large dependency, so it's only imported when a document
// actually contains a mermaid fence.

type MermaidApi = typeof import('mermaid').default;

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(mod => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        // Root-level, not the per-diagram `flowchart.htmlLabels` — that form is
        // deprecated as of v11.16 and the root setting overrides it, so setting
        // only the per-diagram one silently leaves HTML labels on.
        //
        // Labels must be SVG <text>, not HTML in a <foreignObject>: DOMPurify
        // treats foreignObject as forbidden content and would empty every node
        // label, and <text> also survives into the PDF as real selectable text.
        htmlLabels: false,
        themeVariables: {
          background: '#faf9f5',
          primaryColor: '#efe9de',
          primaryTextColor: '#141413',
          primaryBorderColor: '#c1b6a3',
          secondaryColor: '#e8e0d2',
          tertiaryColor: '#f5f0e8',
          lineColor: '#6c6a64',
          textColor: '#26251f',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '14px',
        },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

// Ids must be unique for the lifetime of the page — mermaid keys internal
// state off them and reuse produces stale or blank output.
let diagramSeq = 0;

function diagramErrorHtml(message: string, source: string): string {
  return (
    `<div class="md-diagram-error">` +
    `<span class="md-diagram-error-title">Diagram could not be rendered — ${escapeHtml(message)}</span>` +
    `<pre><code>${escapeHtml(source)}</code></pre>` +
    `</div>`
  );
}

async function renderDiagram(mermaid: MermaidApi, block: MermaidBlock): Promise<string> {
  const renderId = `md-mmd-${diagramSeq++}`;
  try {
    const { svg } = await mermaid.render(renderId, block.code);
    // The html profile is needed alongside svg because some diagram types
    // place labels in a <foreignObject>. `style` is mermaid's own embedded
    // stylesheet — without it the diagram renders unstyled. Scripts and
    // event-handler attributes are still stripped, which is the actual threat.
    return DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true, html: true },
      ADD_TAGS: ['style'],
    });
  } catch (err) {
    throw new Error(String((err as Error)?.message || err));
  } finally {
    // A failed render can leave its scratch element behind in the body.
    document.getElementById(renderId)?.remove();
    document.getElementById(`d${renderId}`)?.remove();
  }
}

// ── Public API ──────────────────────────────────────────────────────

export async function renderMarkdownToHtml(md: string): Promise<RenderResult> {
  const mermaidBlocks: MermaidBlock[] = [];
  const diagramErrors: string[] = [];

  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      code({ text, lang }: Tokens.Code): string {
        const info = (lang || '').trim().split(/\s+/)[0].toLowerCase();

        if (info === 'mermaid') {
          const id = `mmd-${mermaidBlocks.length}`;
          mermaidBlocks.push({ id, code: text });
          return `<div class="md-mermaid" data-mmd-id="${id}"></div>`;
        }

        const language = resolveLanguage(lang);
        if (language) {
          const { value } = hljs.highlight(text, { language, ignoreIllegals: true });
          return `<pre><span class="md-code-lang">${escapeHtml(language)}</span><code class="hljs">${value}</code></pre>`;
        }

        const label = info ? `<span class="md-code-lang">${escapeHtml(info)}</span>` : '';
        return `<pre>${label}<code>${escapeHtml(text)}</code></pre>`;
      },
    },
  });

  const rawHtml = marked.parse(md, { async: false });

  // Sanitize before any SVG exists, so the HTML and SVG passes stay separate.
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['data-mmd-id', 'target', 'rel'],
  });

  if (mermaidBlocks.length === 0) {
    return { html: safeHtml, diagramErrors };
  }

  const rendered = new Map<string, string>();
  try {
    const mermaid = await loadMermaid();
    for (const block of mermaidBlocks) {
      try {
        rendered.set(block.id, await renderDiagram(mermaid, block));
      } catch (err) {
        const message = String((err as Error)?.message || err);
        diagramErrors.push(message);
        rendered.set(block.id, diagramErrorHtml(message, block.code));
      }
    }
  } catch (err) {
    // The mermaid module itself failed to load — every diagram degrades to a
    // card rather than taking the document down with it.
    const message = `mermaid failed to load (${String((err as Error)?.message || err)})`;
    for (const block of mermaidBlocks) {
      diagramErrors.push(message);
      rendered.set(block.id, diagramErrorHtml(message, block.code));
    }
  }

  // Substitute through the DOM rather than by string replacement, since
  // sanitizing may have normalized the placeholder's attribute order.
  const host = document.createElement('div');
  host.innerHTML = safeHtml;
  host.querySelectorAll<HTMLElement>('[data-mmd-id]').forEach(node => {
    const svg = rendered.get(node.dataset.mmdId ?? '');
    if (svg !== undefined) node.innerHTML = svg;
  });

  return { html: host.innerHTML, diagramErrors };
}

/** True when the document contains at least one mermaid fence — lets the UI
 *  warn that the first render will pull in a large module. */
export function hasMermaidFence(md: string): boolean {
  return /^[ \t]*(`{3,}|~{3,})[ \t]*mermaid\b/im.test(md);
}
