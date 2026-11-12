import { generateSlipPngBlob } from '../services/slip-generator.js';
import {
  copyText,
  isInAppBrowser,
  shareSlipImage,
  shareSlipPdf,
} from '../services/share-service.js';
import { bindCopyRow, clear, flashCopied, isDesktopNonTouch, renderEpcQr } from './components.js';
import { icon } from './icons.js';
import {
  MobileScreen,
  PhoneFrame,
  PrimaryAction,
  QuietAction,
  el,
  mountOptionRadiogroup,
} from './kit-primitives.js';
import { mountThemeToggle } from './theme.js';

const BANK_OPTIONS = [
  { id: 'george_at', title: 'George', subtitle: 'Erste / Sparkasse AT', iconName: 'building2' },
  { id: 'elba_at', title: 'Mein ELBA', subtitle: 'Raiffeisen', iconName: 'building2' },
  { id: 'sparkasse_de', title: 'Sparkasse', subtitle: 'Foto-Scan', iconName: 'building2' },
  { id: 'vr_de', title: 'VR, DKB, ING', subtitle: 'Foto-Scan', iconName: 'building2' },
  { id: 'bankaustria_at', title: 'Bank Austria, BAWAG', subtitle: 'QR', iconName: 'building2' },
  { id: 'multibanking', title: 'Andere App', subtitle: 'payto://', iconName: 'externalLink' },
];

const VALID_BANK_IDS = new Set(BANK_OPTIONS.map((o) => o.id));

const recipientCountry = (payment) =>
  payment.recipientBank?.country || payment.iban?.slice(0, 2) || 'AT';

const payerStorageKey = (payment) => `sepa_payer_bank:${recipientCountry(payment)}`;

const payerCountryFromLang = () => {
  const lang = (navigator.language || '').toLowerCase();
  if (lang.startsWith('de-de')) return 'DE';
  if (lang.startsWith('de-at')) return 'AT';
  return null;
};

const defaultPayerBank = (payment) => {
  const country = recipientCountry(payment);
  const fromLang = payerCountryFromLang();
  if (fromLang && fromLang !== country) {
    return fromLang === 'DE' ? 'sparkasse_de' : 'george_at';
  }
  return country === 'DE' ? 'sparkasse_de' : 'george_at';
};

const loadPayer = (payment) => {
  const stored = localStorage.getItem(payerStorageKey(payment));
  if (stored && VALID_BANK_IDS.has(stored)) return stored;
  return defaultPayerBank(payment);
};

const savePayer = (payment, id) => localStorage.setItem(payerStorageKey(payment), id);

const bankTitle = (id) => BANK_OPTIONS.find((o) => o.id === id)?.title || id;

export const mountPaymentView = async (root, state) => {
  const payment = state.payment;
  if (!payment) {
    root.appendChild(el('p', 'kit-inline-error', { text: state.error || 'Zahlungsdaten nicht verfügbar.' }));
    return;
  }

  clear(root);
  const page = el('div', 'sepa-payment-page');

  const top = el('header', 'sepa-payment-top');
  const banner = el('p', 'sepa-payment-banner');
  banner.append(icon('shieldCheck', { size: 16 }), document.createTextNode(' Nichts am Server'));
  const theme = el('div', 'sepa-payment-top__theme');
  mountThemeToggle(theme, { compact: true });
  top.append(banner, theme);
  page.appendChild(top);

  let selected = loadPayer(payment);
  const bankHost = el('div', 'sepa-payment-banks');
  bankHost.setAttribute('aria-label', 'Deine Bank-App wählen');
  const payerBar = el('div', 'sepa-payment-payer-bar');
  const actionHost = el('div', 'sepa-payment-actions');
  const shareFeedback = el('div', 'sepa-payment-feedback sepa-payment-feedback--empty', {
    role: 'status',
    'aria-live': 'polite',
  });

  const setShareFeedback = (message, isError = false) => {
    shareFeedback.textContent = message || '';
    shareFeedback.classList.toggle('kit-inline-error', Boolean(isError && message));
    shareFeedback.classList.toggle('sepa-payment-feedback--empty', !message);
  };

  const runShare = async (shareFn, { copyIbanOnShared = false } = {}) => {
    try {
      const outcome = await shareFn(payment);
      if (outcome === 'cancelled') {
        setShareFeedback('');
        return;
      }
      if (outcome === 'downloaded') {
        setShareFeedback(
          'Zahlschein heruntergeladen – in deiner Banking-App unter Foto-/QR-Überweisung öffnen.'
        );
        return;
      }
      if (outcome === 'shared' && copyIbanOnShared) {
        await copyText(payment.iban.replace(/\s/g, ''));
        setShareFeedback('QR bereit · IBAN in Zwischenablage kopiert ✓');
        return;
      }
      setShareFeedback('');
    } catch {
      setShareFeedback('Teilen fehlgeschlagen – bitte QR-Code oder Felder unten nutzen.', true);
    }
  };

  const bindMultiBankHint = (link) => {
    link.addEventListener('click', () => {
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setShareFeedback(
            'Falls sich keine App öffnet: oben rechts im Browser öffnen oder QR-Code nutzen.'
          );
        }
      }, 800);
    });
  };

  const renderPayerBar = () => {
    payerBar.replaceChildren();
    const label = el('span', 'sepa-payment-payer-bar__label', {
      text: `Deine Bank-App: ${bankTitle(selected)}`,
    });
    const sep = document.createTextNode(' · ');
    const change = el('button', 'sepa-payment-payer-bar__change', { type: 'button', text: 'Ändern' });
    change.addEventListener('click', () => {
      bankDetails.open = !bankDetails.open;
      bankDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    payerBar.append(label, sep, change);
  };

  const renderFlow = () => {
    renderPayerBar();
    actionHost.replaceChildren();
    const atQr = selected === 'george_at' || selected === 'elba_at' || selected === 'bankaustria_at';
    const deSparkasse = selected === 'sparkasse_de' || selected === 'vr_de';
    const multi = selected === 'multibanking';

    if (atQr) {
      actionHost.appendChild(
        PrimaryAction('QR teilen', {
          onClick: () => runShare(shareSlipImage, { copyIbanOnShared: true }),
        })
      );
      actionHost.appendChild(
        QuietAction('QR-Bild speichern', {
          onClick: async () => {
            try {
              const blob = await generateSlipPngBlob(payment);
              const url = URL.createObjectURL(blob);
              const a = el('a', '', { href: url, download: 'SEPA-Zahlschein.png' });
              a.click();
              URL.revokeObjectURL(url);
              setShareFeedback(
                'Zahlschein heruntergeladen – in deiner Banking-App unter Foto-/QR-Überweisung öffnen.'
              );
            } catch {
              setShareFeedback('Teilen fehlgeschlagen – bitte QR-Code oder Felder unten nutzen.', true);
            }
          },
        })
      );
      return;
    }
    if (deSparkasse) {
      actionHost.appendChild(
        PrimaryAction('PDF an die Bank-App', { onClick: () => runShare(shareSlipPdf) })
      );
      actionHost.appendChild(
        QuietAction('QR-Bild teilen', { onClick: () => runShare(shareSlipImage) })
      );
      return;
    }
    if (multi) {
      const payto = el('a', 'kit-primary-action kit-primary-action--link', {
        href: payment.paytoUri,
        text: 'payto:// öffnen',
      });
      const bank = el('a', 'kit-quiet-action kit-quiet-action--link', {
        href: payment.bankUri,
        text: 'bank:// öffnen',
      });
      bindMultiBankHint(payto);
      bindMultiBankHint(bank);
      actionHost.append(payto, bank);
    }
  };

  const bankDetails = el('details', 'sepa-fold-details');

  const renderBanks = () => {
    mountOptionRadiogroup(bankHost, BANK_OPTIONS, selected, (id) => {
      selected = id;
      savePayer(payment, id);
      setShareFeedback('');
      renderFlow();
    });
  };

  const titleId = 'payment-screen-title';
  const summary = el('article', 'sepa-payment-summary');
  summary.appendChild(
    el('p', 'sepa-payment-summary__amount', {
      text: payment.amount ? payment.amountFormatted : 'Betrag frei wählbar',
    })
  );
  const name = el('h1', 'sepa-payment-summary__name', { text: payment.recipientName });
  name.id = titleId;
  summary.appendChild(name);
  summary.appendChild(el('p', 'sepa-payment-summary__iban', { text: payment.ibanFormatted }));
  if (payment.recipientBank) {
    summary.appendChild(
      el('span', 'sepa-payment-summary__bank', {
        text: `${payment.recipientBank.country} · ${payment.recipientBank.bankName}`,
      })
    );
  }
  const purpose =
    payment.reference ? `Zahlungsreferenz: ${payment.reference}` : payment.purpose ? `Verwendungszweck: ${payment.purpose}` : '';
  if (purpose) summary.appendChild(el('p', 'sepa-payment-summary__purpose', { text: purpose }));

  const qrHost = el('div', 'kit-qr-card');
  const qrInner = el('div', 'kit-qr-host');
  qrHost.appendChild(qrInner);

  const copySection = el('div', 'sepa-payment-copy');
  const amountPreview = payment.amount ? payment.amountFormatted : 'Betrag frei wählbar';
  const purposePreview = payment.reference || payment.purpose || '—';
  const rows = [
    ['IBAN', payment.ibanFormatted, () => payment.iban.replace(/\s/g, '')],
    ['Empfänger', payment.recipientName, () => payment.recipientName],
    ['Betrag', amountPreview, () => payment.amount || ''],
    ['Verwendungszweck', purposePreview, () => payment.reference || payment.purpose || ''],
  ];
  rows.forEach(([label, preview, getter]) => {
    const row = el('button', 'sepa-copy-row', { type: 'button' });
    const lab = el('span', 'sepa-copy-row__label', { text: label });
    const val = el('span', 'sepa-copy-row__value', { text: preview });
    row.append(lab, val);
    bindCopyRow(row, getter, () => flashCopied(row, 'Kopiert ✓'));
    copySection.appendChild(row);
  });

  bankDetails.append(el('summary', 'sepa-faq-item__q', { text: 'Deine Bank-App wählen' }), bankHost);

  const copyDetails = el('details', 'sepa-fold-details');
  copyDetails.append(el('summary', 'sepa-faq-item__q', { text: 'Felder kopieren' }), copySection);

  const qrDetails = el('details', 'sepa-fold-details');
  if (isDesktopNonTouch()) qrDetails.open = true;
  qrDetails.append(el('summary', 'sepa-faq-item__q', { text: 'QR-Code' }), qrHost);

  const bodyBlocks = [summary, payerBar, actionHost, shareFeedback, bankDetails, qrDetails, copyDetails];
  if (isInAppBrowser()) {
    bodyBlocks.splice(
      1,
      0,
      el('p', 'kit-inline-hint', { text: 'Teilen blockiert? Oben rechts im Browser öffnen.' })
    );
  }

  const footer = el('div', 'sepa-payment-footer');
  const own = el('a', 'kit-quiet-action kit-quiet-action--link', { href: '/', text: 'Eigenen Link erstellen' });
  own.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', '/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  footer.appendChild(own);

  const screen = MobileScreen({
    titleId,
    children: bodyBlocks,
    footer,
    testId: 'payment-view',
  });

  page.appendChild(PhoneFrame(() => screen));
  root.appendChild(page);

  renderBanks();
  renderFlow();
  await renderEpcQr(qrInner, payment.epcPayload);
};
