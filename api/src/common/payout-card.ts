/** Normalize a card number to digits only. */
export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/** Digits-only length check (typical PAN range). */
export function isCardNumberLengthValid(digits: string): boolean {
  return /^\d{13,19}$/.test(digits);
}

/** Luhn checksum for payment card numbers. */
export function isLuhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function isValidCardNumber(value: string): boolean {
  const digits = normalizeCardNumber(value);
  return isCardNumberLengthValid(digits) && isLuhnValid(digits);
}

export function cardLast4(cardNumber: string | null | undefined): string | null {
  if (!cardNumber) return null;
  const digits = normalizeCardNumber(cardNumber);
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export type TeacherPayoutDetails = {
  cardHolderName?: string;
  cardNumber?: string;
  method?: string;
  /** @deprecated legacy bank transfer fields */
  bankName?: string;
  accountName?: string;
  accountLast4?: string;
};

export function hasPayoutCardDetails(
  details: TeacherPayoutDetails | null | undefined,
): boolean {
  return Boolean(
    details?.cardHolderName?.trim() && details?.cardNumber?.trim(),
  );
}
