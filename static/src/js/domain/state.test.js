// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { encodePaymentToken } from './epc.js';
import { loadInitialState, paymentFromHash } from './state.js';

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

  it('decodes Trade Republic AT IBAN from #p= token', () => {
    const token = encodePaymentToken({
      name: 'Trade User',
      iban: 'AT441900103783600211',
      amount: '25.00',
      purpose: 'Sparplan',
    });
    window.location.hash = `#p=${token}`;
    const payment = paymentFromHash();
    expect(payment?.iban).toBe('AT441900103783600211');
    expect(payment?.recipientBank?.bankName).toBeTruthy();
  });

  it('returns null for empty hash', () => {
    expect(paymentFromHash()).toBe(null);
  });
});

describe('loadInitialState', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
    delete window.__SEPA_INITIAL_STATE__;
  });

  it('sets payment mode for valid #p= hash', () => {
    const token = encodePaymentToken({
      name: 'Max',
      iban: 'AT483200000012345864',
      amount: '5.00',
      purpose: 'Test',
    });
    window.location.hash = `#p=${token}`;
    const state = loadInitialState();
    expect(state.mode).toBe('payment');
    expect(state.payment?.recipientName).toBe('Max');
    expect(state.error).toBeNull();
  });

  it('sets generator error for invalid #p= hash', () => {
    window.location.hash = '#p=corrupt';
    const state = loadInitialState();
    expect(state.mode).toBe('generator');
    expect(state.payment).toBeNull();
    expect(state.error).toBe('Dieser Zahlungslink ist ungültig oder unvollständig.');
  });
});
