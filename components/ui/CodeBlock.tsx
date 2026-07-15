'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CodeBlock({ text, wrap = true }: { text: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  return (
    <div className="code-block">
      <button className="copy-btn" onClick={copy} aria-label="Copy to clipboard">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: wrap ? 'break-all' : 'normal', paddingRight: 32 }}>
        {text}
      </div>
    </div>
  );
}
