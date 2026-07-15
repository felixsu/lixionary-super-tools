'use client';

import { useState } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import Seg from '@/components/ui/Seg';
import CodeBlock from '@/components/ui/CodeBlock';

interface UrlState {
  mode: 'encode' | 'decode';
  scope: 'component' | 'uri';
  input: string;
}

export default function UrlTool() {
  const [state, setState] = usePersistentState<UrlState>('tool:url', {
    mode: 'encode',
    scope: 'component',
    input: '',
  });
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const run = () => {
    try {
      const fn =
        state.mode === 'encode'
          ? state.scope === 'component' ? encodeURIComponent : encodeURI
          : state.scope === 'component' ? decodeURIComponent : decodeURI;
      setOutput(fn(state.input));
      setError('');
    } catch {
      setOutput('');
      setError('Invalid percent-encoding in input.');
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>URL encode / decode</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Percent-encode a string for use in URLs, or decode one back to plain text.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Seg
          options={[
            { value: 'encode', label: 'Encode' },
            { value: 'decode', label: 'Decode' },
          ]}
          value={state.mode}
          onChange={mode => {
            setState(s => ({ ...s, mode }));
            setOutput('');
            setError('');
          }}
        />
        <div>
          <label className="field-label">Mode</label>
          <select
            className="select"
            style={{ maxWidth: 320 }}
            value={state.scope}
            onChange={e => setState(s => ({ ...s, scope: e.target.value as UrlState['scope'] }))}
          >
            <option value="component">Component (encodes / ? & = # too)</option>
            <option value="uri">Full URI (keeps URL structure intact)</option>
          </select>
        </div>
        <div>
          <label className="field-label">Input</label>
          <textarea
            className="input"
            rows={7}
            placeholder={state.mode === 'encode' ? 'Text to encode…' : 'Percent-encoded string…'}
            value={state.input}
            onChange={e => setState(s => ({ ...s, input: e.target.value }))}
          />
        </div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={run}>
          Convert
        </button>
        {error && <div className="body-sm" style={{ color: 'var(--color-error)' }}>{error}</div>}
        {output && (
          <div>
            <label className="field-label">Output</label>
            <CodeBlock text={output} />
          </div>
        )}
      </div>
    </div>
  );
}
