import { normalizeIban, validateIban } from './iban.js';

const MAX_PAYLOAD_BYTES = 331;

const normalizeAmountInput = (raw) => {
  let normalized = raw.replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }
  return normalized;
};

/** Parse EUR amount from DE/AT decimal strings or empty (open amount). */
export const parseEurAmount = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw) return { value: '', cents: null, formatted: '' };
  const normalized = normalizeAmountInput(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { value: raw, cents: null, formatted: raw, invalid: true };
  }
  const [whole, frac = ''] = normalized.split('.');
  const cents = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
  if (cents < 1n || cents > 99999999999n) {
    return { value: raw, cents: null, formatted: raw, invalid: true };
  }
  const value = `${whole}.${(frac + '00').slice(0, 2)}`;
  const formatted = `${whole},${(frac + '00').slice(0, 2)} €`;
  return { value, cents, formatted, invalid: false };
};

export const formatAmountDisplay = (amountValue) => {
  if (!amountValue) return 'Betrag frei wählbar';
  const p = parseEurAmount(amountValue);
  if (p.invalid || p.cents === null) return String(amountValue);
  return p.formatted;
};

/** ISO 11649 RF reference checksum */
export const validateRfReference = (ref) => {
  const r = String(ref ?? '').replace(/\s/g, '').toUpperCase();
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(r)) return false;
  const rearranged = `${r.slice(4)}${r.slice(0, 4)}`;
  let numeric = '';
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') numeric += ch;
    else numeric += String(ch.charCodeAt(0) - 55);
  }
  let rem = 0n;
  for (const d of numeric) rem = (rem * 10n + BigInt(d)) % 97n;
  return rem === 1n;
};

export const utf8ByteLength = (str) => new TextEncoder().encode(str).length;

/**
 * EPC069-12 Version 002 — BIC optional in SCT within EU/EWR.
 * Purpose and structured reference are mutually exclusive.
 */
export const buildEpcPayload = ({ name, iban, bic = '', amount = '', purpose = '', reference = '' }) => {
  const ib = normalizeIban(iban);
  const vIban = validateIban(ib);
  if (!vIban.valid) throw new Error('Invalid IBAN');

  const hasRef = String(reference ?? '').trim().length > 0;
  const hasPurpose = String(purpose ?? '').trim().length > 0;
  if (hasRef && hasPurpose) throw new Error('Reference and purpose are mutually exclusive');

  const amountPart = amount ? `EUR${amount}` : '';
  const lines = [
    'BCD',
    '002',
    '1',
    'SCT',
    String(bic ?? '').trim(),
    String(name ?? '').trim().slice(0, 70),
    ib,
    amountPart,
    '',
    hasRef ? String(reference).trim().slice(0, 35) : '',
    hasRef ? '' : String(purpose ?? '').trim().slice(0, 140),
  ];
  const payload = lines.join('\n');
  if (utf8ByteLength(payload) > MAX_PAYLOAD_BYTES) {
    throw new Error('EPC payload exceeds 331 bytes UTF-8');
  }
  return payload;
};

const buildQuery = (pairs) =>
  pairs
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  .join('&');

export const buildPaytoUri = (payment) => {
  const { iban, amount, purpose, reference, recipientName } = payment;
  const ib = normalizeIban(iban);
  const uri = `payto://iban/${ib}`;
  const parts = [];
  if (amount) parts.push(`amount=EUR:${encodeURIComponent(amount)}`);
  if (recipientName) parts.push(`receiver-name=${encodeURIComponent(recipientName)}`);
  if (reference) parts.push(`instruction=${encodeURIComponent(reference)}`);
  else if (purpose) parts.push(`message=${encodeURIComponent(purpose)}`);
  return parts.length ? `${uri}?${parts.join('&')}` : uri;
};

export const buildBankUri = (payment) => {
  const pairs = [
    ['iban', normalizeIban(payment.iban)],
    ['name', payment.recipientName ?? ''],
  ];
  if (payment.bic) pairs.push(['bic', payment.bic]);
  if (payment.amount) {
    const p = parseEurAmount(payment.amount);
    if (!p.invalid && p.value) {
      pairs.push(['amount', p.value.replace('.', ',')]);
    }
  }
  const reason = payment.purpose || '';
  if (reason) pairs.push(['reason', reason]);
  const q = buildQuery(pairs);
  return `bank://singlepaymentsepa?${q}`;
};

const b64UrlEncode = (bytes) => {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64UrlDecode = (str) => {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export const encodePaymentToken = (fields) => {
  const obj = {
    v: 1,
    n: String(fields.name ?? '').slice(0, 70),
    i: normalizeIban(fields.iban),
    b: String(fields.bic ?? ''),
    a: fields.amount ? String(fields.amount) : '',
    p: String(fields.purpose ?? ''),
    r: String(fields.reference ?? ''),
    s: String(fields.signature ?? ''),
  };
  return b64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));
};

export const decodePaymentToken = (token) => {
  try {
    const json = new TextDecoder().decode(b64UrlDecode(token));
    const obj = JSON.parse(json);
    if (obj.v !== 1) return null;
    return obj;
  } catch {
    return null;
  }
};

export const tokenToPayment = (decoded) => {
  if (!decoded) return null;
  const v = validateIban(decoded.i);
  if (!v.valid) return null;
  const amount = decoded.a || '';
  const purpose = decoded.p || '';
  const reference = decoded.r || '';
  try {
    buildEpcPayload({
      name: decoded.n,
      iban: decoded.i,
      bic: decoded.b,
      amount,
      purpose: reference ? '' : purpose,
      reference,
    });
  } catch {
    return null;
  }
  if (reference && !validateRfReference(reference) && reference.toUpperCase().startsWith('RF')) {
    return null;
  }
  return {
    token: '',
    recipientName: decoded.n,
    iban: v.iban,
    bic: decoded.b || '',
    amount,
    purpose: reference ? '' : purpose,
    reference,
    verified: false,
  };
};
