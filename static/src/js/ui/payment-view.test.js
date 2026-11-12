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

import { mountPaymentView } from './payment-view.js';
import { encodePaymentToken } from '../domain/epc.js';
import { loadInitialState } from '../domain/state.js';

describe('payment-view recipient guide UX', () => {
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
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'de-AT',
    });
  });

  it('shows clear George QR instruction and CTA by default for Austrian links', async () => {
    const token = encodePaymentToken({
      name: 'Michael Plöckinger',
      iban: 'AT441900103783600211',
      amount: '25.50',
      purpose: 'Abendessen',
    });
    window.location.hash = `#p=${token}`;
    const state = loadInitialState();

    const root = document.createElement('div');
    await mountPaymentView(root, state);

    const guide = root.querySelector('.sepa-payment-guide');
    expect(guide).not.toBeNull();
    expect(guide.textContent).toContain('Einfach den QR-Code an „George“ schicken');

    const cta = root.querySelector('.sepa-payment-actions .kit-primary-action');
    expect(cta?.textContent).toBe('QR-Code an „George“ schicken');
  });

  it('updates guide and CTA dynamically when switching payer bank app', async () => {
    const token = encodePaymentToken({
      name: 'Michael Plöckinger',
      iban: 'AT441900103783600211',
      amount: '15.00',
    });
    window.location.hash = `#p=${token}`;
    const state = loadInitialState();

    const root = document.createElement('div');
    await mountPaymentView(root, state);

    const sparkasseRadio = root.querySelector('[role="radio"][data-value="sparkasse_de"]');
    sparkasseRadio.click();

    expect(root.querySelector('.sepa-payment-guide')?.textContent).toContain(
      'Einfach an die App „Sparkasse“ schicken'
    );
    expect(root.querySelector('.sepa-payment-actions .kit-primary-action')?.textContent).toBe(
      'An „Sparkasse“ schicken'
    );

    const baRadio = root.querySelector('[role="radio"][data-value="bankaustria_at"]');
    baRadio.click();

    expect(root.querySelector('.sepa-payment-actions .kit-primary-action')?.textContent).toBe(
      'QR-Code an Bank-App schicken'
    );
  });
});
