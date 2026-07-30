'use client';

import { useState } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToText,
  fromBase64Url,
  looksBase64Url,
  textToBytes,
  toBase64Url,
  TextEncodingName,
} from '@/lib/crypto-utils';
import Seg from '@/components/ui/Seg';
import Checkbox from '@/components/ui/Checkbox';
import CodeBlock from '@/components/ui/CodeBlock';

interface Base64State {
  mode: 'encode' | 'decode';
  urlSafe: boolean;
  encoding: TextEncodingName;
  input: string;
}

export default function Base64Tool() {
  const [state, setState] = usePersistentState<Base64State>('tool:base64', {
    mode: 'encode',
    urlSafe: false,
    encoding: 'utf-8',
    input: '',
  });
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const run = () => {
    try {
      if (state.mode === 'encode') {
        const bytes = textToBytes(state.input, state.encoding);
        let b64 = bytesToBase64(bytes);
        if (state.urlSafe) b64 = toBase64Url(b64);
        setOutput(b64);
        setError('');
      } else {
        const s = state.input.trim();
        const useUrl = state.urlSafe || looksBase64Url(s);
        const b64 = useUrl ? fromBase64Url(s) : s;
        const bytes = base64ToBytes(b64);
        setOutput(bytesToText(bytes, state.encoding));
        setError('');
      }
    } catch (e) {
      setOutput('');
      setError(state.mode === 'encode' ? String((e as Error)?.message || e) : 'Invalid Base64 input.');
    }
  };

  return (
    <div className="page page--narrow">
      <h1 className="h1" style={{ marginBottom: 8 }}>Base64 encode / decode</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>Convert text to and from Base64.</p>
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
          <label className="field-label">Text encoding</label>
          <select
            className="select"
            style={{ maxWidth: 240 }}
            value={state.encoding}
            onChange={e => setState(s => ({ ...s, encoding: e.target.value as TextEncodingName }))}
          >
            <option value="utf-8">UTF-8</option>
            <option value="latin1">Latin-1 (ISO-8859-1)</option>
          </select>
        </div>
        <Checkbox
          checked={state.urlSafe}
          onChange={urlSafe => setState(s => ({ ...s, urlSafe }))}
          label="URL-safe alphabet (- _ instead of + /)"
        />
        <div>
          <label className="field-label">Input</label>
          <textarea
            className="input"
            rows={7}
            placeholder="Text or Base64…"
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
