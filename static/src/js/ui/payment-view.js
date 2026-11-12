import { generateSlipPngBlob } from '../services/slip-generator.js';
import {
  copyText,
  isInAppBrowser,
  shareSlipImage,
  shareSlipPdf,
} from '../services/share-service.js';
import { bindCopyRow, clear, el, flashCopied, isDesktopNonTouch, renderEpcQr } from './components.js';

const PAYER_KEY = 'sepa_payer_bank';

const BANK_OPTIONS = [
  { id: 'george_at', label: 'George (Erste Bank / Sparkasse AT)', countries: ['AT'] },
  { id: 'elba_at', label: 'Mein ELBA (Raiffeisen AT)', countries: ['AT'] },
  { id: 'bankaustria_at', label: 'Bank Austria / BAWAG / Volksbank AT', countries: ['AT'] },
  { id: 'sparkasse_de', label: 'App Sparkasse (DE)', countries: ['DE'] },
  { id: 'vr_de', label: 'VR Banking / DKB / ING / Commerzbank', countries: ['DE'] },
  { id: 'multibanking', label: 'Outbank / Banking4 / MoneyMoney (payto://)', countries: ['AT', 'DE', '*'] },
];

const defaultPayerBank = (payment) => {
  const country = payment.recipientBank?.country || payment.iban?.slice(0, 2);
  const lang = (navigator.language || '').toLowerCase();
  if (country === 'AT' || lang.startsWith('de-at')) return 'george_at';
  if (country === 'DE' || lang.startsWith('de-de')) return 'sparkasse_de';
  return payment.recipientBank?.appKey || 'multibanking';
};

const loadPayer = (payment) => localStorage.getItem(PAYER_KEY) || defaultPayerBank(payment);
const savePayer = (id) => localStorage.setItem(PAYER_KEY, id);

export const mountPaymentView = async (root, state) => {
  const payment = state.payment;
  if (!payment) {
    root.appendChild(el('p', 'sepa-alert', { text: state.error || 'Zahlungsdaten nicht verfügbar.' }));
    return;
  }

  clear(root);
  const wrap = el('div', 'sepa-payment');

  if (isInAppBrowser()) {
    wrap.appendChild(
      el('p', 'sepa-hint sepa-hint--inapp', {
        text: 'Tipp: Falls Teilen im In-App-Browser blockiert wird, oben rechts „Im Browser öffnen“ (Safari/Chrome) wählen.',
      })
    );
  }

  const card = el('article', 'sepa-card sepa-card--payment');
  const amountEl = el('p', 'sepa-payment__amount', {
    text: payment.amount ? payment.amountFormatted : 'Betrag frei wählbar',
  });
  const nameEl = el('h1', 'sepa-payment__name', { text: payment.recipientName });
  const ibanEl = el('p', 'sepa-payment__iban', { text: payment.ibanFormatted });
  const bankBadge = el(
    'span',
    'sepa-badge sepa-badge--bank',
    {
      text: payment.recipientBank
        ? `${payment.recipientBank.country} · ${payment.recipientBank.bankName}`
        : payment.iban.slice(0, 2),
    }
  );
  const purposeEl = el('p', 'sepa-payment__purpose', {
    text: payment.reference
      ? `Zahlungsreferenz: ${payment.reference}`
      : payment.purpose
        ? `Verwendungszweck: ${payment.purpose}`
        : '',
  });

  card.append(amountEl, nameEl, ibanEl, bankBadge, purposeEl);

  if (payment.verified) {
    card.appendChild(el('span', 'sepa-badge sepa-badge--signed', { text: 'Signierter Zahlungslink' }));
  }

  card.appendChild(
    el('p', 'sepa-payment__security', {
      text: 'Bitte Empfänger und Betrag vor der Freigabe in deiner Banking-App kurz prüfen.',
    })
  );

  wrap.appendChild(card);

  const desktop = isDesktopNonTouch();
  if (desktop) {
    const desk = el('section', 'sepa-card sepa-card--desktop-qr');
    desk.appendChild(
      el('p', 'sepa-card__lead', {
        text: 'Kamera / Scan & Pay in George, Mein ELBA oder Sparkassen-App öffnen und Code vom Bildschirm scannen – fertig!',
      })
    );
    const qr = el('div', 'sepa-qr sepa-qr--hero');
    desk.appendChild(qr);
    wrap.appendChild(desk);
    await renderEpcQr(qr, payment.epcPayload);
    const paytoBtn = el('a', 'sepa-btn sepa-btn--secondary', {
      href: payment.paytoUri,
      text: 'payto:// in Banking-App öffnen',
    });
    desk.appendChild(paytoBtn);
  }

  let selected = loadPayer(payment);

  const bankSection = el('section', 'sepa-card sepa-card--banks');
  bankSection.appendChild(el('h2', 'sepa-card__title', { text: 'Womit überweist du?' }));
  const bankList = el('div', 'sepa-bank-list');
  bankSection.appendChild(bankList);

  const flowHost = el('div', 'sepa-flow');
  bankSection.appendChild(flowHost);

  wrap.appendChild(bankSection);

  const renderBanks = () => {
    clear(bankList);
    BANK_OPTIONS.forEach((opt) => {
      const btn = el('button', `sepa-bank${selected === opt.id ? ' sepa-bank--active' : ''}`, {
        type: 'button',
        text: opt.label,
      });
      btn.addEventListener('click', () => {
        selected = opt.id;
        savePayer(selected);
        renderBanks();
        renderFlow();
      });
      bankList.appendChild(btn);
    });
  };

  const renderFlow = () => {
    clear(flowHost);
    const atGeorge = selected === 'george_at' || selected === 'elba_at';
    const deSparkasse = selected === 'sparkasse_de' || selected === 'vr_de' || selected === 'bankaustria_at';
    const multi = selected === 'multibanking';

    if (atGeorge) {
      const primary = el('button', 'sepa-btn sepa-btn--primary', {
        type: 'button',
        text: 'QR-Zahlschein teilen / in Fotos sichern',
      });
      const secondary = el('button', 'sepa-btn sepa-btn--secondary', {
        type: 'button',
        text: 'QR-Bild speichern',
      });

      primary.addEventListener('click', () => {
        shareSlipImage(payment).catch(() => {});
        copyText(payment.ibanFormatted.replace(/\s/g, '')).catch(() => {});
      });
      secondary.addEventListener('click', async () => {
        const blob = await generateSlipPngBlob(payment);
        const url = URL.createObjectURL(blob);
        const a = el('a', '', { href: url, download: `SEPA-Zahlschein.png` });
        a.click();
        URL.revokeObjectURL(url);
      });

      const steps = el('ol', 'sepa-steps');
      if (selected === 'george_at') {
        steps.append(
          el('li', 'sepa-steps__item', { text: 'QR-Zahlschein teilen oder in Fotos sichern.' }),
          el('li', 'sepa-steps__item', {
            html: '<strong>George</strong>: <em>Scan & Pay</em> → Bild-/Datei-Symbol wählen → mit <strong>George ID</strong> freigeben.',
          }),
          el('li', 'sepa-steps__item', {
            text: 'Alle Felder sind vorausgefüllt – kurz prüfen und freigeben.',
          })
        );
      } else {
        steps.append(
          el('li', 'sepa-steps__item', { text: 'QR-Zahlschein teilen oder in Fotos sichern.' }),
          el('li', 'sepa-steps__item', {
            html: '<strong>Mein ELBA</strong>: <em>Neue Überweisung</em> → QR-Code / Zahlschein scannen bzw. Bild wählen.',
          }),
          el('li', 'sepa-steps__item', {
            text: 'Daten prüfen und Überweisung freigeben.',
          })
        );
      }

      flowHost.append(primary, secondary, steps);
      return;
    }

    if (deSparkasse) {
      const pdfBtn = el('button', 'sepa-btn sepa-btn--primary', {
        type: 'button',
        text: 'An Banking-App übergeben (Zahlschein-PDF teilen)',
      });
      const imgBtn = el('button', 'sepa-btn sepa-btn--secondary', {
        type: 'button',
        text: 'Als QR-Bild teilen',
      });
      pdfBtn.addEventListener('click', () => shareSlipPdf(payment));
      imgBtn.addEventListener('click', () => shareSlipImage(payment));
      flowHost.append(pdfBtn, imgBtn);
      return;
    }

    if (multi) {
      const payto = el('a', 'sepa-btn sepa-btn--primary', {
        href: payment.paytoUri,
        text: 'Direkt per payto:// in Banking-App öffnen',
      });
      const bank = el('a', 'sepa-btn sepa-btn--secondary', {
        href: payment.bankUri,
        text: 'bank://-Link öffnen',
      });
      flowHost.append(payto, bank);
    }
  };

  const quickMulti = el('button', 'sepa-btn sepa-btn--ghost', {
    type: 'button',
    text: 'Schnell: payto:// öffnen',
  });
  quickMulti.addEventListener('click', () => {
    window.location.href = payment.paytoUri;
  });
  bankSection.appendChild(quickMulti);

  const copyBar = el('section', 'sepa-card sepa-card--copy');
  copyBar.appendChild(el('h2', 'sepa-card__title', { text: 'Kopierleiste' }));
  const amountPreview = payment.amount
    ? payment.amountFormatted
    : 'Betrag frei wählbar';
  const purposePreview =
    payment.reference || payment.purpose || '—';
  const rows = [
    ['IBAN kopieren', payment.ibanFormatted, () => payment.iban.replace(/\s/g, '')],
    ['Empfänger kopieren', payment.recipientName, () => payment.recipientName],
    ['Betrag kopieren', amountPreview, () => payment.amount || ''],
    ['Verwendungszweck kopieren', purposePreview, () => payment.reference || payment.purpose || ''],
  ];
  rows.forEach(([label, preview, getter]) => {
    const btn = el('button', 'sepa-copy-row', {
      type: 'button',
      html: `${label} · <span class="sepa-copy-row__value">${preview}</span>`,
    });
    bindCopyRow(btn, getter, () => flashCopied(btn));
    copyBar.appendChild(btn);
  });

  wrap.appendChild(copyBar);

  if (!desktop) {
    const mobQr = el('section', 'sepa-card sepa-card--mobile-qr');
    mobQr.appendChild(el('h2', 'sepa-card__title', { text: 'EPC-QR-Code' }));
    const qr = el('div', 'sepa-qr');
    mobQr.appendChild(qr);
    wrap.insertBefore(mobQr, bankSection);
    await renderEpcQr(qr, payment.epcPayload);
  }

  const footer = el('footer', 'sepa-footer');
  footer.appendChild(
    el('a', 'sepa-footer__link', { href: '/', text: 'Eigenen SEPA-Überweisungslink erstellen' })
  );
  wrap.appendChild(footer);

  root.appendChild(wrap);
  renderBanks();
  renderFlow();
};
