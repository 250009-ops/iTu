import {
  cardLast4,
  hasPayoutCardDetails,
  isLuhnValid,
  isValidCardNumber,
  normalizeCardNumber,
} from './payout-card';

describe('payout-card', () => {
  it('normalizes to digits only', () => {
    expect(normalizeCardNumber('8600 1234 5678 9012')).toBe('8600123456789012');
  });

  it('accepts a known Luhn-valid PAN', () => {
    // Stripe test Visa
    expect(isValidCardNumber('4242424242424242')).toBe(true);
    expect(isLuhnValid('4242424242424242')).toBe(true);
  });

  it('rejects bad checksum / length', () => {
    expect(isValidCardNumber('4242424242424241')).toBe(false);
    expect(isValidCardNumber('1234')).toBe(false);
  });

  it('extracts last4 and detects card details', () => {
    expect(cardLast4('4242424242424242')).toBe('4242');
    expect(
      hasPayoutCardDetails({
        cardHolderName: 'Ada Lovelace',
        cardNumber: '4242424242424242',
      }),
    ).toBe(true);
    expect(hasPayoutCardDetails({ accountLast4: '1234' })).toBe(false);
  });
});
