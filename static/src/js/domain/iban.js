/** ISO 13616 country-specific IBAN lengths (SEPA subset). */
const IBAN_LENGTH = {
  AT: 20,
  DE: 22,
  CH: 21,
  LI: 21,
  NL: 18,
  BE: 16,
  LU: 20,
  FR: 27,
  IT: 27,
  ES: 24,
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const toNumericString = (iban) => {
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let out = '';
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch >= 'A' && ch <= 'Z') out += String(LETTERS.indexOf(ch) + 10);
    else return null;
  }
  return out;
};

/** Modulo-97 via BigInt — exact for any IBAN length. */
export const mod97 = (numericStr) => {
  let remainder = 0n;
  for (const digit of numericStr) {
    remainder = (remainder * 10n + BigInt(digit)) % 97n;
  }
  return remainder;
};

export const normalizeIban = (input) =>
  String(input ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();

export const formatIban = (iban) => {
  const n = normalizeIban(iban);
  return n.replace(/(.{4})/g, '$1 ').trim();
};

export const maskIban = (iban) => {
  const n = normalizeIban(iban);
  if (n.length < 8) return n;
  const head = n.slice(0, 4);
  const tail = n.slice(-4);
  const masked = '•'.repeat(Math.max(0, n.length - 8));
  const grouped = `${head}${masked}${tail}`.replace(/(.{4})/g, '$1 ').trim();
  return grouped.replace(/•/g, '••••').replace(/(•••• ){3,}/g, (m) =>
    m.includes(' ') ? '•••• •••• •••• ' : m
  );
};

export const getIbanCountry = (iban) => normalizeIban(iban).slice(0, 2);

export const validateIban = (input) => {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return { valid: false, reason: 'format' };
  }
  const country = iban.slice(0, 2);
  const expectedLen = IBAN_LENGTH[country];
  if (expectedLen && iban.length !== expectedLen) {
    return { valid: false, reason: 'length' };
  }
  const numeric = toNumericString(iban);
  if (!numeric) return { valid: false, reason: 'charset' };
  if (mod97(numeric) !== 1n) {
    return { valid: false, reason: 'checksum' };
  }
  return { valid: true, country, iban };
};

const AT_BANKS = [
  { test: (blz) => blz === '20111' || blz.startsWith('20'), appKey: 'george_at', bankName: 'Erste Bank und Sparkassen (George)', defaultBic: 'GIBAATWWXXX' },
  { test: (blz) => blz.startsWith('3'), appKey: 'elba_at', bankName: 'Raiffeisen Bank International (Mein ELBA)', defaultBic: 'RZBAATWW' },
  { test: (blz) => blz.startsWith('12'), appKey: 'bankaustria_at', bankName: 'Bank Austria', defaultBic: 'BKAUATWW' },
  { test: (blz) => blz.startsWith('14'), appKey: 'bawag_at', bankName: 'BAWAG / easybank', defaultBic: 'BAWAATWW' },
  { test: (blz) => blz.startsWith('4'), appKey: 'bankaustria_at', bankName: 'Volksbank Österreich', defaultBic: 'VBOEATWW' },
  { test: (blz) => blz === '19001', appKey: 'george_at', bankName: 'Trade Republic', defaultBic: 'TRBKATW2XXX' },
  { test: (blz) => blz === '19120' || blz === '76040', appKey: 'george_at', bankName: 'bank99', defaultBic: 'SPBAATWW' },
];

const DE_BLZ = (iban) => {
  const n = normalizeIban(iban);
  return n.slice(4, 12);
};

const DE_BANKS_BY_BLZ = {
  '50010517': { bankName: 'ING', defaultBic: 'INGDDEFFXXX', appKey: 'ing_de' },
  '12030000': { bankName: 'DKB', defaultBic: 'BYLADEM1001', appKey: 'dkb_de' },
  '10011001': { bankName: 'N26', defaultBic: 'NTSBDEB1XXX', appKey: 'n26_de' },
  '50024024': { bankName: 'C24', defaultBic: 'DEFFDEFFXXX', appKey: 'vr_de' },
};

export const lookupRecipientBank = (iban) => {
  const v = validateIban(iban);
  if (!v.valid) return null;
  const country = v.country;

  if (country === 'AT' && iban.length >= 9) {
    const blz = normalizeIban(iban).slice(4, 9);
    const match = AT_BANKS.find((b) => b.test(blz));
    return {
      country: 'AT',
      bankCode: blz,
      bankName: match?.bankName ?? 'Bank in Österreich',
      defaultBic: match?.defaultBic ?? '',
      appKey: match?.appKey ?? 'george_at',
    };
  }

  if (country === 'DE' && iban.length >= 12) {
    const blz = DE_BLZ(iban);
    if (DE_BANKS_BY_BLZ[blz]) {
      return { country: 'DE', bankCode: blz, ...DE_BANKS_BY_BLZ[blz] };
    }
    const d4 = blz[3];
    let bankName = 'Bank';
    let appKey = 'vr_de';
    if (d4 === '5') {
      bankName = 'Sparkasse';
      appKey = 'sparkasse_de';
    } else if (d4 === '6' || d4 === '9') {
      bankName = 'Volks- / Raiffeisenbank';
      appKey = 'vr_de';
    } else if (d4 === '4') {
      bankName = 'Commerzbank';
      appKey = 'vr_de';
    } else if (d4 === '7' || d4 === '1') {
      bankName = 'Deutsche Bank / Postbank';
      appKey = 'vr_de';
    }
    return { country: 'DE', bankCode: blz, bankName, defaultBic: '', appKey };
  }

  return { country, bankCode: '', bankName: country, defaultBic: '', appKey: 'multibanking' };
};

export const expectedIbanLength = (country) => IBAN_LENGTH[country] ?? null;
