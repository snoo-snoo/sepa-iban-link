import { buildBankUri, buildEpcPayload, buildPaytoUri, formatAmountDisplay, parseEurAmount } from '../domain/epc.js';
import { formatIban, lookupRecipientBank, maskIban, validateIban } from '../domain/iban.js';

export const enrichPaymentForPreview = (raw) => {
  const iban = validateIban(raw.iban);
  if (!iban.valid) return null;
  const amount = raw.amount || '';
  const p = parseEurAmount(amount);
  const recipientBank = raw.recipientBank ?? lookupRecipientBank(iban.iban);
  const payment = {
    recipientName: raw.recipientName || '',
    iban: iban.iban,
    ibanFormatted: formatIban(iban.iban),
    ibanMasked: maskIban(iban.iban),
    bic: raw.bic || recipientBank?.defaultBic || '',
    amount: p.invalid ? '' : amount ? p.value : '',
    amountFormatted: formatAmountDisplay(amount),
    purpose: raw.reference ? '' : raw.purpose || '',
    reference: raw.reference || '',
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
