// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { encodePaymentToken } from './epc.js';
import { paymentFromHash } from './state.js';

describe('paymentFromHash', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('decodes #p= client token', () => {
    const token = encodePaymentToken({
      name: 'Max',
      iban: 'AT483200000012345864',
      amount: '10.00',
      purpose: 'Test',
    });
    window.location.hash = `#p=${token}`;
    const payment = paymentFromHash();
    expect(payment?.recipientName).toBe('Max');
    expect(payment?.amount).toBe('10.00');
    expect(payment?.verified).toBe(false);
  });

  it('returns null for empty hash', () => {
    expect(paymentFromHash()).toBe(null);
  });
});
