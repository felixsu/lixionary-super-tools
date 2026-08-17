// Stylesheet for rendered Markdown documents. Everything is namespaced under
// `.md-doc` so it can be injected into the app page (for the live preview)
// without leaking into the surrounding UI.
//
// The same string is used for the preview and for the print iframe — that
// shared source is what keeps "what you see" and "what you get" identical.
// Colors are literal rather than var() references so the sheet stands alone
// inside the iframe; only the fonts reach for the next/font variables, and
// each carries an in-var() fallback so an unresolved variable can't
// invalidate the whole declaration.

export type PageSize = 'A4' | 'Letter';
export type MarginPreset = 'narrow' | 'normal' | 'wide';

export const MARGIN_MM: Record<MarginPreset, number> = {
  narrow: 12,
  normal: 18,
  wide: 25,
};

/** Sizes the printed sheet. Kept out of the preview stylesheet so it can't
 *  affect an ordinary Cmd+P of the app itself. */
export function buildPageCss(pageSize: PageSize, margin: MarginPreset): string {
  return `@page { size: ${pageSize}; margin: ${MARGIN_MM[margin]}mm; }`;
}

export const DOCUMENT_CSS = `
.md-doc {
  --md-sans: var(--font-inter, Inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --md-serif: var(--font-cormorant, "Cormorant Garamond"), Georgia, "Times New Roman", serif;
  --md-mono: var(--font-jetbrains, "JetBrains Mono"), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-family: var(--md-sans);
  font-size: 10.5pt;
  line-height: 1.65;
  color: #26251f;
  /* Without this Chrome drops every background when printing, which would
     blank out table headers and syntax colors. */
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* ── Headings ─────────────────────────────────────────────────────── */
.md-doc h1, .md-doc h2, .md-doc h3, .md-doc h4, .md-doc h5, .md-doc h6 {
  font-family: var(--md-serif);
  font-weight: 500;
  color: #141413;
  line-height: 1.25;
  margin: 1.4em 0 0.5em;
  break-after: avoid;
  page-break-after: avoid;
}
.md-doc > :first-child { margin-top: 0; }
.md-doc h1 { font-size: 23pt; letter-spacing: -0.4px; margin-top: 0; }
.md-doc h2 { font-size: 16.5pt; letter-spacing: -0.2px; padding-bottom: 0.25em; border-bottom: 1px solid #e6dfd8; }
.md-doc h3 { font-size: 13pt; }
.md-doc h4 { font-size: 11.5pt; font-family: var(--md-sans); font-weight: 600; }
.md-doc h5, .md-doc h6 { font-size: 10.5pt; font-family: var(--md-sans); font-weight: 600; color: #3d3d3a; }

/* ── Body copy ────────────────────────────────────────────────────── */
.md-doc p { margin: 0 0 0.85em; orphans: 2; widows: 2; }
.md-doc a { color: #4338ca; text-decoration: underline; text-underline-offset: 2px; }
.md-doc strong { font-weight: 600; color: #141413; }
.md-doc em { font-style: italic; }
.md-doc del { color: #8e8b82; }
.md-doc small { font-size: 0.88em; color: #6c6a64; }
.md-doc hr { border: none; border-top: 1px solid #e6dfd8; margin: 1.8em 0; }

.md-doc ul, .md-doc ol { margin: 0 0 0.85em; padding-left: 1.5em; }
.md-doc li { margin: 0.2em 0; }
.md-doc li > ul, .md-doc li > ol { margin-bottom: 0; }
.md-doc li::marker { color: #6c6a64; }
.md-doc li input[type="checkbox"] { margin-right: 0.45em; accent-color: #4f46e5; }
.md-doc ul:has(> li > input[type="checkbox"]) { list-style: none; padding-left: 0.25em; }

.md-doc blockquote {
  margin: 0 0 0.95em;
  padding: 0.1em 0 0.1em 1.1em;
  border-left: 3px solid #d8cfc0;
  color: #55534c;
  break-inside: avoid;
  page-break-inside: avoid;
}
.md-doc blockquote > :last-child { margin-bottom: 0; }

.md-doc img { max-width: 100%; height: auto; border-radius: 4px; }

/* ── Tables ───────────────────────────────────────────────────────── */
.md-doc table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1.1em;
  font-size: 9.5pt;
  break-inside: avoid;
  page-break-inside: avoid;
}
.md-doc thead th {
  background: #efe9de;
  font-weight: 600;
  color: #141413;
  text-align: left;
}
.md-doc th, .md-doc td {
  border: 1px solid #e0d8ca;
  padding: 6px 10px;
  vertical-align: top;
}
.md-doc tbody tr:nth-child(even) { background: #faf8f4; }

/* ── Code ─────────────────────────────────────────────────────────── */
/* Deliberately light, unlike the app's dark .code-block. That treatment is
   UI chrome; a printed document wants ink-light code. */
.md-doc code {
  font-family: var(--md-mono);
  font-size: 0.88em;
  background: #f0eae0;
  border: 1px solid #e6dfd8;
  border-radius: 4px;
  padding: 0.1em 0.35em;
  color: #3a2f4f;
}
.md-doc pre {
  margin: 0 0 1.1em;
  padding: 12px 14px;
  background: #f7f3ec;
  border: 1px solid #e6dfd8;
  border-radius: 8px;
  overflow-x: auto;
  break-inside: avoid;
  page-break-inside: avoid;
}
.md-doc pre code {
  display: block;
  background: none;
  border: none;
  padding: 0;
  border-radius: 0;
  font-size: 9pt;
  line-height: 1.55;
  color: #26251f;
  white-space: pre-wrap;
  word-break: break-word;
}
.md-doc .md-code-lang {
  display: block;
  font-family: var(--md-sans);
  font-size: 7.5pt;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #8e8b82;
  margin-bottom: 6px;
}

/* highlight.js token palette, tuned to the warm cream + indigo design system. */
.md-doc .hljs-comment, .md-doc .hljs-quote { color: #8e8b82; font-style: italic; }
.md-doc .hljs-keyword, .md-doc .hljs-selector-tag, .md-doc .hljs-literal,
.md-doc .hljs-type, .md-doc .hljs-doctag { color: #5b21b6; font-weight: 500; }
.md-doc .hljs-string, .md-doc .hljs-regexp, .md-doc .hljs-attr-value,
.md-doc .hljs-addition { color: #2f7a52; }
.md-doc .hljs-number, .md-doc .hljs-symbol, .md-doc .hljs-meta,
.md-doc .hljs-bullet { color: #b3563a; }
.md-doc .hljs-title, .md-doc .hljs-name, .md-doc .hljs-section,
.md-doc .hljs-selector-id, .md-doc .hljs-title_, .md-doc .hljs-title.function_ { color: #1e5fa8; font-weight: 500; }
.md-doc .hljs-attr, .md-doc .hljs-variable, .md-doc .hljs-template-variable,
.md-doc .hljs-selector-attr { color: #9a5b1e; }
.md-doc .hljs-built_in, .md-doc .hljs-class .md-doc .hljs-title,
.md-doc .hljs-title.class_ { color: #0d7a6b; }
.md-doc .hljs-tag { color: #6c6a64; }
.md-doc .hljs-deletion { color: #c64545; }
.md-doc .hljs-emphasis { font-style: italic; }
.md-doc .hljs-strong { font-weight: 600; }

/* ── Mermaid ──────────────────────────────────────────────────────── */
.md-doc .md-mermaid {
  margin: 0 0 1.2em;
  text-align: center;
  break-inside: avoid;
  page-break-inside: avoid;
}
.md-doc .md-mermaid svg {
  max-width: 100%;
  height: auto;
}
.md-doc .md-diagram-error {
  margin: 0 0 1.1em;
  padding: 12px 14px;
  background: rgba(198, 69, 69, 0.07);
  border: 1px solid #e0a3a3;
  border-radius: 8px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.md-doc .md-diagram-error-title {
  display: block;
  font-size: 9pt;
  font-weight: 600;
  color: #9b3838;
  margin-bottom: 6px;
}
.md-doc .md-diagram-error pre {
  margin: 0;
  background: #fff;
  border-color: #e6dfd8;
}
`;
