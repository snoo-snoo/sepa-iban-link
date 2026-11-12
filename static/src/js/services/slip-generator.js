import QRCode from 'qrcode';
import { formatIban } from '../domain/iban.js';
import { buildEpcPayload, formatAmountDisplay, parseEurAmount } from '../domain/epc.js';

const W = 1080;
const H = 1350;

const drawRoundedRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const generateSlipCanvas = async (payment) => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 42px system-ui, Helvetica, Arial, sans-serif';
  ctx.fillText('SEPA-Zahlungsanweisung · EPC-QR / GiroCode', 60, 80);

  const epcPayload =
    payment.epcPayload ??
    buildEpcPayload({
      name: payment.recipientName,
      iban: payment.iban,
      bic: payment.bic,
      amount: payment.amount,
      purpose: payment.purpose,
      reference: payment.reference,
    });

  const qrDataUrl = await QRCode.toDataURL(epcPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 720,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 720;
  const qrX = (W - qrSize) / 2;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, qrX - 20, 160, qrSize + 40, qrSize + 40, 16);
  ctx.fill();
  ctx.drawImage(qrImg, qrX, 180, qrSize, qrSize);

  let y = 940;
  const line = (label, value) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '28px system-ui, Helvetica, Arial, sans-serif';
    ctx.fillText(label, 60, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px system-ui, Helvetica, Arial, sans-serif';
    const lines = wrapText(ctx, value, W - 120);
    lines.forEach((ln) => {
      ctx.fillText(ln, 60, y + 42);
      y += 46;
    });
    y += 24;
  };

  line('Empfänger:', payment.recipientName || '—');
  line('IBAN:', payment.ibanFormatted || formatIban(payment.iban));
  if (payment.bic) line('BIC:', payment.bic);
  const amt = payment.amountFormatted || formatAmountDisplay(payment.amount);
  line('Betrag:', payment.amount ? `EUR ${amt.replace(' €', '').trim()}` : 'EUR — (frei wählbar)');
  if (payment.reference) line('Zahlungsreferenz:', payment.reference);
  else if (payment.purpose) line('Verwendungszweck:', payment.purpose);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px system-ui, Helvetica, Arial, sans-serif';
  ctx.fillText('Bitte Daten in der Banking-App vor Freigabe prüfen.', 60, H - 50);

  return canvas;
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const wrapText = (ctx, text, maxWidth) => {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
};

export const generateSlipPngBlob = async (payment) => {
  const canvas = await generateSlipCanvas(payment);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
};

const canvasToJpegBytes = (canvas) =>
  new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      },
      'image/jpeg',
      0.92
    );
  });

/** Minimal PDF 1.4 — single A4 page, embedded JPEG + Helvetica text. */
export const generateSlipPdfBlob = async (payment) => {
  const canvas = await generateSlipCanvas(payment);
  const jpegBytes = await canvasToJpegBytes(canvas);

  const amountLabel = payment.amount
    ? `EUR ${parseEurAmount(payment.amount).formatted.replace(' €', '')}`
    : 'frei wählbar';
  const textLines = [
    `Empfänger: ${payment.recipientName}`,
    `IBAN: ${formatIban(payment.iban)}`,
    payment.bic ? `BIC: ${payment.bic}` : '',
    `Betrag: ${amountLabel}`,
    payment.reference
      ? `Zahlungsreferenz: ${payment.reference}`
      : payment.purpose
        ? `Verwendungszweck: ${payment.purpose}`
        : '',
  ].filter(Boolean);

  const pdf = buildPdfDocument(jpegBytes, textLines);
  return new Blob([pdf], { type: 'application/pdf' });
};

const CP1252_OVERRIDES = new Map(
  Object.entries({
    '€': 0x80,
    '‚': 0x82,
    'ƒ': 0x83,
    '„': 0x84,
    '…': 0x85,
    '†': 0x86,
    '‡': 0x87,
    'ˆ': 0x88,
    '‰': 0x89,
    'Š': 0x8a,
    '‹': 0x8b,
    'Œ': 0x8c,
    'Ž': 0x8e,
    '‘': 0x91,
    '’': 0x92,
    '“': 0x93,
    '”': 0x94,
    '•': 0x95,
    '–': 0x96,
    '—': 0x97,
    '˜': 0x98,
    '™': 0x99,
    'š': 0x9a,
    '›': 0x9b,
    'œ': 0x9c,
    'ž': 0x9e,
    'Ÿ': 0x9f,
  })
);

const escPdfWinAnsi = (s) => {
  let out = '';
  for (const ch of String(s)) {
    if (ch === '\\' || ch === '(' || ch === ')') {
      out += `\\${ch}`;
      continue;
    }
    let byte = CP1252_OVERRIDES.get(ch);
    if (byte === undefined) {
      const code = ch.charCodeAt(0);
      if (code <= 0xff) byte = code;
      else byte = 0x3f;
    }
    if (byte >= 0x20 && byte <= 0x7e) out += ch;
    else out += `\\${byte.toString(8).padStart(3, '0')}`;
  }
  return out;
};

const buildPdfDocument = (jpegBytes, textLines) => {
  const enc = new TextEncoder();
  const chunks = [];

  const byteLength = () => chunks.reduce((n, c) => n + c.length, 0);
  const pushStr = (s) => chunks.push(enc.encode(s));
  const pushBin = (b) => chunks.push(b);

  const offsets = [0];
  pushStr('%PDF-1.4\n');

  const recordOffset = () => offsets.push(byteLength());

  recordOffset();
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  recordOffset();
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  recordOffset();
  pushStr(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 5 0 R >> /XObject << /Im1 4 0 R >> >> /Contents 6 0 R >>\nendobj\n'
  );

  recordOffset();
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBin(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  recordOffset();
  pushStr(
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'
  );

  const content = ['q', '0.36 0 0 0.36 72 120 cm', '/Im1 Do', 'Q', 'BT', '/F1 11 Tf', '72 750 Td'];
  textLines.forEach((line, i) => {
    if (i > 0) content.push('0 -15 Td');
    content.push(`(${escPdfWinAnsi(line)}) Tj`);
  });
  content.push('ET');
  const streamBytes = enc.encode(content.join('\n'));

  recordOffset();
  pushStr(`6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
  pushBin(streamBytes);
  pushStr('\nendstream\nendobj\n');

  const xrefStart = byteLength();
  const objCount = 7;
  pushStr(`xref\n0 ${objCount}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < objCount; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const out = new Uint8Array(byteLength());
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
};

export const slipFilenameSlug = (payment) => {
  const name = (payment.recipientName || 'SEPA').replace(/[^\wäöüÄÖÜß-]+/gi, '-').slice(0, 40);
  return name || 'SEPA';
};
