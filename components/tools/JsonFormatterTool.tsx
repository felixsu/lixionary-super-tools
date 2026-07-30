'use client';

import { useState, useEffect } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import Seg from '@/components/ui/Seg';
import CodeBlock from '@/components/ui/CodeBlock';
import { ChevronDown, ChevronRight, Copy, Check, Info, FileText } from 'lucide-react';

// --- Type Definitions ---
type FormatMode = 'pretty' | 'minify' | 'sort' | 'yaml';

interface ParsedError {
  message: string;
  line: number;
  column: number;
  preview: string;
}

// --- JSON Parsing & Error Approximation ---
function parseJsonWithErrorLocation(jsonStr: string): { data: any; error: ParsedError | null } {
  try {
    const data = JSON.parse(jsonStr);
    return { data, error: null };
  } catch (e: any) {
    const message = e.message || String(e);
    let line = 1;
    let column = 1;
    let pos = -1;

    // Detect character index (V8 / Chrome error style: "at position 123")
    const posMatch = message.match(/at position (\d+)/i);
    if (posMatch) {
      pos = parseInt(posMatch[1], 10);
    } else {
      // Detect line/col (Firefox/Safari style: "line 5 column 10")
      const lineColMatch = message.match(/line (\d+) column (\d+)/i) || message.match(/line (\d+) col (\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      }
    }

    const lines = jsonStr.split('\n');

    if (pos !== -1) {
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const currentLineLength = lines[i].length + 1; // +1 for newline character
        if (charCount + currentLineLength > pos) {
          line = i + 1;
          column = pos - charCount + 1;
          break;
        }
        charCount += currentLineLength;
      }
    }

    const errorLineText = lines[line - 1] || '';
    const pad = ' '.repeat(Math.max(0, column - 1));
    const preview = `Line ${line}:\n${errorLineText}\n${pad}^`;

    return {
      data: null,
      error: {
        message,
        line,
        column,
        preview,
      },
    };
  }
}

// --- Sort JSON Keys Recursively ---
function sortJsonKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortJsonKeys);
  }
  const sortedObj: any = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sortedObj[key] = sortJsonKeys(obj[key]);
    });
  return sortedObj;
}

// --- JSON to YAML Serializer ---
function jsonToYaml(val: any, indent = 0): string {
  const spaces = ' '.repeat(indent);
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    if (val.includes('\n')) {
      return '|\n' + val.split('\n').map(line => ' '.repeat(indent + 2) + line).join('\n');
    }
    if (/[#:\-?|>&\*!\n\r\t]/.test(val) || val.trim() !== val) {
      return JSON.stringify(val);
    }
    return val || "''";
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return '\n' + val.map(item => {
      const itemYaml = jsonToYaml(item, indent + 2).trimStart();
      return `${spaces}- ${itemYaml}`;
    }).join('\n');
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    return '\n' + keys.map(key => {
      const formattedKey = /^[a-zA-Z0-9_\-]+$/.test(key) ? key : JSON.stringify(key);
      const valYaml = jsonToYaml(val[key], indent + 2);
      if (valYaml.startsWith('\n')) {
        return `${spaces}${formattedKey}:${valYaml}`;
      } else {
        return `${spaces}${formattedKey}: ${valYaml.trimStart()}`;
      }
    }).join('\n');
  }
  return '';
}

// --- Recursive JSON Tree Node ---
function JsonTreeNode({
  val,
  name,
  path,
  selectedPath,
  onSelectPath,
  expandTrigger,
  collapseTrigger,
  isLast = true,
}: {
  val: any;
  name: string | number;
  path: string;
  selectedPath: string;
  onSelectPath: (path: string) => void;
  expandTrigger: number;
  collapseTrigger: number;
  isLast?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (expandTrigger > 0) setIsCollapsed(false);
  }, [expandTrigger]);

  useEffect(() => {
    if (collapseTrigger > 0) setIsCollapsed(true);
  }, [collapseTrigger]);

  const isObject = val !== null && typeof val === 'object';
  const isArray = Array.isArray(val);
  const isSelected = selectedPath === path;

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPath(path);
  };

  const renderPrimitive = (value: any) => {
    if (value === null) return <span style={{ color: 'var(--color-muted)' }}>null</span>;
    if (typeof value === 'boolean') return <span style={{ color: '#7c3aed', fontWeight: 500 }}>{value ? 'true' : 'false'}</span>;
    if (typeof value === 'number') return <span style={{ color: '#d97706', fontFamily: 'var(--font-mono)' }}>{value}</span>;
    return <span style={{ color: '#16a34a' }}>{JSON.stringify(value)}</span>;
  };

  // Node key layout
  const renderKey = () => {
    if (typeof name === 'number') {
      return <span style={{ color: 'var(--color-muted-soft)', marginRight: 6 }}>{name}:</span>;
    }
    return (
      <span style={{ color: 'var(--color-primary)', fontWeight: 500, marginRight: 6 }}>
        &quot;{name}&quot;:
      </span>
    );
  };

  if (!isObject) {
    return (
      <div
        onClick={handleSelect}
        style={{
          padding: '2px 4px',
          borderRadius: 4,
          background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'baseline',
          marginLeft: 16,
          fontSize: 13,
        }}
      >
        {renderKey()}
        {renderPrimitive(val)}
        {!isLast && <span style={{ color: 'var(--color-muted-soft)' }}>,</span>}
      </div>
    );
  }

  const keys = Object.keys(val);
  const length = keys.length;

  return (
    <div style={{ marginLeft: name === '$' ? 0 : 16, fontSize: 13 }}>
      <div
        onClick={handleSelect}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '2px 4px',
          borderRadius: 4,
          background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
          cursor: 'pointer',
        }}
      >
        <button
          onClick={toggleCollapse}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
            color: 'var(--color-muted)',
            width: 16,
            height: 16,
          }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {name !== '$' && renderKey()}
        <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>
          {isArray ? '[' : '{'}
        </span>

        {isCollapsed && (
          <span style={{ color: 'var(--color-muted-soft)', fontSize: 12, fontStyle: 'italic', marginLeft: 4 }}>
            {isArray ? `${length} items` : `${length} keys`}
          </span>
        )}

        {isCollapsed && (
          <span style={{ color: 'var(--color-muted)', fontWeight: 500, marginLeft: 4 }}>
            {isArray ? ']' : '}'}
            {!isLast && ','}
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div style={{ borderLeft: '1px dashed var(--color-hairline)', marginLeft: 11, paddingLeft: 4 }}>
          {isArray
            ? val.map((item, idx) => {
                const childPath = path === '$' ? `$[${idx}]` : `${path}[${idx}]`;
                return (
                  <JsonTreeNode
                    key={idx}
                    val={item}
                    name={idx}
                    path={childPath}
                    selectedPath={selectedPath}
                    onSelectPath={onSelectPath}
                    expandTrigger={expandTrigger}
                    collapseTrigger={collapseTrigger}
                    isLast={idx === val.length - 1}
                  />
                );
              })
            : keys.map((key, idx) => {
                const childPath = path === '$' ? `$.${key}` : `${path}.${key}`;
                return (
                  <JsonTreeNode
                    key={key}
                    val={val[key]}
                    name={key}
                    path={childPath}
                    selectedPath={selectedPath}
                    onSelectPath={onSelectPath}
                    expandTrigger={expandTrigger}
                    collapseTrigger={collapseTrigger}
                    isLast={idx === keys.length - 1}
                  />
                );
              })}
        </div>
      )}

      {!isCollapsed && (
        <div style={{ marginLeft: 16, color: 'var(--color-muted)', fontWeight: 500, padding: '2px 4px' }}>
          {isArray ? ']' : '}'}
          {!isLast && ','}
        </div>
      )}
    </div>
  );
}

// --- Main JSON Formatter Tool View ---
export default function JsonFormatterTool() {
  const [input, setInput] = usePersistentState<string>('tool:json-formatter:input', '');
  const [formatMode, setFormatMode] = usePersistentState<FormatMode>('tool:json-formatter:mode', 'pretty');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [expandTrigger, setExpandTrigger] = useState(0);
  const [collapseTrigger, setCollapseTrigger] = useState(0);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);

  // Clear path selection when input changes
  useEffect(() => {
    setSelectedPath('');
  }, [input]);

  const handleClear = () => {
    setInput('');
    setSelectedPath('');
  };

  const loadSample = () => {
    const sample = {
      store: {
        book: [
          {
            category: 'reference',
            author: 'Nigel Rees',
            title: 'Sayings of the Century',
            price: 8.95,
          },
          {
            category: 'fiction',
            author: 'Evelyn Waugh',
            title: 'Sword of Honour',
            price: 12.99,
          },
        ],
        bicycle: {
          color: 'red',
          price: 19.95,
        },
      },
      status: 'active',
      count: 2,
    };
    setInput(JSON.stringify(sample, null, 2));
  };

  const copyPath = async () => {
    if (!selectedPath) return;
    try {
      await navigator.clipboard.writeText(selectedPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    } catch {
      // ignore
    }
  };

  // Perform parsing and formatting
  const trimmed = input.trim();
  let parsed: any = null;
  let parseError: ParsedError | null = null;
  let formattedOutput = '';

  if (trimmed) {
    const { data, error } = parseJsonWithErrorLocation(trimmed);
    parsed = data;
    parseError = error;

    if (!parseError) {
      try {
        if (formatMode === 'pretty') {
          formattedOutput = JSON.stringify(parsed, null, 2);
        } else if (formatMode === 'minify') {
          formattedOutput = JSON.stringify(parsed);
        } else if (formatMode === 'sort') {
          const sorted = sortJsonKeys(parsed);
          formattedOutput = JSON.stringify(sorted, null, 2);
        } else if (formatMode === 'yaml') {
          formattedOutput = jsonToYaml(parsed).trim();
        }
      } catch (err) {
        parseError = {
          message: 'Error formatting JSON: ' + String(err),
          line: 1,
          column: 1,
          preview: '',
        };
      }
    }
  }

  const copyFormatted = async () => {
    if (!formattedOutput) return;
    try {
      await navigator.clipboard.writeText(formattedOutput);
      setCopiedFormatted(true);
      setTimeout(() => setCopiedFormatted(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="page page--wide">
      <h1 className="h1" style={{ marginBottom: 8 }}>JSON Formatter &amp; Validator</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Format, minify, sort object keys, and convert JSON to YAML. Explore paths interactively.
      </p>

      <div className="pane-grid">
        {/* Left Column: Input */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label" style={{ marginBottom: 0 }}>Input JSON</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ padding: '0 8px', height: 32, fontSize: 13 }} onClick={loadSample}>
                Load sample
              </button>
              <button className="btn btn-ghost" style={{ padding: '0 8px', height: 32, fontSize: 13 }} onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>

          <textarea
            className="input mono"
            rows={20}
            placeholder='Paste JSON here... (e.g. { "name": "Ada" })'
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ fontSize: 13, resize: 'vertical', minHeight: 400, flex: 1 }}
          />
        </div>

        {/* Right Column: Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label" style={{ marginBottom: 0 }}>Formatter Output</label>
            {formattedOutput && (
              <button
                className="btn btn-secondary"
                style={{ height: 32, fontSize: 13, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={copyFormatted}
              >
                {copiedFormatted ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                Copy formatted
              </button>
            )}
          </div>

          <Seg
            options={[
              { value: 'pretty', label: 'Pretty (Tree)' },
              { value: 'sort', label: 'Sort Keys' },
              { value: 'minify', label: 'Minify' },
              { value: 'yaml', label: 'YAML' },
            ]}
            value={formatMode}
            onChange={setFormatMode}
          />

          {!trimmed && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 340, color: 'var(--color-muted-soft)', gap: 12 }}>
              <FileText size={48} strokeWidth={1} />
              <p className="body-sm" style={{ margin: 0 }}>Enter JSON on the left to display output.</p>
            </div>
          )}

          {trimmed && parseError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(198, 69, 69, 0.08)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Info size={18} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-error)', fontSize: 14 }}>Invalid JSON</span>
                  <span className="body-sm" style={{ color: 'var(--color-body)' }}>{parseError.message}</span>
                </div>
              </div>

              {parseError.preview && (
                <div>
                  <label className="field-label">Error context approximation</label>
                  <pre
                    className="code-block"
                    style={{
                      margin: 0,
                      padding: 16,
                      fontSize: 13,
                      border: '1px solid var(--color-error)',
                      background: 'var(--color-surface-dark)',
                    }}
                  >
                    {parseError.preview}
                  </pre>
                </div>
              )}
            </div>
          )}

          {trimmed && !parseError && (
            <>
              {/* Pretty Tree View & Sort Keys Tree View */}
              {(formatMode === 'pretty' || formatMode === 'sort') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  {/* Tree Commands */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                        onClick={() => {
                          setExpandTrigger(t => t + 1);
                          setCollapseTrigger(0);
                        }}
                      >
                        Expand all
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                        onClick={() => {
                          setCollapseTrigger(t => t + 1);
                          setExpandTrigger(0);
                        }}
                      >
                        Collapse all
                      </button>
                    </div>
                  </div>

                  {/* Selected JSONPath */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--color-surface-soft)',
                      border: '1px solid var(--color-hairline)',
                      borderRadius: 8,
                      minHeight: 40,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span className="caption-up" style={{ fontSize: 10, letterSpacing: 0.5 }}>Path:</span>
                      <span className="mono" style={{ fontSize: 12, color: selectedPath ? 'var(--color-primary)' : 'var(--color-muted)', wordBreak: 'break-all', fontWeight: 500 }}>
                        {selectedPath || 'Click a node to copy path'}
                      </span>
                    </div>
                    {selectedPath && (
                      <button
                        onClick={copyPath}
                        className="btn btn-icon"
                        style={{ width: 24, height: 24, border: 'none', background: 'transparent' }}
                        aria-label="Copy JSONPath"
                      >
                        {copiedPath ? (
                          <Check size={12} style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <Copy size={12} style={{ color: 'var(--color-muted)' }} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Tree Layout container */}
                  <div
                    className="code-block"
                    style={{
                      background: 'var(--color-canvas)',
                      border: '1px solid var(--color-hairline)',
                      color: 'var(--color-ink)',
                      padding: 16,
                      borderRadius: 12,
                      overflowX: 'auto',
                      maxHeight: 500,
                      minHeight: 340,
                      flex: 1,
                    }}
                  >
                    <JsonTreeNode
                      val={formatMode === 'sort' ? sortJsonKeys(parsed) : parsed}
                      name="$"
                      path="$"
                      selectedPath={selectedPath}
                      onSelectPath={setSelectedPath}
                      expandTrigger={expandTrigger}
                      collapseTrigger={collapseTrigger}
                    />
                  </div>
                </div>
              )}

              {/* Minified view */}
              {formatMode === 'minify' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <CodeBlock text={formattedOutput} />
                </div>
              )}

              {/* YAML view */}
              {formatMode === 'yaml' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <CodeBlock text={formattedOutput} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
