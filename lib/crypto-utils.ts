// crypto-utils.ts — shared crypto/encoding helpers for the Lixionary tools app.
// Pure functions only; no DOM. Uses Web Crypto (SubtleCrypto).
// Ported from the design project's crypto-utils.js, plus RSA-OAEP
// encrypt/decrypt and text-encoding helpers.

export type TextEncodingName = 'utf-8' | 'latin1';

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function latin1ToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 0xff) throw new Error(`Character "${str[i]}" cannot be encoded as Latin-1.`);
    bytes[i] = code;
  }
  return bytes;
}

export function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

export function textToBytes(str: string, encoding: TextEncodingName): Uint8Array {
  return encoding === 'latin1' ? latin1ToBytes(str) : utf8ToBytes(str);
}

export function bytesToText(bytes: Uint8Array, encoding: TextEncodingName): string {
  return encoding === 'latin1' ? bytesToLatin1(bytes) : bytesToUtf8(bytes);
}

export function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(b64u: string): string {
  let b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return b64;
}

export function looksBase64Url(str: string): boolean {
  return /[-_]/.test(str) && !/[+/]/.test(str);
}

// ── PEM <-> DER ──────────────────────────────────────────────────────
export function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('-----'))
    .join('');
  return base64ToBytes(b64);
}

export function derToPem(bytes: Uint8Array, label: string): string {
  const b64 = bytesToBase64(bytes);
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) lines.push(b64.slice(i, i + 64));
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

// ── Minimal DER TLV reader (definite-length only) ───────────────────
interface TLV {
  tag: number;
  length: number;
  contentStart: number;
  contentEnd: number;
  nextOffset: number;
}

function readTLV(bytes: Uint8Array, offset: number): TLV {
  const tag = bytes[offset];
  const lenByte = bytes[offset + 1];
  let length: number, lenBytesUsed: number;
  if (lenByte & 0x80) {
    const n = lenByte & 0x7f;
    length = 0;
    for (let i = 0; i < n; i++) length = (length << 8) | bytes[offset + 2 + i];
    lenBytesUsed = 1 + n;
  } else {
    length = lenByte;
    lenBytesUsed = 1;
  }
  const contentStart = offset + 1 + lenBytesUsed;
  const contentEnd = contentStart + length;
  return { tag, length, contentStart, contentEnd, nextOffset: contentEnd };
}

// Extract the inner PKCS#1 RSAPrivateKey DER from a PKCS#8 wrapper.
export function extractPkcs1FromPkcs8(pkcs8Bytes: Uint8Array): Uint8Array {
  let off = 0;
  const outer = readTLV(pkcs8Bytes, off); off = outer.contentStart; // enter outer SEQUENCE
  const version = readTLV(pkcs8Bytes, off); off = version.nextOffset; // INTEGER version
  const algId = readTLV(pkcs8Bytes, off); off = algId.nextOffset; // AlgorithmIdentifier SEQUENCE
  const octStr = readTLV(pkcs8Bytes, off); // OCTET STRING wrapping the PKCS#1 key
  return pkcs8Bytes.slice(octStr.contentStart, octStr.contentEnd);
}

// Build an OpenSSH "ssh-rsa AAAA... comment" line from an SPKI DER public key.
export function spkiToSshRsa(spkiBytes: Uint8Array, comment: string): string {
  let off = 0;
  const outer = readTLV(spkiBytes, off); off = outer.contentStart;
  const algId = readTLV(spkiBytes, off); off = algId.nextOffset;
  const bitStr = readTLV(spkiBytes, off);
  const rsaSeqStart = bitStr.contentStart + 1; // skip the "unused bits" byte
  const rsaSeq = readTLV(spkiBytes, rsaSeqStart);
  let p = rsaSeq.contentStart;
  const modulus = readTLV(spkiBytes, p); p = modulus.nextOffset;
  const exponent = readTLV(spkiBytes, p);
  const n = spkiBytes.slice(modulus.contentStart, modulus.contentEnd);
  const e = spkiBytes.slice(exponent.contentStart, exponent.contentEnd);

  function u32be(v: number): Uint8Array {
    return new Uint8Array([(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]);
  }
  function concat(...arrs: Uint8Array[]): Uint8Array {
    const total = arrs.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  }
  function sshStr(buf: Uint8Array): Uint8Array { return concat(u32be(buf.length), buf); }

  const wire = concat(sshStr(utf8ToBytes('ssh-rsa')), sshStr(e), sshStr(n));
  return `ssh-rsa ${bytesToBase64(wire)}${comment ? ' ' + comment : ''}`;
}

// ── HMAC ─────────────────────────────────────────────────────────────
export async function hmacSignBase64(secret: string, message: string, hashName: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(secret) as BufferSource, { name: 'HMAC', hash: hashName }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, utf8ToBytes(message) as BufferSource);
  return bytesToBase64(new Uint8Array(sig));
}

// ── JWT ──────────────────────────────────────────────────────────────
export function jwtSegmentEncode(obj: unknown): string {
  return toBase64Url(bytesToBase64(utf8ToBytes(JSON.stringify(obj))));
}

export async function signJwtHS(headerObj: object, payloadObj: object, secret: string, hashName: string): Promise<string> {
  const signingInput = `${jwtSegmentEncode(headerObj)}.${jwtSegmentEncode(payloadObj)}`;
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(secret) as BufferSource, { name: 'HMAC', hash: hashName }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, utf8ToBytes(signingInput) as BufferSource);
  return `${signingInput}.${toBase64Url(bytesToBase64(new Uint8Array(sig)))}`;
}

export async function signJwtRS(headerObj: object, payloadObj: object, privatePem: string, hashName: string): Promise<string> {
  const der = pemToDer(privatePem);
  const key = await crypto.subtle.importKey('pkcs8', der as BufferSource, { name: 'RSASSA-PKCS1-v1_5', hash: hashName }, false, ['sign']);
  const signingInput = `${jwtSegmentEncode(headerObj)}.${jwtSegmentEncode(payloadObj)}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8ToBytes(signingInput) as BufferSource);
  return `${signingInput}.${toBase64Url(bytesToBase64(new Uint8Array(sig)))}`;
}

export async function verifyJwtHS(token: string, secret: string, hashName: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(secret) as BufferSource, { name: 'HMAC', hash: hashName }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, utf8ToBytes(`${parts[0]}.${parts[1]}`) as BufferSource);
  return toBase64Url(bytesToBase64(new Uint8Array(sig))) === parts[2];
}

export async function verifyJwtRS(token: string, publicPem: string, hashName: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const der = pemToDer(publicPem);
  const key = await crypto.subtle.importKey('spki', der as BufferSource, { name: 'RSASSA-PKCS1-v1_5', hash: hashName }, false, ['verify']);
  const sigBytes = base64ToBytes(fromBase64Url(parts[2]));
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBytes as BufferSource, utf8ToBytes(`${parts[0]}.${parts[1]}`) as BufferSource);
}

// ── Randomness ───────────────────────────────────────────────────────
// Uniform random integer in [0, n) using crypto.getRandomValues with
// rejection sampling, so results aren't skewed by modulo bias.
export function randomInt(n: number): number {
  if (!Number.isInteger(n) || n <= 0) throw new Error('n must be a positive integer');
  const maxUint32 = 0xFFFFFFFF;
  const limit = maxUint32 - (maxUint32 % n);
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
}

// ── RSA key generation ───────────────────────────────────────────────
export async function generateRsaKeyPair(modulusLength: number): Promise<{ spki: Uint8Array; pkcs8: Uint8Array }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
  return { spki, pkcs8 };
}

// ── RSA-OAEP encrypt / decrypt ───────────────────────────────────────
// The SPKI/PKCS#8 key material carries the generic rsaEncryption OID, so
// keys produced by generateRsaKeyPair import fine under RSA-OAEP too.
export async function rsaOaepEncrypt(publicPem: string, text: string): Promise<string> {
  const der = pemToDer(publicPem);
  const key = await crypto.subtle.importKey('spki', der as BufferSource, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt('RSA-OAEP', key, utf8ToBytes(text) as BufferSource);
  return bytesToBase64(new Uint8Array(cipher));
}

export async function rsaOaepDecrypt(privatePem: string, b64Cipher: string): Promise<string> {
  const der = pemToDer(privatePem);
  const key = await crypto.subtle.importKey('pkcs8', der as BufferSource, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt('RSA-OAEP', key, base64ToBytes(b64Cipher.trim()) as BufferSource);
  return bytesToUtf8(new Uint8Array(plain));
}
