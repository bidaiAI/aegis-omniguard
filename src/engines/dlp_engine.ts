/**
 * DLP Engine - Core scanning engine
 *
 * Two-pass detection strategy:
 *   Pass 1: Regex pre-filter (fast, may have false positives)
 *   Pass 2: Algorithm verification (Luhn, BIP-39, entropy)
 *
 * This eliminates false positives while keeping scanning fast.
 */

import { DLP_PATTERNS } from '../shared/constants';
import type { DLPDetection, DLPScanResult } from '../shared/types';
import { luhnCheck, maskCreditCard } from './luhn';
import { detectMnemonic, detectMnemonicAsync } from './bip39_checker';
import { isHighEntropySecret } from './entropy';
import { validateCnIdCard, detectCnPhone, detectEmails, maskIdCard, maskPhone, maskEmail } from './pii_detector';
import { scanWeb3Keys } from './wallet_detector';

/**
 * Main DLP scan function (async for multi-language mnemonic support)
 * Scans text for sensitive data using two-pass strategy
 */
export async function dlpScan(text: string): Promise<DLPScanResult> {
  const detections: DLPDetection[] = [];

  // === Credit Card Detection ===
  scanCreditCards(text, detections);

  // === Mnemonic Phrase Detection (English sync + Chinese async) ===
  scanMnemonics(text, detections);
  await scanMnemonicsAsync(text, detections);

  // === Private Key Detection (ETH) ===
  scanPrivateKeys(text, detections);

  // === Multi-Chain Private Key Detection (BTC, Solana, Tron) ===
  scanMultiChainKeys(text, detections);

  // === API Key Detection ===
  scanApiKeys(text, detections);

  // === PII Detection ===
  scanPii(text, detections);

  return {
    verdict: detections.length > 0 ? 'block' : 'pass',
    detections,
    scannedAt: Date.now(),
  };
}

function scanCreditCards(text: string, detections: DLPDetection[]): void {
  const regex = new RegExp(DLP_PATTERNS.CREDIT_CARD.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const candidate = match[0];
    // Pass 2: Luhn algorithm verification
    if (luhnCheck(candidate)) {
      detections.push({
        type: 'credit_card',
        original: candidate,
        masked: maskCreditCard(candidate),
        confidence: 0.95,
        position: { start: match.index, end: match.index + candidate.length },
      });
    }
  }
}

function scanMnemonics(text: string, detections: DLPDetection[]): void {
  // Pass 2: BIP-39 wordlist verification
  const mnemonic = detectMnemonic(text);
  if (mnemonic) {
    const start = text.toLowerCase().indexOf(mnemonic.toLowerCase());
    detections.push({
      type: 'mnemonic',
      original: mnemonic,
      masked: '[MNEMONIC REDACTED]',
      confidence: 0.99,
      position: { start, end: start + mnemonic.length },
    });
  }
}

async function scanMnemonicsAsync(text: string, detections: DLPDetection[]): Promise<void> {
  // Pass 2: BIP-39 multi-language wordlist verification (async for lazy-loaded wordlists)
  const mnemonic = await detectMnemonicAsync(text);
  if (mnemonic) {
    // Check if this mnemonic was already detected by the sync English scan
    const alreadyDetected = detections.some(
      (d) => d.type === 'mnemonic' && d.original === mnemonic
    );
    if (!alreadyDetected) {
      const start = text.toLowerCase().indexOf(mnemonic.toLowerCase());
      detections.push({
        type: 'mnemonic',
        original: mnemonic,
        masked: '[MNEMONIC REDACTED]',
        confidence: 0.99,
        position: { start, end: start + mnemonic.length },
      });
    }
  }
}

function scanMultiChainKeys(text: string, detections: DLPDetection[]): void {
  // Scan for BTC WIF, Solana, and Tron private keys
  const web3Keys = scanWeb3Keys(text);

  for (const key of web3Keys) {
    // Skip if already detected by ETH/HEX private key scanner
    const alreadyDetected = detections.some(
      (d) => d.position.start <= key.position.start && d.position.end >= key.position.end
    );
    if (alreadyDetected) continue;

    // Map chain to detection type and mask label
    let type: DLPDetection['type'];
    let masked: string;

    switch (key.chain) {
      case 'bitcoin':
        type = 'private_key_bitcoin';
        masked = '[BITCOIN WIF KEY REDACTED]';
        break;
      case 'solana':
        type = 'private_key_solana';
        masked = '[SOLANA PRIVATE KEY REDACTED]';
        break;
      case 'tron':
        type = 'private_key_tron';
        masked = '[TRON PRIVATE KEY REDACTED]';
        break;
      default:
        type = 'private_key';
        masked = '[PRIVATE KEY REDACTED]';
    }

    detections.push({
      type,
      original: key.matched,
      masked,
      confidence: key.confidence,
      position: key.position,
    });
  }
}

function scanPrivateKeys(text: string, detections: DLPDetection[]): void {
  // Ethereum private key with 0x prefix
  const ethRegex = new RegExp(DLP_PATTERNS.ETH_PRIVATE_KEY.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = ethRegex.exec(text)) !== null) {
    detections.push({
      type: 'private_key',
      original: match[0],
      masked: '[PRIVATE KEY REDACTED]',
      confidence: 0.98,
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  // 64-char hex string (without 0x) - check entropy to reduce false positives
  const hexRegex = new RegExp(DLP_PATTERNS.HEX_PRIVATE_KEY.source, 'g');
  while ((match = hexRegex.exec(text)) !== null) {
    // Skip if already caught by ETH_PRIVATE_KEY
    const alreadyDetected = detections.some(
      (d) => d.position.start <= match!.index && d.position.end >= match!.index + match![0].length
    );
    if (alreadyDetected) continue;

    // Use entropy check to reduce false positives on hex strings
    if (isHighEntropySecret(match[0])) {
      detections.push({
        type: 'private_key',
        original: match[0],
        masked: '[PRIVATE KEY REDACTED]',
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }
  }
}

function scanApiKeys(text: string, detections: DLPDetection[]): void {
  // High-confidence specific API key patterns
  const specificPatterns: Array<{ regex: RegExp; label: string; confidence: number }> = [
    { regex: new RegExp(DLP_PATTERNS.OPENAI_KEY.source, 'g'), label: 'OpenAI Key', confidence: 0.98 },
    { regex: new RegExp(DLP_PATTERNS.ANTHROPIC_KEY.source, 'g'), label: 'Anthropic Key', confidence: 0.98 },
    { regex: new RegExp(DLP_PATTERNS.GOOGLE_KEY.source, 'g'), label: 'Google Key', confidence: 0.95 },
    { regex: new RegExp(DLP_PATTERNS.GITHUB_TOKEN.source, 'g'), label: 'GitHub Token', confidence: 0.98 },
    { regex: new RegExp(DLP_PATTERNS.AWS_KEY.source, 'g'), label: 'AWS Key', confidence: 0.95 },
  ];

  const matchedRanges: Array<{ start: number; end: number }> = [];

  for (const { regex, label, confidence } of specificPatterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // Skip overlapping matches
      if (matchedRanges.some((r) => start < r.end && end > r.start)) continue;
      matchedRanges.push({ start, end });
      detections.push({
        type: 'api_key',
        original: match[0],
        masked: `[${label} REDACTED]`,
        confidence,
        position: { start, end },
      });
    }
  }

  // Generic API key pattern (lower confidence, skip already-matched ranges)
  const apiRegex = new RegExp(DLP_PATTERNS.API_KEY_GENERIC.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = apiRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (matchedRanges.some((r) => start < r.end && end > r.start)) continue;
    matchedRanges.push({ start, end });
    detections.push({
      type: 'api_key',
      original: match[0],
      masked: '[API KEY REDACTED]',
      confidence: 0.8,
      position: { start, end },
    });
  }

  // .env KEY=VALUE patterns
  const envRegex = new RegExp(DLP_PATTERNS.ENV_KEY_VALUE.source, 'gi');
  while ((match = envRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (matchedRanges.some((r) => start < r.end && end > r.start)) continue;
    detections.push({
      type: 'api_key',
      original: match[0],
      masked: '[ENV SECRET REDACTED]',
      confidence: 0.85,
      position: { start, end },
    });
  }
}

function scanPii(text: string, detections: DLPDetection[]): void {
  // Chinese ID card
  const idRegex = new RegExp(DLP_PATTERNS.CN_ID_CARD.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = idRegex.exec(text)) !== null) {
    if (validateCnIdCard(match[0])) {
      detections.push({
        type: 'pii_id_card',
        original: match[0],
        masked: maskIdCard(match[0]),
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }
  }

  // Chinese phone numbers
  const phones = detectCnPhone(text);
  for (const phone of phones) {
    const idx = text.indexOf(phone);
    detections.push({
      type: 'pii_phone',
      original: phone,
      masked: maskPhone(phone),
      confidence: 0.7,
      position: { start: idx, end: idx + phone.length },
    });
  }

  // Email addresses
  const emails = detectEmails(text);
  for (const email of emails) {
    const idx = text.indexOf(email);
    detections.push({
      type: 'pii_email',
      original: email,
      masked: maskEmail(email),
      confidence: 0.9,
      position: { start: idx, end: idx + email.length },
    });
  }
}

/**
 * Apply masking to text based on detections
 * Returns the masked version of the input text
 */
export function applyMasking(text: string, detections: DLPDetection[]): string {
  if (detections.length === 0) return text;

  // Sort by position descending so we can replace from end to start
  // without messing up indices
  const sorted = [...detections].sort((a, b) => b.position.start - a.position.start);

  let result = text;
  for (const detection of sorted) {
    result =
      result.slice(0, detection.position.start) +
      detection.masked +
      result.slice(detection.position.end);
  }

  return result;
}
