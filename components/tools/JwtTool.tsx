'use client';

import { useState } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import {
  base64ToBytes,
  bytesToUtf8,
  fromBase64Url,
  signJwtHS,
  signJwtRS,
  verifyJwtHS,
  verifyJwtRS,
} from '@/lib/crypto-utils';
import Seg from '@/components/ui/Seg';
import CodeBlock from '@/components/ui/CodeBlock';

const DEFAULT_PAYLOAD = '{\n  "sub": "user-123",\n  "name": "Ada Lovelace",\n  "iat": 1700000000,\n  "exp": 1700003600\n}';

const HASH_BY_ALG: Record<string, string> = {
  HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512',
  RS256: 'SHA-256', RS384: 'SHA-384', RS512: 'SHA-512',
};

interface JwtState {
  subTab: 'decode' | 'generate';
  decodeInput: string;
  verifyKey: string;
  genAlgo: 'HS256' | 'RS256';
  genPayload: string;
  genKey: string;
}

interface Decoded {
  headerJson: string;
  payloadJson: string;
  algo: string;
}

function decodeToken(token: string): { decoded: Decoded | null; error: string } {
  const t = (token || '').trim();
  if (!t) return { decoded: null, error: '' };
  try {
    const parts = t.split('.');
    if (parts.length < 2) throw new Error('Expected a dot-separated JWT.');
    const header = JSON.parse(bytesToUtf8(base64ToBytes(fromBase64Url(parts[0]))));
    const payload = JSON.parse(bytesToUtf8(base64ToBytes(fromBase64Url(parts[1]))));
    return {
      decoded: {
        headerJson: JSON.stringify(header, null, 2),
        payloadJson: JSON.stringify(payload, null, 2),
        algo: header.alg || '',
      },
      error: '',
    };
  } catch (e) {
    return { decoded: null, error: 'Could not parse token: ' + ((e as Error)?.message || e) };
  }
}

export default function JwtTool() {
  const [state, setState] = usePersistentState<JwtState>('tool:jwt', {
    subTab: 'decode',
    decodeInput: '',
    verifyKey: '',
    genAlgo: 'HS256',
    genPayload: DEFAULT_PAYLOAD,
    genKey: '',
  });
  const [verifyResult, setVerifyResult] = useState<'valid' | 'invalid' | 'error' | null>(null);
  const [genOutput, setGenOutput] = useState('');
  const [genError, setGenError] = useState('');

  const { decoded, error: decodeError } = decodeToken(state.decodeInput);
  const algo = decoded?.algo || '';
  const isHS = algo.startsWith('HS');
  const isRS = algo.startsWith('RS');

  const runVerify = () => {
    if (!algo) return;
    const hash = HASH_BY_ALG[algo] || 'SHA-256';
    const token = state.decodeInput.trim();
    const p = isHS ? verifyJwtHS(token, state.verifyKey, hash) : verifyJwtRS(token, state.verifyKey, hash);
    p.then(ok => setVerifyResult(ok ? 'valid' : 'invalid')).catch(() => setVerifyResult('error'));
  };

  const runGenerate = () => {
    let payloadObj: object;
    try {
      payloadObj = JSON.parse(state.genPayload);
    } catch {
      setGenError('Payload must be valid JSON.');
      setGenOutput('');
      return;
    }
    if (!state.genKey) {
      setGenError(state.genAlgo === 'HS256' ? 'Enter a secret key.' : 'Paste a private key (PEM).');
      setGenOutput('');
      return;
    }
    const header = { alg: state.genAlgo, typ: 'JWT' };
    const p = state.genAlgo === 'HS256'
      ? signJwtHS(header, payloadObj, state.genKey, 'SHA-256')
      : signJwtRS(header, payloadObj, state.genKey, 'SHA-256');
    p.then(token => {
      setGenOutput(token);
      setGenError('');
    }).catch(e => {
      setGenError(String((e as Error)?.message || e));
      setGenOutput('');
    });
  };

  return (
    <div className="page page--md">
      <h1 className="h1" style={{ marginBottom: 8 }}>JWT decode &amp; generate</h1>
      <p className="body-md muted" style={{ margin: '0 0 24px' }}>Inspect, verify or build a JSON Web Token.</p>

      <Seg
        style={{ marginBottom: 24 }}
        options={[
          { value: 'decode', label: 'Decode' },
          { value: 'generate', label: 'Generate' },
        ]}
        value={state.subTab}
        onChange={subTab => setState(s => ({ ...s, subTab }))}
      />

      {state.subTab === 'decode' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="field-label">Token</label>
            <textarea
              className="input"
              rows={4}
              placeholder="eyJhbGciOi…"
              value={state.decodeInput}
              onChange={e => {
                setState(s => ({ ...s, decodeInput: e.target.value }));
                setVerifyResult(null);
              }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </div>
          {decodeError && <div className="body-sm" style={{ color: 'var(--color-error)' }}>{decodeError}</div>}
          {decoded && (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="field-label" style={{ marginBottom: 0 }}>Algorithm</span>
                <span className="badge badge-info"><span className="badge-dot" />{decoded.algo}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="field-label">Header</label>
                  <CodeBlock text={decoded.headerJson} wrap={false} />
                </div>
                <div>
                  <label className="field-label">Payload</label>
                  <CodeBlock text={decoded.payloadJson} wrap={false} />
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 24 }}>
                <label className="field-label">Verify signature</label>
                {isHS && (
                  <input
                    className="input"
                    type="text"
                    placeholder="Secret key"
                    value={state.verifyKey}
                    onChange={e => {
                      setState(s => ({ ...s, verifyKey: e.target.value }));
                      setVerifyResult(null);
                    }}
                    style={{ marginBottom: 14, maxWidth: 420 }}
                  />
                )}
                {isRS && (
                  <textarea
                    className="input"
                    rows={5}
                    placeholder="-----BEGIN PUBLIC KEY-----"
                    value={state.verifyKey}
                    onChange={e => {
                      setState(s => ({ ...s, verifyKey: e.target.value }));
                      setVerifyResult(null);
                    }}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 14, maxWidth: 480 }}
                  />
                )}
                <div>
                  <button className="btn btn-secondary" onClick={runVerify}>Verify signature</button>
                </div>
                {verifyResult === 'valid' && (
                  <div style={{ marginTop: 12 }}><span className="badge badge-success"><span className="badge-dot" />Signature valid</span></div>
                )}
                {verifyResult === 'invalid' && (
                  <div style={{ marginTop: 12 }}><span className="badge badge-error"><span className="badge-dot" />Signature invalid</span></div>
                )}
                {verifyResult === 'error' && (
                  <div style={{ marginTop: 12 }}><span className="badge badge-error"><span className="badge-dot" />Could not verify &mdash; check the key format</span></div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {state.subTab === 'generate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="field-label">Algorithm</label>
            <select
              className="select"
              style={{ maxWidth: 320 }}
              value={state.genAlgo}
              onChange={e => {
                setState(s => ({ ...s, genAlgo: e.target.value as JwtState['genAlgo'] }));
                setGenOutput('');
                setGenError('');
              }}
            >
              <option value="HS256">HS256 (HMAC secret)</option>
              <option value="RS256">RS256 (RSA private key)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Header (auto)</label>
            <CodeBlock text={JSON.stringify({ alg: state.genAlgo, typ: 'JWT' }, null, 2)} wrap={false} />
          </div>
          <div>
            <label className="field-label">Payload (JSON)</label>
            <textarea
              className="input"
              rows={7}
              value={state.genPayload}
              onChange={e => setState(s => ({ ...s, genPayload: e.target.value }))}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </div>
          {state.genAlgo === 'HS256' ? (
            <div>
              <label className="field-label">Secret key</label>
              <input
                className="input"
                type="text"
                placeholder="your-secret-key"
                value={state.genKey}
                onChange={e => setState(s => ({ ...s, genKey: e.target.value }))}
                style={{ maxWidth: 420 }}
              />
            </div>
          ) : (
            <div>
              <label className="field-label">Private key (PEM, PKCS#8)</label>
              <textarea
                className="input"
                rows={7}
                placeholder="-----BEGIN PRIVATE KEY-----"
                value={state.genKey}
                onChange={e => setState(s => ({ ...s, genKey: e.target.value }))}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
              <div className="body-sm muted" style={{ marginTop: 6 }}>
                Generate one with the RSA key generator tool (PEM format), then paste it here.
              </div>
            </div>
          )}
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={runGenerate}>
            Generate token
          </button>
          {genError && <div className="body-sm" style={{ color: 'var(--color-error)' }}>{genError}</div>}
          {genOutput && (
            <div>
              <label className="field-label">Token</label>
              <CodeBlock text={genOutput} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
