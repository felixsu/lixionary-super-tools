'use client';

import { useState, useEffect } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';
import Seg from '@/components/ui/Seg';
import Checkbox from '@/components/ui/Checkbox';
import CodeBlock from '@/components/ui/CodeBlock';
import { RefreshCw } from 'lucide-react';

// --- Type Definitions ---
type UuidVersion = 'v4' | 'v5' | 'v7';
type CasingMode = 'lowercase' | 'uppercase';

const NAMESPACE_PRESETS = [
  { value: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', label: 'DNS (Domain Name)' },
  { value: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', label: 'URL (Web Address)' },
  { value: '6ba7b812-9dad-11d1-80b4-00c04fd430c8', label: 'OID (ISO Object ID)' },
  { value: '6ba7b814-9dad-11d1-80b4-00c04fd430c8', label: 'X.500 (Distinguished Name)' },
];

// --- Mulberry32 PRNG (Repeatable Float Generator) ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper to convert byte array to UUID string
function bytesToUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  bytes.forEach((b) => {
    hex.push(b.toString(16).padStart(2, '0'));
  });
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

// Helper to convert UUID string to byte array
function uuidToBytes(uuid: string): Uint8Array {
  const clean = uuid.replace(/-/g, '');
  if (clean.length !== 32) {
    throw new Error('Invalid UUID length.');
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    const val = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    if (isNaN(val)) throw new Error('Invalid hexadecimal characters.');
    bytes[i] = val;
  }
  return bytes;
}

// SHA-1 digest wrapper using browser SubtleCrypto API
async function sha1(data: Uint8Array): Promise<Uint8Array> {
  const buffer = await window.crypto.subtle.digest('SHA-1', data as unknown as BufferSource);
  return new Uint8Array(buffer);
}

// --- UUID Generation Logic ---

function generateV4(randByte: () => number): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = randByte();
  }
  // ver = 4 (0100)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // var = RFC 4122 variant (10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

function generateV7(randByte: () => number, timestampMs: number): string {
  const bytes = new Uint8Array(16);

  // unix_ts_ms (48 bits / 6 bytes)
  const ts = BigInt(timestampMs);
  for (let i = 0; i < 6; i++) {
    bytes[i] = Number((ts >> BigInt((5 - i) * 8)) & BigInt(0xff));
  }

  // random parts (10 bytes)
  for (let i = 6; i < 16; i++) {
    bytes[i] = randByte();
  }

  // ver = 7 (0111)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // var = RFC 4122 variant (10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

async function generateV5(namespaceUuid: string, name: string): Promise<string> {
  const nsBytes = uuidToBytes(namespaceUuid);
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(nsBytes.length + nameBytes.length);
  data.set(nsBytes);
  data.set(nameBytes, nsBytes.length);

  const hash = await sha1(data);
  const bytes = hash.slice(0, 16);

  // ver = 5 (0101)
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  // var = RFC 4122 variant (10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

// --- Main Uuid Component ---
export default function UuidTool() {
  const [version, setVersion] = usePersistentState<UuidVersion>('tool:uuid:version', 'v4');
  const [quantity, setQuantity] = usePersistentState<number>('tool:uuid:quantity', 10);
  const [useSeed, setUseSeed] = usePersistentState<boolean>('tool:uuid:use-seed', false);
  const [seed, setSeed] = usePersistentState<number>('tool:uuid:seed', 42);
  const [namespaceUuid, setNamespaceUuid] = usePersistentState<string>('tool:uuid:namespace', NAMESPACE_PRESETS[0].value);
  const [nameString, setNameString] = usePersistentState<string>('tool:uuid:name', 'hello-lixionary');
  const [casing, setCasing] = usePersistentState<CasingMode>('tool:uuid:casing', 'lowercase');

  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 2000000000));
  };

  const handleGenerate = async () => {
    setError('');
    setOutput('');

    try {
      const uuids: string[] = [];
      const timestampBase = Date.now();

      // Setup byte randomizer
      let randByte: () => number;
      if (useSeed && (version === 'v4' || version === 'v7')) {
        const randFloat = mulberry32(seed);
        randByte = () => Math.floor(randFloat() * 256);
      } else {
        const buf = new Uint8Array(1);
        randByte = () => {
          window.crypto.getRandomValues(buf);
          return buf[0];
        };
      }

      if (version === 'v4') {
        for (let q = 0; q < quantity; q++) {
          uuids.push(generateV4(randByte));
        }
      } else if (version === 'v7') {
        for (let q = 0; q < quantity; q++) {
          // Increment timestamp to make them strictly monotonic if generated in bulk
          uuids.push(generateV7(randByte, timestampBase + q));
        }
      } else if (version === 'v5') {
        // v5 requires name-based input. If bulk generating v5 with single name, they are all the same,
        // so we append the index suffix if quantity > 1 to make them distinct!
        for (let q = 0; q < quantity; q++) {
          const suffix = quantity > 1 ? `-${q}` : '';
          const name = nameString + suffix;
          const uuidStr = await generateV5(namespaceUuid, name);
          uuids.push(uuidStr);
        }
      }

      let formattedList = uuids.join('\n');
      if (casing === 'uppercase') {
        formattedList = formattedList.toUpperCase();
      }
      setOutput(formattedList);
    } catch (err: any) {
      setError(err?.message || 'Error generating UUIDs. Check namespace format.');
    }
  };

  // Generate on load once client mounts
  useEffect(() => {
    if (isClient && !output && !error) {
      handleGenerate();
    }
  }, [isClient, version]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>UUID Generator</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Generate Universally Unique Identifiers (UUIDs) natively in your browser.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Version Selector */}
          <div>
            <label className="field-label">UUID version</label>
            <Seg
              options={[
                { value: 'v4', label: 'v4 (Random)' },
                { value: 'v7', label: 'v7 (Time-Ordered)' },
                { value: 'v5', label: 'v5 (Name-Based)' },
              ]}
              value={version}
              onChange={(v) => {
                setVersion(v);
                setOutput('');
              }}
            />
          </div>

          {/* Quantity Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 0 }}>
              <span>Quantity</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{quantity}</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                type="range"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer', height: 6 }}
              />
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) ? 1 : Math.max(1, Math.min(100, val)));
                }}
                className="input"
                style={{ width: 70, textAlign: 'center', height: 36, padding: '0 8px' }}
              />
            </div>
          </div>

          {/* Seeding Section (v4 / v7 only) */}
          {(version === 'v4' || version === 'v7') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--color-hairline)', paddingTop: 18 }}>
              <Checkbox checked={useSeed} onChange={setUseSeed} label="Use seed (reproducible/repeatable UUIDs)" />
              {useSeed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <input
                    type="number"
                    className="input"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
                    style={{ maxWidth: 200, height: 36 }}
                    placeholder="Enter seed number..."
                  />
                  <button className="btn btn-secondary" style={{ height: 36, padding: '0 12px' }} onClick={randomizeSeed}>
                    <RefreshCw size={14} />
                    Randomize seed
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Namespace Section (v5 only) */}
          {version === 'v5' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--color-hairline)', paddingTop: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="field-label">Namespace Preset</label>
                  <select
                    className="select"
                    value={namespaceUuid}
                    onChange={(e) => setNamespaceUuid(e.target.value)}
                    style={{ height: 36 }}
                  >
                    {NAMESPACE_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Custom Namespace UUID</label>
                  <input
                    type="text"
                    className="input mono"
                    value={namespaceUuid}
                    onChange={(e) => setNamespaceUuid(e.target.value)}
                    style={{ height: 36, fontSize: 12 }}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Name string</label>
                <input
                  type="text"
                  className="input"
                  value={nameString}
                  onChange={(e) => setNameString(e.target.value)}
                  style={{ height: 36 }}
                  placeholder="e.g. hello-world"
                />
                {quantity > 1 && (
                  <p className="caption muted" style={{ marginTop: 6, fontStyle: 'italic' }}>
                    Bulk quantity is active: output names will append sequence indices (e.g. &quot;{nameString}-0&quot;, &quot;{nameString}-1&quot;) to ensure distinct outputs.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Casing Toggles */}
          <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 18 }}>
            <label className="field-label">Output format casing</label>
            <Seg
              options={[
                { value: 'lowercase', label: 'Lowercase (standard)' },
                { value: 'uppercase', label: 'Uppercase' },
              ]}
              value={casing}
              onChange={setCasing}
            />
          </div>

          <button className="btn btn-primary" onClick={handleGenerate} style={{ alignSelf: 'flex-start' }}>
            Generate UUIDs
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(198, 69, 69, 0.08)',
              border: '1px solid var(--color-error)',
              borderRadius: 8,
            }}
          >
            <span className="body-sm" style={{ color: 'var(--color-error)', fontWeight: 500 }}>
              {error}
            </span>
          </div>
        )}

        {output && (
          <div>
            <label className="field-label">Generated UUIDs ({output.split('\n').length})</label>
            <CodeBlock text={output} />
          </div>
        )}
      </div>
    </div>
  );
}
