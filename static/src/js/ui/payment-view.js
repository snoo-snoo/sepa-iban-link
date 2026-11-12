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

const PAYER_KEY = 'sepa_payer_bank';

const BANK_OPTIONS = [
  { id: 'george_at', title: 'George', subtitle: 'Erste / Sparkasse AT', iconName: 'building2' },
  { id: 'elba_at', title: 'Mein ELBA', subtitle: 'Raiffeisen', iconName: 'building2' },
  { id: 'sparkasse_de', title: 'Sparkasse', subtitle: 'Foto-Scan', iconName: 'building2' },
  { id: 'vr_de', title: 'VR, DKB, ING', subtitle: 'Foto-Scan', iconName: 'building2' },
  { id: 'bankaustria_at', title: 'Bank Austria, BAWAG', subtitle: 'QR', iconName: 'building2' },
  { id: 'multibanking', title: 'Andere App', subtitle: 'payto://', iconName: 'externalLink' },
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
  const actionHost = el('div', 'sepa-payment-actions');

  const renderFlow = () => {
    actionHost.replaceChildren();
    const atGeorge = selected === 'george_at' || selected === 'elba_at';
    const deSparkasse = selected === 'sparkasse_de' || selected === 'vr_de' || selected === 'bankaustria_at';
    const multi = selected === 'multibanking';

    if (atGeorge) {
      actionHost.appendChild(
        PrimaryAction('QR teilen', {
          onClick: () => {
            shareSlipImage(payment).catch(() => {});
            copyText(payment.iban.replace(/\s/g, '')).catch(() => {});
          },
        })
      );
      actionHost.appendChild(
        QuietAction('QR-Bild speichern', {
          onClick: async () => {
            const blob = await generateSlipPngBlob(payment);
            const url = URL.createObjectURL(blob);
            const a = el('a', '', { href: url, download: 'SEPA-Zahlschein.png' });
            a.click();
            URL.revokeObjectURL(url);
          },
        })
      );
      return;
    }
    if (deSparkasse) {
      actionHost.appendChild(PrimaryAction('PDF an die Bank-App', { onClick: () => shareSlipPdf(payment) }));
      actionHost.appendChild(QuietAction('QR-Bild teilen', { onClick: () => shareSlipImage(payment) }));
      return;
    }
    if (multi) {
      const payto = el('a', 'kit-primary-action kit-primary-action--link', { href: payment.paytoUri, text: 'payto:// öffnen' });
      const bank = el('a', 'kit-quiet-action kit-quiet-action--link', { href: payment.bankUri, text: 'bank:// öffnen' });
      actionHost.append(payto, bank);
    }
  };

  const renderBanks = () => {
    mountOptionRadiogroup(bankHost, BANK_OPTIONS, selected, (id) => {
      selected = id;
      savePayer(id);
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

  const bankDetails = el('details', 'sepa-fold-details');
  bankDetails.append(el('summary', 'sepa-faq-item__q', { text: 'Andere Bank' }), bankHost);

  const copyDetails = el('details', 'sepa-fold-details');
  copyDetails.append(el('summary', 'sepa-faq-item__q', { text: 'Felder kopieren' }), copySection);

  const qrDetails = el('details', 'sepa-fold-details');
  if (isDesktopNonTouch()) qrDetails.open = true;
  qrDetails.append(el('summary', 'sepa-faq-item__q', { text: 'QR-Code' }), qrHost);

  const bodyBlocks = [summary, actionHost, bankDetails, qrDetails, copyDetails];
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
    window.location.hash = '';
    window.location.pathname = '/';
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
