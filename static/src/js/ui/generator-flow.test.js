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

const inputHasAccessibleLabel = (input, root) => {
  const id = input.id;
  if (id && root.querySelector(`label[for="${id}"]`)) return true;
  if (input.getAttribute('aria-label')) return true;
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy && root.querySelector(`[id="${labelledBy}"]`)) return true;
  return false;
};

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

    expect(host.querySelector('[data-testid="step-privacy"]')).not.toBeNull();
    host.querySelector('.kit-primary-action').click();

    expect(host.querySelector('[data-testid="step-iban"]')).not.toBeNull();
    const saveBtn = host.querySelector('.kit-primary-action');
    expect(saveBtn.disabled).toBe(true);

    const demoAtPill = [...host.querySelectorAll('.kit-pill')].find((b) =>
      b.textContent.includes('Demo AT')
    );
    demoAtPill.click();
    expect(saveBtn.disabled).toBe(false);
    saveBtn.click();

    expect(loadProfile()?.name).toBe('Michael Plöckinger');
    expect(loadProfile()?.iban).toBe('AT441900103783600211');
    expect(host.querySelector('[data-testid="step-amount"]')).not.toBeNull();

    const amountInput = host.querySelector('#sepa-amount');
    amountInput.value = '25,50';
    amountInput.dispatchEvent(new Event('input'));

    host.querySelector('.kit-mobile-screen__footer .kit-primary-action').click();
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

  it('keeps the name field focused and phone frame child when the mobile keyboard resizes the viewport', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mountGeneratorFlow(host, { baseUrl: 'https://sepa.example.at' });
    host.querySelector('.kit-primary-action').click();

    const phoneFrame = host.querySelector('.kit-phone');
    const frameChildBefore = phoneFrame.firstElementChild;

    const name = host.querySelector('#sepa-payee-name');
    name.focus();
    name.value = 'Anna';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    window.dispatchEvent(new Event('resize'));

    expect(document.activeElement).toBe(name);
    expect(name.value).toBe('Anna');
    expect(host.querySelector('.kit-primary-action').disabled).toBe(true);
    expect(phoneFrame.firstElementChild).toBe(frameChildBefore);
    host.remove();
  });

  it('gives every flow input an accessible label', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mountGeneratorFlow(host, { baseUrl: 'https://sepa.example.at' });
    host.querySelector('.kit-primary-action').click();

    let inputs = host.querySelectorAll('input');
    inputs.forEach((input) => expect(inputHasAccessibleLabel(input, host)).toBe(true));

    [...host.querySelectorAll('.kit-pill')].find((b) => b.textContent.includes('Demo AT')).click();
    host.querySelector('.kit-primary-action').click();

    expect(host.querySelector('[data-testid="step-amount"]')).not.toBeNull();

    inputs = host.querySelectorAll('input');
    inputs.forEach((input) => expect(inputHasAccessibleLabel(input, host)).toBe(true));
    host.remove();
  });

  it('shows alert error and stays on amount step for invalid amount', () => {
    localStorage.setItem(
      'sepa_saved_profile',
      JSON.stringify({ name: 'Anna', iban: 'AT232011100234573201', bic: '' })
    );
    const host = document.createElement('div');
    mountGeneratorFlow(host, { baseUrl: 'https://sepa.example.at' });

    const amountInput = host.querySelector('#sepa-amount');
    amountInput.value = 'xyz';
    amountInput.dispatchEvent(new Event('input'));

    host.querySelector('.kit-mobile-screen__footer .kit-primary-action').click();

    expect(host.querySelector('[data-testid="step-amount"]')).not.toBeNull();
    const alert = host.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert.textContent.length).toBeGreaterThan(0);
  });

  it('does not render broken ready screen when setStep(ready) without a valid payment', () => {
    const host = document.createElement('div');
    const api = mountGeneratorFlow(host, { baseUrl: 'https://sepa.example.at' });
    api.setStep('ready');

    expect(host.querySelector('[data-testid="step-ready"]')).toBeNull();
    const wa = host.querySelector('a.kit-primary-action--link');
    if (wa) expect(wa.getAttribute('href')).not.toBe('#');
  });

  it('fires onStepChange once per step transition', () => {
    const host = document.createElement('div');
    const seen = [];
    const api = mountGeneratorFlow(host, { baseUrl: 'https://sepa.example.at' }, {
      onStepChange: (s) => seen.push(s),
    });

    expect(seen).toEqual(['privacy']);

    host.querySelector('.kit-primary-action').click();
    expect(seen).toEqual(['privacy', 'iban']);

    [...host.querySelectorAll('.kit-pill')].find((b) => b.textContent.includes('Demo AT')).click();
    host.querySelector('.kit-primary-action').click();
    expect(seen).toEqual(['privacy', 'iban', 'amount']);

    host.querySelector('#sepa-amount').value = '10,00';
    host.querySelector('#sepa-amount').dispatchEvent(new Event('input'));
    host.querySelector('.kit-mobile-screen__footer .kit-primary-action').click();
    expect(seen).toEqual(['privacy', 'iban', 'amount', 'ready']);

    api.setStep('amount');
    expect(seen.filter((s) => s === 'amount').length).toBe(2);
    expect(seen[seen.length - 1]).toBe('amount');
  });
});
