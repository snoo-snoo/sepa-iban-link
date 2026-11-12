import { generateSlipPdfBlob, generateSlipPngBlob, slipFilenameSlug } from './slip-generator.js';
import { formatAmountDisplay } from '../domain/epc.js';

let fileShareSupported = null;

export const canShareFiles = async () => {
  if (fileShareSupported !== null) return fileShareSupported;
  if (!navigator.share || !navigator.canShare) {
    fileShareSupported = false;
    return false;
  }
  try {
    const test = new File(['x'], 't.txt', { type: 'text/plain' });
    fileShareSupported = navigator.canShare({ files: [test] });
  } catch {
    fileShareSupported = false;
  }
  return fileShareSupported;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const shareFile = async (file, title) => {
  if (await canShareFiles()) {
    await navigator.share({ files: [file], title });
    return true;
  }
  downloadBlob(file, file.name);
  return false;
};

export const shareSlipImage = async (payment) => {
  const blob = await generateSlipPngBlob(payment);
  const file = new File([blob], `SEPA-Zahlschein-${slipFilenameSlug(payment)}.png`, {
    type: 'image/png',
  });
  return shareFile(file, 'SEPA Zahlschein');
};

export const shareSlipPdf = async (payment) => {
  const blob = await generateSlipPdfBlob(payment);
  const file = new File([blob], `SEPA-Ueberweisung-${slipFilenameSlug(payment)}.pdf`, {
    type: 'application/pdf',
  });
  return shareFile(file, 'SEPA Überweisung');
};

export const buildWhatsAppShareUrl = (linkUrl, payment) => {
  const amt = formatAmountDisplay(payment.amount);
  const zweck = payment.reference || payment.purpose || 'Überweisung';
  const msg =
    `Hallo! Hier ist der Überweisungslink über ${amt} an ${payment.recipientName} (${zweck}) – einfach antippen für QR-Code & vorausgefüllte Überweisung:\n${linkUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
};

export const copyText = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  return ok;
};

export const isInAppBrowser = () => {
  const ua = navigator.userAgent || '';
  return /WhatsApp|Instagram|FBAN|FBAV/i.test(ua);
};
