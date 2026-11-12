import { describe, expect, it } from 'vitest';
import {
  buildBankUri,
  buildEpcPayload,
  buildPaytoUri,
  decodePaymentToken,
  encodePaymentToken,
  parseEurAmount,
  tokenToPayment,
  utf8ByteLength,
  validateRfReference,
} from './epc.js';

const BASE = {
  name: 'Max Mustermann',
  iban: 'AT483200000012345864',
};

describe('epc amount parsing', () => {
  it('parses German thousands separators', () => {
    expect(parseEurAmount('1.234,56').value).toBe('1234.56');
  });

  it('parses single-decimal comma', () => {
    expect(parseEurAmount('25,5').value).toBe('25.50');
  });

  it('keeps dot decimal form', () => {
    expect(parseEurAmount('25.50').value).toBe('25.50');
  });

  it('rejects zero amount', () => {
    expect(parseEurAmount('0,00').invalid).toBe(true);
  });

  it('allows open amount empty string', () => {
    expect(parseEurAmount('').cents).toBe(null);
  });
});

describe('RF references ISO 11649', () => {
  it('accepts RF18539007547034', () => {
    expect(validateRfReference('RF18539007547034')).toBe(true);
  });

  it('rejects RF00539007547034', () => {
    expect(validateRfReference('RF00539007547034')).toBe(false);
  });
});

describe('EPC069-12 payload', () => {
  it('builds 11-line structure', () => {
    const payload = buildEpcPayload({ ...BASE, amount: '25.50', purpose: 'Test' });
    const lines = payload.split('\n');
    expect(lines).toHaveLength(11);
    expect(payload.startsWith('BCD\n002\n1\nSCT')).toBe(true);
    expect(payload).toContain('EUR25.50');
  });

  it('enforces 331-byte UTF-8 limit', () => {
    const longPurpose = 'ä'.repeat(200);
    expect(() => buildEpcPayload({ ...BASE, purpose: longPurpose })).toThrow(/331/);
    expect(utf8ByteLength('ä')).toBe(2);
  });
});

describe('payto and bank URIs', () => {
  it('uses RFC 8905 instruction and percent-encoded spaces', () => {
    const uri = buildPaytoUri({
      iban: BASE.iban,
      amount: '10.00',
      recipientName: 'Max Muster',
      reference: '',
      purpose: 'Rechnung November',
    });
    expect(uri).toContain('amount=EUR:10.00');
    expect(uri).toContain('receiver-name=Max%20Muster');
    expect(uri).toContain('message=Rechnung%20November');
    expect(uri).not.toContain('+');
  });

  it('uses instruction for RF reference', () => {
    const uri = buildPaytoUri({
      iban: BASE.iban,
      amount: '',
      recipientName: 'X',
      reference: 'RF18539007547034',
      purpose: '',
    });
    expect(uri).toContain('instruction=RF18539007547034');
  });

  it('omits empty bank:// fields and encodes comma in amount', () => {
    const uri = buildBankUri({
      iban: BASE.iban,
      recipientName: 'Max',
      bic: '',
      amount: '25.50',
      purpose: 'Test',
      reference: '',
    });
    expect(uri).not.toContain('bic=');
    expect(uri).toContain('amount=25%2C50');
    expect(uri).toContain('reason=Test');
  });
});

describe('payment tokens', () => {
  it('round-trips payment token fields', () => {
    const token = encodePaymentToken({
      name: 'X',
      iban: BASE.iban,
      amount: '',
      purpose: 'Y',
    });
    const decoded = decodePaymentToken(token);
    expect(decoded.n).toBe('X');
    expect(decoded.i).toBe(BASE.iban);
  });

  it('forces verified false for client #p= decode', () => {
    const token = encodePaymentToken({
      name: 'X',
      iban: BASE.iban,
      purpose: 'Z',
      signature: 'fake-sig-should-not-trust',
    });
    const payment = tokenToPayment(decodePaymentToken(token));
    expect(payment.verified).toBe(false);
  });
});
