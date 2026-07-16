'use client';

import { useState, useRef } from 'react';
import { createMD5, createSHA1, createSHA256, createSHA512 } from 'hash-wasm';
import { Check, Copy, File, HelpCircle, Info, UploadCloud, X } from 'lucide-react';

const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB
const CHUNK_SIZE = 16 * 1024 * 1024; // 16MB

interface HashResults {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function ChecksumTool() {
  const [file, setFile] = useState<File | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [processed, setProcessed] = useState(0);
  const [results, setResults] = useState<HashResults | null>(null);
  const [error, setError] = useState('');
  const [compareHash, setCompareHash] = useState('');
  const [copiedKey, setCopiedKey] = useState<keyof HashResults | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAbortedRef = useRef(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (calculating) return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      selectFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (calculating) return;
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      selectFile(selectedFile);
    }
  };

  const selectFile = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds the 4GB limit.');
      setFile(null);
      setResults(null);
      return;
    }
    setFile(selectedFile);
    setError('');
    setResults(null);
    setProgress(0);
    setProcessed(0);
    setCompareHash('');
  };

  const cancelHashing = () => {
    isAbortedRef.current = true;
    setCalculating(false);
    setProgress(0);
    setProcessed(0);
    setRemaining(null);
    setSpeed(0);
  };

  const startHashing = async () => {
    if (!file) return;
    setCalculating(true);
    setError('');
    setResults(null);
    setProgress(0);
    setProcessed(0);
    isAbortedRef.current = false;

    try {
      const md5Hasher = await createMD5();
      const sha1Hasher = await createSHA1();
      const sha256Hasher = await createSHA256();
      const sha512Hasher = await createSHA512();

      md5Hasher.init();
      sha1Hasher.init();
      sha256Hasher.init();
      sha512Hasher.init();

      const startTime = performance.now();
      let offset = 0;
      const fileReader = new FileReader();

      const readChunk = () => {
        if (isAbortedRef.current) {
          return;
        }

        if (offset >= file.size) {
          const hashes: HashResults = {
            md5: md5Hasher.digest(),
            sha1: sha1Hasher.digest(),
            sha256: sha256Hasher.digest(),
            sha512: sha512Hasher.digest(),
          };
          setResults(hashes);
          setCalculating(false);
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        fileReader.onload = (e) => {
          if (isAbortedRef.current) return;
          if (e.target?.result instanceof ArrayBuffer) {
            const chunk = new Uint8Array(e.target.result);
            md5Hasher.update(chunk);
            sha1Hasher.update(chunk);
            sha256Hasher.update(chunk);
            sha512Hasher.update(chunk);

            offset += chunk.length;
            setProcessed(offset);

            const elapsed = (performance.now() - startTime) / 1000;
            const currentProgress = (offset / file.size) * 100;
            const currentSpeed = offset / (1024 * 1024) / elapsed; // MB/s
            const currentRemaining = (file.size - offset) / (offset / elapsed); // seconds

            setProgress(currentProgress);
            setSpeed(currentSpeed);
            setRemaining(currentRemaining);

            setTimeout(readChunk, 0);
          }
        };

        fileReader.onerror = () => {
          setError('Error reading file contents.');
          setCalculating(false);
        };

        fileReader.readAsArrayBuffer(slice);
      };

      readChunk();
    } catch (err) {
      setError('Could not initialize hash algorithms: ' + String(err));
      setCalculating(false);
    }
  };

  const copyToClipboard = async (text: string, key: keyof HashResults) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // ignore
    }
  };

  const removeFile = () => {
    if (calculating) cancelHashing();
    setFile(null);
    setResults(null);
    setProgress(0);
    setProcessed(0);
    setCompareHash('');
    setError('');
  };

  // Compare pasted hash with computed ones
  const cleanedCompare = compareHash.trim().toLowerCase();
  let matchAlgorithm = '';
  if (results && cleanedCompare) {
    if (cleanedCompare === results.md5) matchAlgorithm = 'MD5';
    else if (cleanedCompare === results.sha1) matchAlgorithm = 'SHA-1';
    else if (cleanedCompare === results.sha256) matchAlgorithm = 'SHA-256';
    else if (cleanedCompare === results.sha512) matchAlgorithm = 'SHA-512';
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>File Checksum Generator</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>
        Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes for files up to 4GB locally in your browser.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Upload Zone */}
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--color-hairline)',
              borderRadius: 12,
              padding: '60px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--color-surface-soft)',
              transition: 'border-color 150ms ease, background-color 150ms ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
            className="hover-card"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <UploadCloud size={48} style={{ color: 'var(--color-primary)' }} />
            <div>
              <p className="title-md" style={{ margin: '0 0 4px' }}>Drag &amp; drop file here</p>
              <p className="body-sm muted" style={{ margin: 0 }}>or click to browse from your computer</p>
            </div>
            <p className="caption" style={{ color: 'var(--color-muted-soft)', margin: 0 }}>Max file size: 4GB</p>
          </div>
        ) : (
          /* File Selected Card */
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div className="tool-icon-wrap" style={{ width: 44, height: 44, background: 'var(--color-canvas)', flexShrink: 0 }}>
                <File size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 4 }}>
                <span className="title-md" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </span>
                <span className="body-sm muted">{formatBytes(file.size)}</span>
              </div>
            </div>
            {!calculating && (
              <button className="btn-icon" onClick={removeFile} aria-label="Remove file">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(198, 69, 69, 0.08)',
              border: '1px solid var(--color-error)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Info size={18} style={{ color: 'var(--color-error)' }} />
            <span className="body-sm" style={{ color: 'var(--color-error)', fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Calculate triggers */}
        {file && !calculating && !results && (
          <button className="btn btn-primary" onClick={startHashing} style={{ alignSelf: 'flex-start' }}>
            Calculate checksums
          </button>
        )}

        {/* Hashing Progress Card */}
        {calculating && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="title-md" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Calculating Checksums...
              </span>
              <button
                className="btn btn-ghost"
                onClick={cancelHashing}
                style={{ color: 'var(--color-error)', padding: '0 8px', height: 32, fontSize: 13 }}
              >
                Cancel
              </button>
            </div>

            {/* Progress line */}
            <div style={{ width: '100%', height: 8, background: 'var(--color-surface-soft)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--color-primary)',
                  borderRadius: 4,
                  transition: 'width 100ms ease-out',
                }}
              />
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="caption-up" style={{ fontSize: 10 }}>Progress</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{progress.toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="caption-up" style={{ fontSize: 10 }}>Speed</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{speed.toFixed(1)} MB/s</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="caption-up" style={{ fontSize: 10 }}>Remaining</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
                  {remaining !== null && remaining > 0 ? `${Math.ceil(remaining)}s` : 'Calculating...'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="caption-up" style={{ fontSize: 10 }}>Processed</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{formatBytes(processed)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Checksum Results Table */}
        {results && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 className="title-md">Generated checksums</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(['md5', 'sha1', 'sha256', 'sha512'] as const).map((key) => {
                const label = key.toUpperCase();
                const hashValue = results[key];

                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className="field-label" style={{ marginBottom: 0 }}>{label}</label>
                    <div
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
                      <span
                        className="mono"
                        style={{
                          fontSize: 12.5,
                          color: 'var(--color-ink)',
                          wordBreak: 'break-all',
                          userSelect: 'all',
                        }}
                      >
                        {hashValue}
                      </span>
                      <button
                        onClick={() => copyToClipboard(hashValue, key)}
                        className="btn btn-icon"
                        style={{ width: 28, height: 28, border: 'none', background: 'transparent', flexShrink: 0 }}
                        aria-label={`Copy ${label} hash`}
                      >
                        {copiedKey === key ? (
                          <Check size={14} style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <Copy size={14} style={{ color: 'var(--color-muted)' }} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compare Checksum Box */}
            <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
                Compare checksum
                <span title="Paste a hash here to verify it matches any of the calculated ones." style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                  <HelpCircle size={14} style={{ color: 'var(--color-muted-soft)' }} />
                </span>
              </label>

              <input
                type="text"
                className="input mono"
                placeholder="Paste expected checksum here to compare..."
                value={compareHash}
                onChange={(e) => setCompareHash(e.target.value)}
                style={{ fontSize: 13 }}
              />

              {cleanedCompare && (
                <div style={{ marginTop: 4 }}>
                  {matchAlgorithm ? (
                    <span className="badge badge-success" style={{ padding: '4px 12px', fontSize: 13, fontWeight: 500 }}>
                      <span className="badge-dot" />
                      ✓ Matches {matchAlgorithm}
                    </span>
                  ) : (
                    <span className="badge badge-error" style={{ padding: '4px 12px', fontSize: 13, fontWeight: 500 }}>
                      <span className="badge-dot" />
                      ✗ No match found
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
