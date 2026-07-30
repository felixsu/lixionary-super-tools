'use client';

import { useEffect, useState } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import Checkbox from '@/components/ui/Checkbox';
import CodeBlock from '@/components/ui/CodeBlock';
import { Check, Copy, Trash2 } from 'lucide-react';

function generateSecurePassword({
  length,
  uppercase,
  lowercase,
  numbers,
  symbols,
  excludeAmbiguous,
}: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}): string {
  let lowerPool = 'abcdefghijklmnopqrstuvwxyz';
  let upperPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let numberPool = '0123456789';
  let symbolPool = '!@#$%^&*()_+-=[]{}|;:\',.<>?/';

  if (excludeAmbiguous) {
    lowerPool = lowerPool.replace(/[lo]/g, '');
    upperPool = upperPool.replace(/[IO]/g, '');
    numberPool = numberPool.replace(/[01]/g, '');
  }

  const activePools: { pool: string; required: boolean }[] = [];
  if (lowercase) activePools.push({ pool: lowerPool, required: true });
  if (uppercase) activePools.push({ pool: upperPool, required: true });
  if (numbers) activePools.push({ pool: numbers ? numberPool : '', required: true });
  if (symbols) activePools.push({ pool: symbols ? symbolPool : '', required: true });

  const activePoolsClean = activePools.filter(ap => ap.pool.length > 0);

  if (activePoolsClean.length === 0) {
    throw new Error('Please select at least one character set.');
  }

  const fullPool = activePoolsClean.map(ap => ap.pool).join('');
  const passwordChars: string[] = [];

  const randomBytes = new Uint32Array(length + 10);
  window.crypto.getRandomValues(randomBytes);

  let byteIdx = 0;

  activePoolsClean.forEach(ap => {
    const val = randomBytes[byteIdx++];
    const charIdx = val % ap.pool.length;
    passwordChars.push(ap.pool[charIdx]);
  });

  while (passwordChars.length < length) {
    const val = randomBytes[byteIdx++];
    const charIdx = val % fullPool.length;
    passwordChars.push(fullPool[charIdx]);
  }

  const shuffleBytes = new Uint32Array(passwordChars.length);
  window.crypto.getRandomValues(shuffleBytes);

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  return passwordChars.join('');
}

function calculatePasswordStrength({
  length,
  uppercase,
  lowercase,
  numbers,
  symbols,
}: {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}): 'Weak' | 'Medium' | 'Strong' {
  const activeCount = [uppercase, lowercase, numbers, symbols].filter(Boolean).length;
  if (length < 10 || activeCount <= 1) {
    return 'Weak';
  }
  if (length >= 14 && activeCount >= 3) {
    return 'Strong';
  }
  return 'Medium';
}

export default function PasswordTool() {
  const [length, setLength] = usePersistentState<number>('tool:password:length', 16);
  const [uppercase, setUppercase] = usePersistentState<boolean>('tool:password:uppercase', true);
  const [lowercase, setLowercase] = usePersistentState<boolean>('tool:password:lowercase', true);
  const [numbers, setNumbers] = usePersistentState<boolean>('tool:password:numbers', true);
  const [symbols, setSymbols] = usePersistentState<boolean>('tool:password:symbols', true);
  const [excludeAmbiguous, setExcludeAmbiguous] = usePersistentState<boolean>('tool:password:excludeAmbiguous', false);
  const [history, setHistory] = usePersistentState<string[]>('tool:password:history', []);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = () => {
    try {
      const pass = generateSecurePassword({
        length,
        uppercase,
        lowercase,
        numbers,
        symbols,
        excludeAmbiguous,
      });
      setPassword(pass);
      setError('');
      setHistory(prev => {
        const next = [pass, ...prev];
        return next.slice(0, 20);
      });
    } catch (e) {
      setPassword('');
      setError((e as Error).message || 'Failed to generate password.');
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // ignore
    }
  };

  // Generate initial password once settings load
  useEffect(() => {
    if (!password) {
      try {
        const pass = generateSecurePassword({
          length,
          uppercase,
          lowercase,
          numbers,
          symbols,
          excludeAmbiguous,
        });
        setPassword(pass);
      } catch {
        // ignore
      }
    }
  }, [password, length, uppercase, lowercase, numbers, symbols, excludeAmbiguous]);

  const strength = calculatePasswordStrength({ length, uppercase, lowercase, numbers, symbols });
  const strengthClass =
    strength === 'Strong' ? 'badge-success' : strength === 'Medium' ? 'badge-info' : 'badge-error';

  return (
    <div className="page page--form">
      <h1 className="h1" style={{ marginBottom: 8 }}>Password generator</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Generate secure, random passwords. Everything is computed locally inside the browser.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 28 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 0 }}>
              <span>Password length</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{length}</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                type="range"
                min={8}
                max={128}
                value={length}
                onChange={e => setLength(parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer', height: 6 }}
              />
              <input
                type="number"
                min={8}
                max={128}
                value={length}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setLength(isNaN(val) ? 8 : Math.max(8, Math.min(128, val)));
                }}
                className="input"
                style={{ width: 70, textAlign: 'center', height: 36, padding: '0 8px' }}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Characters to include</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              <Checkbox checked={uppercase} onChange={setUppercase} label="Uppercase letters (A-Z)" />
              <Checkbox checked={lowercase} onChange={setLowercase} label="Lowercase letters (a-z)" />
              <Checkbox checked={numbers} onChange={setNumbers} label="Numbers (0-9)" />
              <Checkbox checked={symbols} onChange={setSymbols} label="Symbols (!@#$%^&*…)" />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 18 }}>
            <Checkbox
              checked={excludeAmbiguous}
              onChange={setExcludeAmbiguous}
              label="Avoid ambiguous characters (1, l, I, 0, O, o)"
            />
          </div>

          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleGenerate}>
            Generate password
          </button>
        </div>

        {error && <div className="body-sm" style={{ color: 'var(--color-error)' }}>{error}</div>}

        {password && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="field-label" style={{ marginBottom: 0 }}>Generated password</span>
                <span className={`badge ${strengthClass}`}>
                  <span className="badge-dot" />
                  {strength} Strength
                </span>
              </div>
              <CodeBlock text={password} />
            </div>
          </div>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Password history
              <span className="caption" style={{ color: 'var(--color-muted)' }}>({history.length}/20)</span>
            </h2>
            {history.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-error)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '0 8px', height: 32 }}
                onClick={() => setHistory([])}
              >
                <Trash2 size={14} />
                Clear history
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="body-sm muted" style={{ textAlign: 'center', margin: '20px 0' }}>
              No passwords generated yet in this session.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((pass, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 8,
                    gap: 12,
                  }}
                >
                  <span className="mono" style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--color-ink)' }}>
                    {pass}
                  </span>
                  <button
                    onClick={() => copyToClipboard(pass, index)}
                    className="btn btn-icon"
                    style={{ width: 28, height: 28, border: 'none', background: 'transparent' }}
                    aria-label="Copy password"
                  >
                    {copiedIndex === index ? (
                      <Check size={14} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <Copy size={14} style={{ color: 'var(--color-muted)' }} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
