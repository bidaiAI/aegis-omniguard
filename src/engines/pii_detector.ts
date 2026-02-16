/**
 * PII (Personally Identifiable Information) Detector
 * Detects Chinese ID cards, phone numbers, email addresses, etc.
 */

import { DLP_PATTERNS } from '../shared/constants';

/**
 * Validate Chinese 18-digit ID card number using checksum
 */
export function validateCnIdCard(id: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(id)) return false;

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id[i], 10) * weights[i];
  }

  const checkCode = checkCodes[sum % 11];
  return id[17].toUpperCase() === checkCode;
}

/**
 * Detect Chinese phone number (basic format check)
 */
export function detectCnPhone(text: string): string[] {
  const matches = text.match(DLP_PATTERNS.CN_PHONE) || [];
  return matches;
}

/**
 * Detect email addresses
 */
export function detectEmails(text: string): string[] {
  const matches = text.match(DLP_PATTERNS.EMAIL) || [];
  return matches;
}

/**
 * Mask a Chinese ID card number
 */
export function maskIdCard(id: string): string {
  return id.slice(0, 6) + '********' + id.slice(14);
}

/**
 * Mask a phone number
 */
export function maskPhone(phone: string): string {
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

/**
 * Mask an email address
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local[0] + '***';
  return `${maskedLocal}@${domain}`;
}
