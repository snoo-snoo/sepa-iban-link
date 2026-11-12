import {
  buildBankUri,
  buildEpcPayload,
  buildPaytoUri,
  decodePaymentToken,
  formatAmountDisplay,
  parseEurAmount,
  tokenToPayment,
} from './epc.js';
import { formatIban, lookupRecipientBank, maskIban, validateIban } from './iban.js';

const readEmbeddedState = () => {
  const el = document.getElementById('sepa-initial-state');
  if (el?.textContent?.trim()) {
    try {
      return JSON.parse(el.textContent.trim());
    } catch {
      return null;
    }
  }
  if (window.__SEPA_INITIAL_STATE__) return window.__SEPA_INITIAL_STATE__;
  return null;
};

const enrichPayment = (raw, token = '') => {
  const iban = validateIban(raw.iban);
  if (!iban.valid) return null;
  const amount = raw.amount || '';
  const purpose = raw.purpose || '';
  const reference = raw.reference || '';
  const p = parseEurAmount(amount);
  const recipientBank = raw.recipientBank ?? lookupRecipientBank(iban.iban);
  const payment = {
    token,
    recipientName: raw.recipientName || raw.name || '',
    iban: iban.iban,
    ibanFormatted: formatIban(iban.iban),
    ibanMasked: maskIban(iban.iban),
    bic: raw.bic || recipientBank?.defaultBic || '',
    amount: p.invalid ? '' : amount ? p.value : '',
    amountFormatted: formatAmountDisplay(amount),
    purpose: reference ? '' : purpose,
    reference,
    verified: Boolean(raw.verified),
    recipientBank,
  };
  try {
    payment.epcPayload = buildEpcPayload({
      name: payment.recipientName,
      iban: payment.iban,
      bic: payment.bic,
      amount: payment.amount,
      purpose: payment.purpose,
      reference: payment.reference,
    });
    payment.paytoUri = buildPaytoUri(payment);
    payment.bankUri = buildBankUri(payment);
  } catch {
    return null;
  }
  return payment;
};

/** Privacy hash mode: #p=<base64url> */
export const paymentFromHash = () => {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#p=')) return null;
  const token = hash.slice(3);
  const decoded = decodePaymentToken(token);
  const partial = tokenToPayment(decoded);
  if (!partial) return null;
  return enrichPayment({ ...partial, verified: Boolean(decoded.s) }, token);
};

export const loadInitialState = () => {
  const base = readEmbeddedState() ?? {
    mode: 'generator',
    baseUrl: window.location.origin,
    hmacEnabled: false,
    error: null,
    payment: null,
  };

  const fromHash = paymentFromHash();
  if (fromHash) {
    return {
      ...base,
      mode: 'payment',
      payment: fromHash,
      error: null,
    };
  }

  if (base.payment) {
    const enriched = enrichPayment(base.payment, base.payment.token || '');
    return { ...base, payment: enriched, mode: enriched ? 'payment' : 'generator' };
  }

  return base;
};

export const encodeViaApi = async (baseUrl, fields) => {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/encode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('encode failed');
  return res.json();
};
