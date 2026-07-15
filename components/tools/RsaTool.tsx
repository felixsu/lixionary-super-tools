'use client';

import { useState } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import {
  derToPem,
  extractPkcs1FromPkcs8,
  generateRsaKeyPair,
  rsaOaepDecrypt,
  rsaOaepEncrypt,
  spkiToSshRsa,
} from '@/lib/crypto-utils';
import Seg from '@/components/ui/Seg';
import CodeBlock from '@/components/ui/CodeBlock';

interface RsaState {
  size: '2048' | '4096';
  format: 'PEM' | 'OpenSSH';
  comment: string;
  publicKey: string;
  privateKey: string;
  cryptMode: 'encrypt' | 'decrypt';
  cryptPublicKey: string;
  cryptPrivateKey: string;
  cryptInput: string;
}

export default function RsaTool() {
  const [state, setState] = usePersistentState<RsaState>('tool:rsa', {
    size: '2048',
    format: 'PEM',
    comment: '',
    publicKey: '',
    privateKey: '',
    cryptMode: 'encrypt',
    cryptPublicKey: '',
    cryptPrivateKey: '',
    cryptInput: '',
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [cryptOutput, setCryptOutput] = useState('');
  const [cryptError, setCryptError] = useState('');

  const runGenerate = () => {
    setGenerating(true);
    setGenError('');
    setState(s => ({ ...s, publicKey: '', privateKey: '' }));
    generateRsaKeyPair(parseInt(state.size, 10))
      .then(({ spki, pkcs8 }) => {
        let pub: string, priv: string;
        if (state.format === 'OpenSSH') {
          pub = spkiToSshRsa(spki, state.comment || '');
          priv = derToPem(extractPkcs1FromPkcs8(pkcs8), 'RSA PRIVATE KEY');
        } else {
          pub = derToPem(spki, 'PUBLIC KEY');
          priv = derToPem(pkcs8, 'PRIVATE KEY');
        }
        // Prefill the encrypt/decrypt section with the fresh PEM pair so the
        // user can try it immediately (OAEP needs SPKI/PKCS#8 PEM).
        const pemPub = derToPem(spki, 'PUBLIC KEY');
        const pemPriv = derToPem(pkcs8, 'PRIVATE KEY');
        setState(s => ({ ...s, publicKey: pub, privateKey: priv, cryptPublicKey: pemPub, cryptPrivateKey: pemPriv }));
        setGenerating(false);
      })
      .catch(e => {
        setGenError(String((e as Error)?.message || e));
        setGenerating(false);
      });
  };

  const runCrypt = () => {
    const p =
      state.cryptMode === 'encrypt'
        ? rsaOaepEncrypt(state.cryptPublicKey, state.cryptInput)
        : rsaOaepDecrypt(state.cryptPrivateKey, state.cryptInput);
    p.then(out => {
      setCryptOutput(out);
      setCryptError('');
    }).catch(() => {
      setCryptOutput('');
      setCryptError(
        state.cryptMode === 'encrypt'
          ? 'Could not encrypt — check the public key (PEM) and note RSA can only encrypt short strings (~190 bytes for a 2048-bit key).'
          : 'Could not decrypt — check the private key (PEM) and that the input is Base64 ciphertext for this key.'
      );
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>RSA key generator</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Generates in your browser &mdash; keys never leave this page.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label className="field-label">Key size</label>
          <select
            className="select"
            style={{ maxWidth: 240 }}
            value={state.size}
            onChange={e => setState(s => ({ ...s, size: e.target.value as RsaState['size'] }))}
          >
            <option value="2048">2048-bit</option>
            <option value="4096">4096-bit</option>
          </select>
        </div>
        <div>
          <label className="field-label">Output format</label>
          <Seg
            options={[
              { value: 'PEM', label: 'PEM' },
              { value: 'OpenSSH', label: 'OpenSSH' },
            ]}
            value={state.format}
            onChange={format => setState(s => ({ ...s, format }))}
          />
        </div>
        {state.format === 'OpenSSH' && (
          <div>
            <label className="field-label">Comment (optional)</label>
            <input
              className="input"
              type="text"
              placeholder="you@example.com"
              value={state.comment}
              onChange={e => setState(s => ({ ...s, comment: e.target.value }))}
              style={{ maxWidth: 420 }}
            />
          </div>
        )}
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={runGenerate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate keypair'}
        </button>
        {genError && <div className="body-sm" style={{ color: 'var(--color-error)' }}>{genError}</div>}
        {state.publicKey && (
          <>
            <div>
              <label className="field-label">Public key</label>
              <CodeBlock text={state.publicKey} />
            </div>
            <div>
              <label className="field-label">Private key</label>
              <CodeBlock text={state.privateKey} />
            </div>
            {state.format === 'OpenSSH' && (
              <div className="body-sm muted">
                OpenSSH mode outputs the public key as an <code className="mono">ssh-rsa</code> wire-format line, and the
                private key as legacy PKCS#1 PEM (the format <code className="mono">ssh-keygen -m PEM</code> produces).
              </div>
            )}
          </>
        )}

        <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 24, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 6 }}>Try it: encrypt &amp; decrypt</div>
            <p className="body-sm muted" style={{ margin: 0 }}>
              RSA-OAEP (SHA-256). Generating a keypair above fills in the PEM keys here automatically.
            </p>
          </div>
          <Seg
            options={[
              { value: 'encrypt', label: 'Encrypt' },
              { value: 'decrypt', label: 'Decrypt' },
            ]}
            value={state.cryptMode}
            onChange={cryptMode => {
              setState(s => ({ ...s, cryptMode }));
              setCryptOutput('');
              setCryptError('');
            }}
          />
          {state.cryptMode === 'encrypt' ? (
            <div>
              <label className="field-label">Public key (PEM)</label>
              <textarea
                className="input"
                rows={5}
                placeholder="-----BEGIN PUBLIC KEY-----"
                value={state.cryptPublicKey}
                onChange={e => setState(s => ({ ...s, cryptPublicKey: e.target.value }))}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            </div>
          ) : (
            <div>
              <label className="field-label">Private key (PEM, PKCS#8)</label>
              <textarea
                className="input"
                rows={5}
                placeholder="-----BEGIN PRIVATE KEY-----"
                value={state.cryptPrivateKey}
                onChange={e => setState(s => ({ ...s, cryptPrivateKey: e.target.value }))}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            </div>
          )}
          <div>
            <label className="field-label">{state.cryptMode === 'encrypt' ? 'Text to encrypt' : 'Ciphertext (Base64)'}</label>
            <textarea
              className="input"
              rows={4}
              placeholder={state.cryptMode === 'encrypt' ? 'Secret message…' : 'Base64 ciphertext…'}
              value={state.cryptInput}
              onChange={e => setState(s => ({ ...s, cryptInput: e.target.value }))}
              style={state.cryptMode === 'decrypt' ? { fontFamily: 'var(--font-mono)', fontSize: 12 } : undefined}
            />
          </div>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={runCrypt}>
            {state.cryptMode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
          </button>
          {cryptError && <div className="body-sm" style={{ color: 'var(--color-error)' }}>{cryptError}</div>}
          {cryptOutput && (
            <div>
              <label className="field-label">{state.cryptMode === 'encrypt' ? 'Encrypted (Base64)' : 'Decrypted text'}</label>
              <CodeBlock text={cryptOutput} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
