'use client';

import { useState } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import { hmacSignBase64 } from '@/lib/crypto-utils';
import Seg from '@/components/ui/Seg';
import CodeBlock from '@/components/ui/CodeBlock';

interface HmacState {
  secret: string;
  message: string;
  algo: 'SHA-256' | 'SHA-384' | 'SHA-512';
  langTab: 'python' | 'node' | 'java';
}

function escStr(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export default function HmacTool() {
  const [state, setState] = usePersistentState<HmacState>('tool:hmac', {
    secret: '',
    message: '',
    algo: 'SHA-256',
    langTab: 'python',
  });
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const run = () => {
    if (!state.secret) {
      setError('Enter a secret key.');
      setOutput('');
      return;
    }
    hmacSignBase64(state.secret, state.message, state.algo)
      .then(out => {
        setOutput(out);
        setError('');
      })
      .catch(e => {
        setError(String((e as Error)?.message || e));
        setOutput('');
      });
  };

  const secret = escStr(state.secret || 'your-secret-key');
  const message = escStr(state.message || 'your-message');
  const pyHash = { 'SHA-256': 'sha256', 'SHA-384': 'sha384', 'SHA-512': 'sha512' }[state.algo];
  const javaAlgo = { 'SHA-256': 'HmacSHA256', 'SHA-384': 'HmacSHA384', 'SHA-512': 'HmacSHA512' }[state.algo];

  const pythonCode = `import hmac, hashlib, base64\n\nsecret = "${secret}".encode()\nmessage = "${message}".encode()\n\ndigest = hmac.new(secret, message, hashlib.${pyHash}).digest()\nprint(base64.b64encode(digest).decode())`;
  const nodeCode = `const crypto = require('crypto');\n\nconst secret = "${secret}";\nconst message = "${message}";\n\nconst signature = crypto\n  .createHmac('${pyHash}', secret)\n  .update(message)\n  .digest('base64');\n\nconsole.log(signature);`;
  const javaCode = `import javax.crypto.Mac;\nimport javax.crypto.spec.SecretKeySpec;\nimport java.util.Base64;\n\nMac mac = Mac.getInstance("${javaAlgo}");\nmac.init(new SecretKeySpec("${secret}".getBytes(), "${javaAlgo}"));\nbyte[] digest = mac.doFinal("${message}".getBytes());\nSystem.out.println(Base64.getEncoder().encodeToString(digest));`;

  const codeByTab = { python: pythonCode, node: nodeCode, java: javaCode };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>HMAC generator</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>Sign a message with a secret key.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label className="field-label">Secret key</label>
          <input
            className="input"
            type="text"
            placeholder="your-secret-key"
            value={state.secret}
            onChange={e => setState(s => ({ ...s, secret: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">Message</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Message to sign…"
            value={state.message}
            onChange={e => setState(s => ({ ...s, message: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">Algorithm</label>
          <select
            className="select"
            value={state.algo}
            onChange={e => setState(s => ({ ...s, algo: e.target.value as HmacState['algo'] }))}
          >
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-384">SHA-384</option>
            <option value="SHA-512">SHA-512</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={run}>
          Generate HMAC
        </button>
        {error && <div className="body-sm" style={{ color: 'var(--color-error)' }}>{error}</div>}
        {output && (
          <div>
            <label className="field-label">HMAC (Base64)</label>
            <CodeBlock text={output} />
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 24, marginTop: 4 }}>
          <label className="field-label">Same thing in code</label>
          <Seg
            style={{ marginBottom: 14 }}
            options={[
              { value: 'python', label: 'Python' },
              { value: 'node', label: 'Node' },
              { value: 'java', label: 'Java' },
            ]}
            value={state.langTab}
            onChange={langTab => setState(s => ({ ...s, langTab }))}
          />
          <CodeBlock text={codeByTab[state.langTab]} wrap={false} />
        </div>
      </div>
    </div>
  );
}
