import { formatIban, lookupRecipientBank, normalizeIban, validateIban } from '../domain/iban.js';
import {
  buildEpcPayload,
  encodePaymentToken,
  formatAmountDisplay,
  parseEurAmount,
  validateRfReference,
} from '../domain/epc.js';
import { clearProfile, DEMO_AT, DEMO_DE, loadProfile, saveProfile } from '../domain/profile.js';
import { buildWhatsAppShareUrl, copyText } from '../services/share-service.js';
import { flashCopied, renderEpcQr } from './components.js';
import { icon } from './icons.js';
import {
  BackButton,
  MobileScreen,
  PhoneFrame,
  PrimaryAction,
  ProgressBar,
  QuietAction,
  StepTransition,
  el,
  tapHaptic,
} from './kit-primitives.js';

export const FLOW_STEPS = [
  { id: 'privacy', label: 'Datenschutz', detail: 'Lokale Speicherung' },
  { id: 'iban', label: 'IBAN lokal speichern', detail: 'Einmalige Einrichtung' },
  { id: 'amount', label: 'Betrag & Link', detail: 'Für jede Zahlung' },
  { id: 'ready', label: 'Teilen & QR', detail: 'WhatsApp & QR' },
];

const initialStep = () => (loadProfile() ? 'amount' : 'privacy');

export const mountGeneratorFlow = (host, state, { onStepChange } = {}) => {
  let step = initialStep();
  let frameRoot = null;
  const screenHost = el('div', 'kit-screen-host');

  const fields = {
    name: '',
    iban: '',
    bic: '',
    amount: '',
    purpose: '',
    reference: '',
    purposeMode: 'purpose',
  };

  let currentLink = '';
  let previewPayment = null;

  const syncProfile = () => {
    const p = loadProfile();
    if (p) {
      fields.name = p.name;
      fields.iban = p.iban;
      fields.bic = p.bic || '';
    }
  };
  syncProfile();

  const setStep = (next) => {
    step = next;
    onStepChange?.(step);
    render();
  };

  const baseUrl = () => String(state.baseUrl || window.location.origin).replace(/\/$/, '');

  const buildFieldsPayload = () => {
    const amountParsed = parseEurAmount(fields.amount);
    return {
      name: fields.name.trim(),
      iban: normalizeIban(fields.iban),
      bic: fields.bic.trim(),
      amount: amountParsed.invalid ? '' : amountParsed.value,
      purpose: fields.purposeMode === 'purpose' ? fields.purpose.trim() : '',
      reference: fields.purposeMode === 'reference' ? fields.reference.trim() : '',
    };
  };

  const validateAmountStep = () => {
    const f = buildFieldsPayload();
    if (!f.name) return 'Bitte zuerst Empfänger und IBAN speichern.';
    const v = validateIban(f.iban);
    if (!v.valid) return 'Gespeicherte IBAN ist ungültig – bitte erneut eintragen.';
    if (fields.amount && parseEurAmount(fields.amount).invalid) return 'Bitte gültigen Betrag eingeben.';
    if (f.reference && f.reference.toUpperCase().startsWith('RF') && !validateRfReference(f.reference)) {
      return 'Zahlungsreferenz (RF…) ist ungültig.';
    }
    try {
      buildEpcPayload({
        name: f.name,
        iban: f.iban,
        bic: f.bic,
        amount: f.amount,
        purpose: f.purpose,
        reference: f.reference,
      });
    } catch (e) {
      return e.message || 'EPC-Daten ungültig.';
    }
    return null;
  };

  const generateLink = () => {
    const err = validateAmountStep();
    if (err) return err;
    const f = buildFieldsPayload();
    const token = encodePaymentToken(f);
    currentLink = `${baseUrl()}/#p=${token}`;
    const bank = lookupRecipientBank(f.iban);
    previewPayment = {
      recipientName: f.name,
      iban: f.iban,
      ibanFormatted: formatIban(f.iban),
      bic: f.bic || bank?.defaultBic || '',
      amount: f.amount,
      amountFormatted: formatAmountDisplay(f.amount),
      purpose: f.purpose,
      reference: f.reference,
      recipientBank: bank,
      epcPayload: buildEpcPayload({
        name: f.name,
        iban: f.iban,
        bic: f.bic,
        amount: f.amount,
        purpose: f.purpose,
        reference: f.reference,
      }),
    };
    return null;
  };

  const stepIndex = () => FLOW_STEPS.findIndex((s) => s.id === step);

  const renderPrivacy = (titleId) => {
    const content = el('div', 'kit-flow-block');
    const h = el('h1', 'kit-heading', { text: 'Überweisungslink erstellen' });
    h.id = titleId;
    content.appendChild(h);
    content.appendChild(
      el('p', 'kit-lead', { text: 'IBAN einmal speichern. Danach nur den Betrag.' })
    );
    const security = el('p', 'kit-security-line');
    security.append(icon('lock', { size: 14 }), document.createTextNode(' Bleibt auf diesem Gerät'));
    content.appendChild(security);
    const footer = el('div', 'kit-footer-stack');
    footer.appendChild(PrimaryAction('Jetzt starten', { onClick: () => setStep('iban') }));
    footer.appendChild(
      QuietAction('Beispiel ansehen', {
        onClick: () => {
          saveProfile(DEMO_AT);
          syncProfile();
          setStep('amount');
        },
      })
    );
    return MobileScreen({
      titleId,
      children: StepTransition('privacy', content),
      footer,
      testId: 'step-privacy',
    });
  };

  const renderIban = (titleId) => {
    const content = el('div', 'kit-flow-block');
    const h = el('h2', 'kit-heading', { text: 'Deine IBAN' });
    h.id = titleId;
    content.appendChild(h);
    content.appendChild(el('p', 'kit-lead', { text: 'Nur in diesem Browser. Jederzeit löschbar.' }));

    const nameInput = el('input', 'kit-input', {
      type: 'text',
      maxlength: '70',
      placeholder: 'z. B. Max Mustermann',
      autocomplete: 'name',
    });
    nameInput.value = fields.name;
    const ibanInput = el('input', 'kit-input kit-input--mono', {
      type: 'text',
      inputmode: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: 'AT48 2011 …',
    });
    ibanInput.value = formatIban(fields.iban);

    const pills = el('div', 'kit-pill-row');
    const pillAt = el('button', 'kit-pill', { type: 'button', text: 'Demo AT (George)' });
    const pillDe = el('button', 'kit-pill', { type: 'button', text: 'Demo DE (Sparkasse)' });
    pills.append(pillAt, pillDe);

    const bicDetails = el('details', 'kit-details');
    const bicInput = el('input', 'kit-input kit-input--mono', {
      placeholder: 'BIC (optional)',
      autocomplete: 'off',
    });
    bicInput.value = fields.bic;
    bicDetails.append(
      el('summary', 'kit-details__summary', { text: 'BIC (optional – in AT/DE automatisch)' }),
      bicInput
    );

    const status = el('p', 'kit-inline-hint');

    const refreshChecklist = () => {
      const nameOk = fields.name.trim().length > 0;
      const v = validateIban(fields.iban);
      if (!fields.iban) status.textContent = nameOk ? 'Jetzt die IBAN eintragen.' : '';
      else if (!v.valid) status.textContent = 'IBAN noch ungültig.';
      else {
        const bank = lookupRecipientBank(fields.iban);
        status.textContent = bank ? `IBAN gültig · ${bank.bankName}` : 'IBAN gültig';
      }
      return nameOk && v.valid;
    };

    const saveBtn = PrimaryAction('Speichern und Betrag eingeben', {
      disabled: true,
      onClick: () => {
        saveProfile({ name: fields.name.trim(), iban: fields.iban, bic: fields.bic });
        syncProfile();
        setStep('amount');
      },
    });
    const updateSave = () => {
      saveBtn.disabled = !refreshChecklist();
    };

    nameInput.addEventListener('input', () => {
      fields.name = nameInput.value;
      updateSave();
    });
    ibanInput.addEventListener('input', () => {
      fields.iban = normalizeIban(ibanInput.value);
      ibanInput.value = formatIban(fields.iban);
      updateSave();
    });
    bicInput.addEventListener('input', () => {
      fields.bic = bicInput.value.toUpperCase().replace(/\s/g, '');
    });
    pillAt.addEventListener('click', () => {
      fields.name = DEMO_AT.name;
      fields.iban = DEMO_AT.iban;
      nameInput.value = fields.name;
      ibanInput.value = formatIban(fields.iban);
      updateSave();
    });
    pillDe.addEventListener('click', () => {
      fields.name = DEMO_DE.name;
      fields.iban = DEMO_DE.iban;
      nameInput.value = fields.name;
      ibanInput.value = formatIban(fields.iban);
      updateSave();
    });

    content.append(
      el('label', 'kit-label', { text: 'Dein Name (Zahlungsempfänger)' }),
      nameInput,
      el('label', 'kit-label', { text: 'Deine IBAN' }),
      ibanInput,
      pills,
      bicDetails,
      status
    );
    updateSave();

    return MobileScreen({
      titleId,
      header: [
        BackButton(() => setStep(loadProfile() ? 'amount' : 'privacy'), 'Zurück'),
        ProgressBar({ value: 1, label: 'Schritt 2 von 2', visibleLabel: false }),
        el('span', 'kit-step-count', { text: '2/2' }),
      ],
      children: StepTransition('iban', content),
      footer: saveBtn,
      testId: 'step-iban',
    });
  };

  const renderAmount = (titleId) => {
    syncProfile();
    const content = el('div', 'kit-flow-block');

    const profile = loadProfile();
    if (profile) {
      const card = el('div', 'kit-local-account');
      const lock = icon('lock', { size: 16 });
      const name = el('span', 'kit-local-account__name', { text: profile.name });
      const compact = normalizeIban(profile.iban);
      const shown = compact.length >= 8 ? `${compact.slice(0, 4)} ···· ${compact.slice(-4)}` : compact;
      const ibanMask = el('span', 'kit-local-account__iban', { text: shown });
      const badge = el('span', 'kit-local-account__badge', { text: 'Lokal gespeichert' });
      card.append(lock, name, ibanMask, badge);
      const actions = el('div', 'kit-local-account__actions');
      const edit = el('button', 'kit-text-btn', { type: 'button', text: 'Ändern' });
      const del = el('button', 'kit-text-btn kit-text-btn--danger', { type: 'button', text: 'Löschen' });
      edit.addEventListener('click', () => setStep('iban'));
      del.addEventListener('click', () => {
        clearProfile();
        fields.name = '';
        fields.iban = '';
        setStep('privacy');
      });
      actions.append(edit, del);
      card.appendChild(actions);
      content.appendChild(card);
    }

    const h = el('h2', 'kit-heading', { text: 'Betrag' });
    h.id = titleId;
    content.appendChild(h);

    const amountWrap = el('div', 'kit-amount-hero');
    const amountInput = el('input', 'kit-amount-input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: '0,00',
      autocomplete: 'off',
    });
    amountInput.value = fields.amount;
    const suffix = el('span', 'kit-amount-suffix', { text: '€' });
    amountWrap.append(amountInput, suffix);

    const chips = el('div', 'kit-chip-row');
    ['10', '15', '25', '50'].forEach((v) => {
      const c = el('button', 'kit-chip', { type: 'button', text: `${v} €` });
      c.addEventListener('click', () => {
        fields.amount = `${v},00`;
        amountInput.value = fields.amount;
      });
      chips.appendChild(c);
    });
    const freeChip = el('button', 'kit-chip', { type: 'button', text: 'Freier Betrag' });
    freeChip.addEventListener('click', () => {
      fields.amount = '';
      amountInput.value = '';
    });
    chips.appendChild(freeChip);

    amountInput.addEventListener('input', () => {
      fields.amount = amountInput.value;
    });

    const purposeInput = el('input', 'kit-input', {
      type: 'text',
      maxlength: '140',
      placeholder: 'Wofür? (optional)',
    });
    purposeInput.value = fields.purpose;
    purposeInput.addEventListener('input', () => {
      fields.purpose = purposeInput.value;
    });

    const refDetails = el('details', 'kit-details');
    const refInput = el('input', 'kit-input kit-input--mono', {
      maxlength: '35',
      placeholder: 'RF…',
    });
    refInput.value = fields.reference;
    refDetails.append(
      el('summary', 'kit-details__summary', { text: 'Stattdessen Zahlungsreferenz (RF…) verwenden' }),
      refInput
    );
    refInput.addEventListener('input', () => {
      fields.reference = refInput.value.toUpperCase();
      if (fields.reference) fields.purposeMode = 'reference';
      else fields.purposeMode = 'purpose';
    });

    const security = el('p', 'kit-security-line');
    security.append(icon('lock', { size: 14 }), document.createTextNode(' Link entsteht nur hier'));

    const errBox = el('p', 'kit-inline-error');
    errBox.hidden = true;

    const goReady = PrimaryAction('Link erstellen', {
      onClick: () => {
        syncProfile();
        fields.name = loadProfile()?.name || fields.name;
        fields.iban = loadProfile()?.iban || fields.iban;
        const err = generateLink();
        if (err) {
          errBox.textContent = err;
          errBox.hidden = false;
          return;
        }
        errBox.hidden = true;
        setStep('ready');
      },
    });
    content.append(amountWrap, chips, errBox, goReady, purposeInput, refDetails, security);

    return MobileScreen({
      titleId,
      header: undefined,
      children: StepTransition('amount', content),
      testId: 'step-amount',
    });
  };

  const renderReady = (titleId) => {
    if (!previewPayment) generateLink();
    const content = el('div', 'kit-flow-block kit-flow-block--ready');

    const summary = el('div', 'kit-ready-summary');
    const amount = el('p', 'kit-ready-summary__amount', {
      text: previewPayment?.amount ? previewPayment.amountFormatted : 'Betrag frei wählbar',
    });
    const to = el('p', 'kit-ready-summary__to', {
      text: `an ${previewPayment?.recipientName || ''}`,
    });
    const purposeText =
      previewPayment?.reference
        ? `Referenz: ${previewPayment.reference}`
        : previewPayment?.purpose
          ? previewPayment.purpose
          : '';
    summary.append(amount, to);
    if (purposeText) summary.appendChild(el('p', 'kit-ready-summary__purpose', { text: purposeText }));

    const qrCard = el('div', 'kit-qr-card');
    const qrHost = el('div', 'kit-qr-host');
    qrCard.appendChild(qrHost);
    if (previewPayment?.epcPayload) renderEpcQr(qrHost, previewPayment.epcPayload);

    content.append(summary, qrCard);

    const footer = el('div', 'kit-footer-stack');
    const wa = el('a', 'kit-primary-action kit-primary-action--link', {
      href: previewPayment ? buildWhatsAppShareUrl(currentLink, previewPayment) : '#',
      rel: 'noopener noreferrer',
      target: '_blank',
    });
    wa.textContent = 'Per WhatsApp senden';
    wa.addEventListener('click', () => tapHaptic());

    const row = el('div', 'kit-action-row');
    const copyBtn = el('button', 'kit-secondary-action', { type: 'button', text: 'Link kopieren' });
    const shareBtn = el('button', 'kit-secondary-action', { type: 'button', text: 'Teilen…' });
    copyBtn.addEventListener('click', async () => {
      await copyText(currentLink);
      flashCopied(copyBtn, 'Kopiert ✓');
    });
    shareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'SEPA-Link', url: currentLink });
        } catch {
          /* cancelled */
        }
      } else {
        await copyText(currentLink);
        flashCopied(shareBtn, 'Kopiert ✓');
      }
    });
    row.append(copyBtn, shareBtn);

    const quietRow = el('div', 'kit-quiet-row');
    const newAmount = QuietAction('Neuer Betrag', {
      onClick: () => {
        fields.amount = '';
        fields.purpose = '';
        fields.reference = '';
        setStep('amount');
      },
    });
    const preview = QuietAction('Vorschau öffnen', {
      onClick: () => {
        const token = encodePaymentToken(buildFieldsPayload());
        window.location.hash = `p=${token}`;
      },
    });
    quietRow.append(newAmount, preview);

    footer.append(wa, row, quietRow);

    const pill = el('span', 'kit-security-pill', { text: 'Ende-zu-Ende #Link' });
    pill.prepend(icon('shieldCheck', { size: 14 }));

    return MobileScreen({
      titleId,
      header: [
        BackButton(() => setStep('amount'), 'Betrag anpassen'),
        pill,
      ],
      children: StepTransition('ready', content),
      footer,
      testId: 'step-ready',
    });
  };

  const renderScreen = () => {
    const titleId = `kit-screen-title-${step}`;
    switch (step) {
      case 'privacy':
        return renderPrivacy(titleId);
      case 'iban':
        return renderIban(titleId);
      case 'amount':
        return renderAmount(titleId);
      case 'ready':
        return renderReady(titleId);
      default:
        return renderPrivacy(titleId);
    }
  };

  const render = () => {
    onStepChange?.(step);
    screenHost.replaceChildren(renderScreen());
    if (!frameRoot) {
      frameRoot = PhoneFrame(() => screenHost);
      host.appendChild(frameRoot);
    }
  };

  render();

  return {
    getStep: () => step,
    getStepsMeta: () => FLOW_STEPS,
    getStepIndex: stepIndex,
    setStep,
    destroy: () => frameRoot?.cleanup?.(),
  };
};
