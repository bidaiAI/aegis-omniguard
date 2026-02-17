/**
 * BIP-39 Mnemonic Phrase Detector
 * Loads the 2048-word English wordlist and checks if a sequence
 * of 12 or 24 words are all valid BIP-39 words.
 *
 * This prevents false positives from normal English text -
 * only triggers when ALL words in the sequence match the wordlist.
 *
 * Multi-language support:
 *   - English: loaded synchronously (fast path)
 *   - Chinese Simplified: loaded lazily via async import (avoids bundle bloat)
 */

import wordlistData from '../assets/wordlists/english.json';

// Build a Set for O(1) lookup
const BIP39_WORDSET: Set<string> = new Set(wordlistData);

// ===== Chinese Wordlist (lazy loaded) =====

let chineseWordset: Set<string> | null = null;
let chineseLoadPromise: Promise<Set<string>> | null = null;

async function loadChineseWordlist(): Promise<Set<string>> {
  if (chineseWordset) return chineseWordset;
  if (chineseLoadPromise) return chineseLoadPromise;

  chineseLoadPromise = (async () => {
    try {
      const module = await import('../assets/wordlists/chinese_simplified.json');
      const words: string[] = module.default || module;
      chineseWordset = new Set(words);
      return chineseWordset;
    } catch (err) {
      console.warn('[Aegis] Failed to load Chinese BIP-39 wordlist:', err);
      chineseWordset = new Set();
      return chineseWordset;
    }
  })();

  return chineseLoadPromise;
}

// ===== Detection Functions =====

/**
 * Sliding window detector: checks if any window of `windowSize` consecutive tokens
 * are all present in the given wordset.
 */
function findMnemonicWindow(tokens: string[], wordset: Set<string>): string | null {
  for (const windowSize of [24, 12]) {
    if (tokens.length < windowSize) continue;

    for (let i = 0; i <= tokens.length - windowSize; i++) {
      const window = tokens.slice(i, i + windowSize);
      if (window.every((w) => wordset.has(w))) {
        return window.join(' ');
      }
    }
  }
  return null;
}

/**
 * Check if a string contains a valid BIP-39 mnemonic phrase (English)
 * Returns the matched mnemonic if found, null otherwise
 *
 * Synchronous - uses pre-loaded English wordlist for fast scanning.
 */
export function detectMnemonic(text: string): string | null {
  const words = text.toLowerCase().trim().split(/\s+/);

  // Need at least 12 words to be a candidate
  if (words.length < 12) return null;

  return findMnemonicWindow(words, BIP39_WORDSET);
}

/**
 * Async multi-language mnemonic detection.
 * Currently supports Chinese Simplified.
 * Lazily loads the Chinese wordlist on first call.
 *
 * For Chinese mnemonics, the words are single characters separated by spaces.
 */
export async function detectMnemonicAsync(text: string): Promise<string | null> {
  // Load Chinese wordlist
  const cnWordset = await loadChineseWordlist();
  if (cnWordset.size === 0) return null;

  // Check 1: Chinese characters written without spaces
  // e.g., "的一是在不了有和人这中大" - 12+ consecutive Chinese chars from BIP-39 wordlist
  // Must check this BEFORE the token length check, since no-space text has 1 token
  const chineseCharRegex = /[\u4e00-\u9fff]{12,}/g;
  let charMatch: RegExpExecArray | null;
  while ((charMatch = chineseCharRegex.exec(text)) !== null) {
    const chars = Array.from(charMatch[0]); // Split into individual characters
    const result = findMnemonicWindow(chars, cnWordset);
    if (result) {
      // Return the original unsplit form for position matching
      return charMatch[0];
    }
  }

  // Check 2: Chinese mnemonic with spaces between characters
  const tokens = text.trim().split(/\s+/);
  if (tokens.length < 12) return null;

  const cnResult = findMnemonicWindow(tokens, cnWordset);
  if (cnResult) return cnResult;

  return null;
}

/**
 * Check if a single word exists in the BIP-39 wordlist
 */
export function isBip39Word(word: string): boolean {
  return BIP39_WORDSET.has(word.toLowerCase());
}
