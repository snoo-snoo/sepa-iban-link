// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { clearProfile, loadProfile, PROFILE_KEY, saveProfile } from './profile.js';

describe('local profile storage', () => {
  beforeEach(() => {
    clearProfile();
  });

  it('round-trips name and iban', () => {
    saveProfile({ name: 'Anna', iban: 'AT232011100234573201', bic: 'GIBAATWWXXX' });
    const p = loadProfile();
    expect(p?.name).toBe('Anna');
    expect(p?.iban).toBe('AT232011100234573201');
    expect(p?.bic).toBe('GIBAATWWXXX');
  });

  it('normalizes iban spaces on save and load', () => {
    saveProfile({ name: 'X', iban: 'at23 2011 1002 3457 3201' });
    expect(loadProfile()?.iban).toBe('AT232011100234573201');
  });

  it('returns null when empty', () => {
    expect(loadProfile()).toBe(null);
    localStorage.setItem(PROFILE_KEY, '{}');
    expect(loadProfile()).toBe(null);
  });

  it('clear removes key', () => {
    saveProfile({ name: 'A', iban: 'DE89370400440532013000' });
    clearProfile();
    expect(localStorage.getItem(PROFILE_KEY)).toBe(null);
  });

  it('returns null when stored iban fails validation', () => {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ name: 'Anna', iban: 'AT483200000012345863', bic: '' })
    );
    expect(loadProfile()).toBe(null);
  });
});
