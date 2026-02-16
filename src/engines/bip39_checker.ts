/**
 * BIP-39 Mnemonic Phrase Detector
 * Loads the 2048-word English wordlist and checks if a sequence
 * of 12 or 24 words are all valid BIP-39 words.
 *
 * This prevents false positives from normal English text -
 * only triggers when ALL words in the sequence match the wordlist.
 */

import wordlistData from '../assets/wordlists/english.json';

// Build a Set for O(1) lookup
const BIP39_WORDSET: Set<string> = new Set(wordlistData);

/**
 * Check if a string contains a valid BIP-39 mnemonic phrase
 * Returns the matched mnemonic if found, null otherwise
 */
export function detectMnemonic(text: string): string | null {
  const words = text.toLowerCase().trim().split(/\s+/);

  // Need at least 12 words to be a candidate
  if (words.length < 12) return null;

  // Try to find a sliding window of 12 or 24 consecutive BIP-39 words
  for (const windowSize of [24, 12]) {
    if (words.length < windowSize) continue;

    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize);
      if (window.every((w) => BIP39_WORDSET.has(w))) {
        return window.join(' ');
      }
    }
  }

  return null;
}

/**
 * Check if a single word exists in the BIP-39 wordlist
 */
export function isBip39Word(word: string): boolean {
  return BIP39_WORDSET.has(word.toLowerCase());
}
