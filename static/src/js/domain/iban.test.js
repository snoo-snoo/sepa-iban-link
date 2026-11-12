import { describe, expect, it } from 'vitest';
import { formatIban, lookupRecipientBank, normalizeIban, validateIban } from './iban.js';

describe('iban', () => {
  it('validates known AT Raiffeisen IBAN', () => {
    expect(validateIban('AT483200000012345864').valid).toBe(true);
  });

  it('validates known DE IBAN', () => {
    expect(validateIban('DE89370400440532013000').valid).toBe(true);
  });

  it('rejects invalid checksum', () => {
    expect(validateIban('AT483200000012345863').valid).toBe(false);
  });

  it('rejects wrong country length for AT', () => {
    expect(validateIban('AT4832000000123458641').valid).toBe(false);
  });

  it('formats in blocks of four', () => {
    expect(formatIban('AT483200000012345864')).toBe('AT48 3200 0000 1234 5864');
  });

  it('normalizes spaces and case', () => {
    expect(normalizeIban('at48 3200 0000 1234 5864')).toBe('AT483200000012345864');
  });

  it('detects George AT for Sparkassen BLZ 20111', () => {
    const bank = lookupRecipientBank('AT232011100234573201');
    expect(bank.appKey).toBe('george_at');
  });

  it('detects Raiffeisen / ELBA for BLZ 32000', () => {
    const bank = lookupRecipientBank('AT483200000012345864');
    expect(bank.appKey).toBe('elba_at');
  });

  it('detects Sparkasse DE from BLZ group digit 5', () => {
    const bank = lookupRecipientBank('DE54100500000011111111');
    expect(bank?.appKey).toBe('sparkasse_de');
  });

  it('detects ING DE by BLZ', () => {
    const bank = lookupRecipientBank('DE43500105170012345678');
    expect(bank.appKey).toBe('ing_de');
  });

  it('detects DKB DE by BLZ', () => {
    const bank = lookupRecipientBank('DE64120300000001234567');
    expect(bank.appKey).toBe('dkb_de');
  });
});
