/**
 * Luhn Algorithm - Credit card number validation
 * Used as second-pass verification after regex pre-filter
 * to eliminate false positives (tracking numbers, random digit sequences, etc.)
 */
export function luhnCheck(cardNumber: string): boolean {
  // Strip spaces and dashes
  const digits = cardNumber.replace(/[\s-]/g, '');

  // Must be all digits, 13-19 chars
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let isEven = false;

  // Iterate from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Mask a credit card number, preserving last 4 digits
 */
export function maskCreditCard(cardNumber: string): string {
  const digits = cardNumber.replace(/[\s-]/g, '');
  const last4 = digits.slice(-4);
  return `**** **** **** ${last4}`;
}
