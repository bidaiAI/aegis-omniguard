/**
 * Multi-Chain Wallet Key Detector
 *
 * Detects private keys for:
 * - Bitcoin (WIF format: Base58Check)
 * - Solana (Base58: 64-byte keypair or 32-byte seed)
 * - Tron (64 hex chars, context-aware)
 * - Ethereum (already handled in dlp_engine.ts, but referenced here)
 *
 * All crypto algorithms are implemented in pure TypeScript with zero dependencies.
 * Uses WebCrypto API for SHA-256 (async) with sync fallback.
 */

import { shannonEntropy } from './entropy';

// ===== Types =====

export interface Web3KeyDetection {
  chain: 'bitcoin' | 'solana' | 'tron' | 'ethereum' | 'unknown';
  keyType: 'private_key' | 'wif' | 'seed' | 'keypair';
  matched: string;
  confidence: number;
  position: { start: number; end: number };
}

// ===== Base58 Codec =====

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP = new Map<string, bigint>();
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP.set(BASE58_ALPHABET[i], BigInt(i));
}

/**
 * Decode a Base58 string to bytes.
 * Returns null if the string contains invalid characters.
 */
export function base58Decode(input: string): Uint8Array | null {
  if (input.length === 0) return new Uint8Array(0);

  // Validate all characters
  for (const char of input) {
    if (!BASE58_MAP.has(char)) return null;
  }

  // Convert to big integer
  let num = 0n;
  for (const char of input) {
    num = num * 58n + BASE58_MAP.get(char)!;
  }

  // Convert big integer to bytes
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }

  // Count leading '1's (Base58 leading zeros)
  let leadingZeros = 0;
  for (const char of input) {
    if (char === '1') leadingZeros++;
    else break;
  }

  // Prepend zero bytes for leading '1's
  const result = new Uint8Array(leadingZeros + bytes.length);
  result.set(new Uint8Array(bytes), leadingZeros);
  return result;
}

// ===== Pure JS SHA-256 (synchronous, for content script context) =====
// Minimal implementation for Base58Check validation

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  // Pre-processing: adding padding bits
  const bitLen = data.length * 8;
  const padLen = ((data.length + 8) % 64 === 0) ? data.length + 8 : data.length + 64 - ((data.length + 8) % 64);
  const padded = new Uint8Array(padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  // Append bit length as 64-bit big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);

  // Process each 512-bit (64-byte) block
  const w = new Int32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getInt32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, h0, false); rv.setUint32(4, h1, false);
  rv.setUint32(8, h2, false); rv.setUint32(12, h3, false);
  rv.setUint32(16, h4, false); rv.setUint32(20, h5, false);
  rv.setUint32(24, h6, false); rv.setUint32(28, h7, false);
  return result;
}

/** Double SHA-256 (used in Bitcoin Base58Check) */
function doubleSha256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

// ===== Base58Check Decoder (Bitcoin) =====

/**
 * Decode Base58Check encoded string.
 * Verifies the 4-byte SHA-256d checksum.
 * Returns version byte + payload, or null if invalid.
 */
export function base58CheckDecode(input: string): { version: number; payload: Uint8Array } | null {
  const decoded = base58Decode(input);
  if (!decoded || decoded.length < 6) return null; // min: 1 version + 1 payload + 4 checksum

  const payload = decoded.slice(0, decoded.length - 4);
  const checksum = decoded.slice(decoded.length - 4);

  const hash = doubleSha256(payload);
  // Verify checksum (first 4 bytes of double SHA-256)
  if (hash[0] !== checksum[0] || hash[1] !== checksum[1] ||
      hash[2] !== checksum[2] || hash[3] !== checksum[3]) {
    return null;
  }

  return {
    version: payload[0],
    payload: payload.slice(1),
  };
}

// ===== Chain-Specific Validators =====

/**
 * Validate Bitcoin WIF (Wallet Import Format) private key.
 * - Starts with '5' (uncompressed, 51 chars) or 'K'/'L' (compressed, 52 chars)
 * - Base58Check with version byte 0x80
 * - Payload is 32 bytes (uncompressed) or 33 bytes (compressed, ends with 0x01)
 */
export function validateBtcWif(candidate: string): Web3KeyDetection | null {
  // Quick format check
  if (candidate.length < 51 || candidate.length > 52) return null;
  if (!/^[5KL]/.test(candidate)) return null;

  const decoded = base58CheckDecode(candidate);
  if (!decoded) return null;

  // Version byte must be 0x80 for mainnet private key
  if (decoded.version !== 0x80) return null;

  // Uncompressed: 32 bytes payload
  // Compressed: 33 bytes payload (last byte is 0x01)
  if (decoded.payload.length === 32) {
    return { chain: 'bitcoin', keyType: 'wif', matched: candidate, confidence: 0.97, position: { start: 0, end: 0 } };
  }
  if (decoded.payload.length === 33 && decoded.payload[32] === 0x01) {
    return { chain: 'bitcoin', keyType: 'wif', matched: candidate, confidence: 0.97, position: { start: 0, end: 0 } };
  }

  return null;
}

/**
 * Validate Solana private key.
 * - Base58 encoded, 87-88 chars for full keypair (64 bytes) or 43-44 chars for seed (32 bytes)
 * - Decoded byte length must be exactly 64 (keypair) or 32 (seed)
 */
export function validateSolanaKey(candidate: string): Web3KeyDetection | null {
  // Only check Base58 strings of expected lengths
  if (candidate.length < 43 || candidate.length > 88) return null;

  // Quick check: all characters must be valid Base58
  for (const char of candidate) {
    if (!BASE58_MAP.has(char)) return null;
  }

  const decoded = base58Decode(candidate);
  if (!decoded) return null;

  // Full keypair: 64 bytes
  if (decoded.length === 64 && candidate.length >= 85) {
    // Check entropy of the first 32 bytes (private key portion)
    const hexStr = Array.from(decoded.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (shannonEntropy(hexStr) > 3.5) {
      return { chain: 'solana', keyType: 'keypair', matched: candidate, confidence: 0.95, position: { start: 0, end: 0 } };
    }
  }

  // Seed/secret key: 32 bytes
  if (decoded.length === 32 && candidate.length >= 42 && candidate.length <= 44) {
    const hexStr = Array.from(decoded).map(b => b.toString(16).padStart(2, '0')).join('');
    if (shannonEntropy(hexStr) > 3.5) {
      return { chain: 'solana', keyType: 'seed', matched: candidate, confidence: 0.90, position: { start: 0, end: 0 } };
    }
  }

  return null;
}

/**
 * Validate Tron private key.
 * - 64 hex characters (same format as Ethereum but without 0x prefix)
 * - High entropy required
 * - Context: Tron keys are indistinguishable from ETH keys in format,
 *   so we label them generically. The main DLP engine handles 0x-prefixed ETH keys.
 *   This catches non-prefixed 64-char hex private keys with high entropy.
 */
export function validateTronKey(candidate: string): Web3KeyDetection | null {
  if (candidate.length !== 64) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(candidate)) return null;

  // Must have high entropy (> 3.5 for hex strings, max possible ~4.0)
  if (shannonEntropy(candidate) > 3.5) {
    return { chain: 'tron', keyType: 'private_key', matched: candidate, confidence: 0.85, position: { start: 0, end: 0 } };
  }

  return null;
}

// ===== Regex Patterns for Pre-filtering =====

const PATTERNS = {
  // Bitcoin WIF: starts with 5 (uncompressed) or K/L (compressed)
  BTC_WIF: /\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/g,

  // Solana keypair (87-88 chars Base58) or seed (43-44 chars Base58)
  SOLANA_KEYPAIR: /\b[1-9A-HJ-NP-Za-km-z]{87,88}\b/g,
  SOLANA_SEED: /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/g,

  // 64-char hex (Tron/ETH without 0x) - shares with HEX_PRIVATE_KEY in constants
  HEX_64: /\b[0-9a-fA-F]{64}\b/g,
};

// ===== Master Scanner =====

/**
 * Scan text for Web3 private keys across all supported chains.
 * Returns all detected keys with chain attribution and confidence.
 */
export function scanWeb3Keys(text: string): Web3KeyDetection[] {
  const detections: Web3KeyDetection[] = [];
  const matchedRanges: Array<{ start: number; end: number }> = [];

  function isOverlapping(start: number, end: number): boolean {
    return matchedRanges.some(r => start < r.end && end > r.start);
  }

  // 1. Bitcoin WIF
  const btcRegex = new RegExp(PATTERNS.BTC_WIF.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = btcRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (isOverlapping(start, end)) continue;

    const result = validateBtcWif(match[0]);
    if (result) {
      result.position = { start, end };
      detections.push(result);
      matchedRanges.push({ start, end });
    }
  }

  // 2. Solana keypair (87-88 chars)
  const solKeypairRegex = new RegExp(PATTERNS.SOLANA_KEYPAIR.source, 'g');
  while ((match = solKeypairRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (isOverlapping(start, end)) continue;

    const result = validateSolanaKey(match[0]);
    if (result) {
      result.position = { start, end };
      detections.push(result);
      matchedRanges.push({ start, end });
    }
  }

  // 3. Solana seed (43-44 chars) - lower priority, more false positives
  const solSeedRegex = new RegExp(PATTERNS.SOLANA_SEED.source, 'g');
  while ((match = solSeedRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (isOverlapping(start, end)) continue;

    const result = validateSolanaKey(match[0]);
    if (result) {
      result.position = { start, end };
      detections.push(result);
      matchedRanges.push({ start, end });
    }
  }

  // 4. Tron / generic 64-char hex (only catch what dlp_engine doesn't already catch)
  // Note: dlp_engine.ts handles 0x-prefixed ETH keys and high-entropy 64-hex.
  // We provide scanWeb3Keys for cases where the caller wants chain-aware labeling.
  const hexRegex = new RegExp(PATTERNS.HEX_64.source, 'g');
  while ((match = hexRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (isOverlapping(start, end)) continue;

    // Skip 0x-prefixed (already handled by ETH detection in dlp_engine)
    if (start > 1 && text.slice(start - 2, start) === '0x') continue;

    const result = validateTronKey(match[0]);
    if (result) {
      result.position = { start, end };
      detections.push(result);
      matchedRanges.push({ start, end });
    }
  }

  return detections;
}
