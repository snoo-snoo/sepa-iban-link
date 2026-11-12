// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./components.js', async () => {
  const actual = await vi.importActual('./components.js');
  return {
    ...actual,
    renderEpcQr: vi.fn(async (container) => {
      const c = document.createElement('canvas');
      container.replaceChildren(c);
    }),
  };
});

import { mountGeneratorFlow } from './generator-flow.js';
import { loadProfile } from '../domain/profile.js';

describe('generator-flow onboarding and 1-step local flow', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('guides first-time user from privacy -> iban -> local save -> amount -> ready without server calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const host = document.createElement('div');
    mountGeneratorFlow(host, { baseUrl: 'https://sepa.example.at' });

    // 1. Starts on privacy step when no IBAN is stored locally
    expect(host.querySelector('[data-testid="step-privacy"]')).not.toBeNull();
    host.querySelector('.kit-primary-action').click();

    // 2. Moves to IBAN setup step; save button disabled until valid IBAN entered
    expect(host.querySelector('[data-testid="step-iban"]')).not.toBeNull();
    const saveBtn = host.querySelector('.kit-primary-action');
    expect(saveBtn.disabled).toBe(true);

    // Click Demo AT (George) pill -> enables save immediately
    const demoAtPill = [...host.querySelectorAll('.kit-pill')].find((b) =>
      b.textContent.includes('Demo AT')
    );
    demoAtPill.click();
    expect(saveBtn.disabled).toBe(false);
    saveBtn.click();

    // 3. Saved only in localStorage, now on amount step
    expect(loadProfile()?.iban).toBe('AT232011100234573201');
    expect(host.querySelector('[data-testid="step-amount"]')).not.toBeNull();

    // 4. Enter amount -> generate link -> done!
    const amountInput = host.querySelector('.kit-amount-input');
    amountInput.value = '25,50';
    amountInput.dispatchEvent(new Event('input'));

    host.querySelector('.kit-primary-action').click();
    expect(host.querySelector('[data-testid="step-ready"]')).not.toBeNull();

    const waLink = host.querySelector('a.kit-primary-action');
    expect(waLink.getAttribute('href')).toContain('wa.me');
    expect(decodeURIComponent(waLink.getAttribute('href'))).toContain('https://sepa.example.at/#p=');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('jumps straight to amount step on returning visits and supports 1-tap local wipe', () => {
    localStorage.setItem(
      'sepa_saved_profile',
      JSON.stringify({ name: 'Anna Beispiel', iban: 'AT232011100234573201', bic: '' })
    );

    const host = document.createElement('div');
    mountGeneratorFlow(host, { baseUrl: 'https://sepa.example.at' });

    expect(host.querySelector('[data-testid="step-amount"]')).not.toBeNull();
    expect(host.querySelector('.kit-local-account__name')?.textContent).toBe('Anna Beispiel');

    const deleteBtn = host.querySelector('.kit-text-btn--danger');
    deleteBtn.click();

    expect(loadProfile()).toBeNull();
    expect(host.querySelector('[data-testid="step-privacy"]')).not.toBeNull();
  });
});
