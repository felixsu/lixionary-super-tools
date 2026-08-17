// Tool registry — single source of truth for ids, categories, and search metadata.

export type ToolId = 'base64' | 'url' | 'hmac' | 'jwt' | 'rsa' | 'coin' | 'dice' | 'password' | 'json-formatter' | 'yaml-formatter' | 'text-diff' | 'checksum' | 'uuid' | 'md-to-pdf';

export interface ToolDef {
  id: ToolId;
  category: string;
  name: string;
  /** Short name shown in the tab strip. */
  tabName: string;
  description: string;
  /** lucide icon name mapped in components/ToolIcon.tsx */
  icon: string;
  keywords: string[];
}

export const CATEGORIES = ['Encoding/Decoding', 'Cryptography', 'Random', 'Text'] as const;

export const MAX_FAVORITES = 6;

export const TOOLS: ToolDef[] = [
  {
    id: 'base64',
    category: 'Encoding/Decoding',
    name: 'Base64 encode / decode',
    tabName: 'Base64',
    description: 'Convert text to and from Base64, with a URL-safe option and selectable text encoding.',
    icon: 'binary',
    keywords: ['b64', 'base 64', 'atob', 'btoa', 'encode', 'decode'],
  },
  {
    id: 'url',
    category: 'Encoding/Decoding',
    name: 'URL encode / decode',
    tabName: 'URL',
    description: 'Percent-encode a string for URLs, or decode one back to plain text.',
    icon: 'link',
    keywords: ['uri', 'percent', 'escape', 'query string', 'encode', 'decode'],
  },
  {
    id: 'hmac',
    category: 'Cryptography',
    name: 'HMAC generator',
    tabName: 'HMAC',
    description: 'Sign a message with a secret key and get matching Python, Node and Java code.',
    icon: 'key-round',
    keywords: ['signature', 'sha256', 'sha384', 'sha512', 'sign', 'mac'],
  },
  {
    id: 'jwt',
    category: 'Cryptography',
    name: 'JWT decode & generate',
    tabName: 'JWT',
    description: "Inspect a token's header and payload, verify its signature, or build a new one.",
    icon: 'shield-check',
    keywords: ['json web token', 'jot', 'bearer', 'hs256', 'rs256', 'verify'],
  },
  {
    id: 'rsa',
    category: 'Cryptography',
    name: 'RSA key generator',
    tabName: 'RSA keys',
    description: 'Generate an RSA keypair as PEM or OpenSSH output, then encrypt and decrypt text with it.',
    icon: 'key',
    keywords: ['keypair', 'public key', 'private key', 'pem', 'ssh', 'encrypt', 'decrypt', 'oaep'],
  },
  {
    id: 'coin',
    category: 'Random',
    name: 'Coin toss',
    tabName: 'Coin toss',
    description: 'Flip a coin and watch the histogram converge toward 50/50 as trials add up.',
    icon: 'circle-dollar-sign',
    keywords: ['flip', 'heads', 'tails', 'random', 'simulate'],
  },
  {
    id: 'dice',
    category: 'Random',
    name: 'Dice roll',
    tabName: 'Dice roll',
    description: 'Roll a 6-sided die and verify the random distribution with a live histogram.',
    icon: 'dices',
    keywords: ['die', 'd6', 'roll', 'random', 'simulate'],
  },
  {
    id: 'password',
    category: 'Random',
    name: 'Password generator',
    tabName: 'Password',
    description: 'Generate secure random passwords with customizable length, numbers, symbols, and casing.',
    icon: 'lock',
    keywords: ['pass', 'password', 'gen', 'generator', 'security', 'random'],
  },
  {
    id: 'json-formatter',
    category: 'Text',
    name: 'JSON Formatter & Validator',
    tabName: 'JSON Formatter',
    description: 'Format, minify, sort keys, and convert JSON to YAML. Navigate nodes interactively to extract JSONPaths.',
    icon: 'binary',
    keywords: ['json', 'format', 'pretty', 'minify', 'yaml', 'validate', 'tree'],
  },
  {
    id: 'yaml-formatter',
    category: 'Text',
    name: 'YAML Formatter & Validator',
    tabName: 'YAML Formatter',
    description: 'Format, sort keys, validate, and convert YAML to JSON. Navigate nodes interactively to extract JSONPaths.',
    icon: 'file-text',
    keywords: ['yaml', 'yml', 'format', 'pretty', 'json', 'convert', 'tree'],
  },
  {
    id: 'text-diff',
    category: 'Text',
    name: 'Text Diff',
    tabName: 'Diff',
    description: 'Compare two texts line-by-line and character-by-character with Split and Unified layout modes.',
    icon: 'split',
    keywords: ['diff', 'compare', 'text', 'git', 'merge', 'split', 'unified'],
  },
  {
    id: 'checksum',
    category: 'Cryptography',
    name: 'File Checksum Generator',
    tabName: 'Checksum',
    description: 'Compute MD5, SHA-1, SHA-256, and SHA-512 checksums for files up to 4GB. Progress and speeds are updated in real-time.',
    icon: 'shield-check',
    keywords: ['checksum', 'file', 'hash', 'md5', 'sha', 'sha256', 'sha512', 'sha1'],
  },
  {
    id: 'uuid',
    category: 'Random',
    name: 'UUID Generator',
    tabName: 'UUID',
    description: 'Generate Universally Unique Identifiers (UUID v4, v5, and v7) in bulk, with support for seeds and namespaces.',
    icon: 'hash',
    keywords: ['uuid', 'guid', 'id', 'generate', 'random', 'v4', 'v7', 'v5'],
  },
  {
    id: 'md-to-pdf',
    category: 'Text',
    name: 'Markdown to PDF',
    tabName: 'MD → PDF',
    description: 'Turn a Markdown file into a typeset PDF. Mermaid fences render as diagrams, tables as tables, and code fences get syntax highlighting.',
    icon: 'file-down',
    keywords: ['markdown', 'md', 'pdf', 'export', 'print', 'mermaid', 'document', 'convert', 'diagram'],
  },
];

export const TOOLS_BY_ID: Record<string, ToolDef> = Object.fromEntries(TOOLS.map(t => [t.id, t]));

export function isToolId(id: string): id is ToolId {
  return id in TOOLS_BY_ID;
}
