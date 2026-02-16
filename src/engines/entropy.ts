/**
 * Shannon Entropy Calculator
 * Used to detect high-entropy strings that are likely API keys or secrets.
 * Normal English text has entropy ~3.5-4.5 bits/char.
 * API keys / random tokens typically have entropy > 4.5 bits/char.
 */

export function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;

  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Check if a string looks like a high-entropy secret (API key, token, etc.)
 * Threshold: entropy > 4.5 and length >= 20
 */
export function isHighEntropySecret(str: string): boolean {
  if (str.length < 20) return false;
  return shannonEntropy(str) > 4.5;
}
