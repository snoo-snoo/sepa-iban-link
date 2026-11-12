import { encodeViaApi } from '../domain/state.js';
import { formatIban, lookupRecipientBank, normalizeIban, validateIban } from '../domain/iban.js';
import {
  buildEpcPayload,
  encodePaymentToken,
  parseEurAmount,
  validateRfReference,
} from '../domain/epc.js';
import { buildWhatsAppShareUrl, copyText } from '../services/share-service.js';
import { clear, el, flashCopied, renderEpcQr } from './components.js';
import { enrichPaymentForPreview } from './payment-preview.js';

const PROFILE_KEY = 'sepa_saved_profile';

const loadProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
  } catch {
    return null;
  }
};

const saveProfile = (data) => localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
const clearProfile = () => localStorage.removeItem(PROFILE_KEY);

export const mountGeneratorView = (root, state) => {
  clear(root);
  const layout = el('div', 'sepa-layout sepa-layout--generator');
  const formCol = el('section', 'sepa-card sepa-card--form');
  const resultCol = el('section', 'sepa-card sepa-card--result');

  layout.append(formCol, resultCol);
  root.appendChild(layout);

  const fields = {
    name: '',
    iban: '',
    bic: '',
    amount: '',
    purpose: '',
    reference: '',
    purposeMode: 'purpose',
    linkMode: 'standard',
    remember: Boolean(loadProfile()),
  };

  const profile = loadProfile();
  if (profile) {
    fields.name = profile.name || '';
    fields.iban = profile.iban || '';
  }

  const bankHint = el('p', 'sepa-field__hint', { text: '' });
  const ibanBadge = el('span', 'sepa-badge', { text: '' });
  const errorBox = el('div', 'sepa-alert sepa-alert--error', { text: '' });
  errorBox.hidden = true;

  const qrBox = el('div', 'sepa-qr sepa-qr--live');
  const linkPreview = el('p', 'sepa-link-preview', { text: '' });

  const renderForm = () => {
    clear(formCol);
    formCol.appendChild(el('h1', 'sepa-card__title', { text: 'SEPA-Überweisungslink erstellen' }));

    const nameInput = el('input', 'sepa-input', {
      type: 'text',
      maxlength: '70',
      placeholder: 'Empfängername',
      value: fields.name,
    });
    const ibanInput = el('input', 'sepa-input sepa-input--iban', {
      type: 'text',
      inputmode: 'text',
      autocomplete: 'off',
      placeholder: 'IBAN',
      value: formatIban(fields.iban),
    });
    const amountInput = el('input', 'sepa-input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'z. B. 25,50 – leer lassen für freien Betrag',
      value: fields.amount,
    });

    const togglePurpose = el('div', 'sepa-toggle');
    const btnPurpose = el('button', `sepa-toggle__btn${fields.purposeMode === 'purpose' ? ' sepa-toggle__btn--active' : ''}`, {
      type: 'button',
      text: 'Verwendungszweck',
    });
    const btnRef = el('button', `sepa-toggle__btn${fields.purposeMode === 'reference' ? ' sepa-toggle__btn--active' : ''}`, {
      type: 'button',
      text: 'Zahlungsreferenz',
    });
    togglePurpose.append(btnPurpose, btnRef);

    const purposeInput = el('textarea', 'sepa-input sepa-input--area', {
      maxlength: '140',
      rows: '3',
      placeholder: 'Freitext bis 140 Zeichen',
    });
    purposeInput.value = fields.purpose;
    const refInput = el('input', 'sepa-input', {
      maxlength: '35',
      placeholder: 'z. B. RF…',
    });
    refInput.value = fields.reference;
    purposeInput.hidden = fields.purposeMode !== 'purpose';
    refInput.hidden = fields.purposeMode !== 'reference';

    const bicDetails = el('details', 'sepa-details');
    const bicInput = el('input', 'sepa-input', { placeholder: 'BIC (optional)', value: fields.bic });
    bicDetails.append(
      el('summary', 'sepa-details__summary', {
        text: 'BIC (optional – in EU/EWR meist automatisch via EPC 002)',
      }),
      bicInput
    );

    const rememberLabel = el('label', 'sepa-check');
    const rememberCb = el('input', 'sepa-check__input', { type: 'checkbox' });
    rememberCb.checked = fields.remember;
    rememberLabel.append(rememberCb, document.createTextNode(' Meine Kontodaten lokal auf diesem Gerät merken'));

    const deleteProfile = el('button', 'sepa-link', { type: 'button', text: 'Gespeicherte Daten löschen' });
    deleteProfile.hidden = !loadProfile();

    const linkModeField = el('fieldset', 'sepa-fieldset');
    const modeStandard = el('input', '', { type: 'radio', name: 'linkMode', value: 'standard' });
    const modePrivate = el('input', '', { type: 'radio', name: 'linkMode', value: 'private' });
    modeStandard.checked = fields.linkMode === 'standard';
    modePrivate.checked = fields.linkMode === 'private';
    const lab1 = el('label', 'sepa-radio');
    lab1.append(
      modeStandard,
      document.createTextNode(' Standard-Link (/p/…) – Empfohlen für WhatsApp')
    );
    const lab2 = el('label', 'sepa-radio');
    lab2.append(
      modePrivate,
      document.createTextNode(' Privat-Link (/#p=…) – 100 % im Browser')
    );
    linkModeField.append(el('legend', 'sepa-fieldset__legend', { text: 'Link-Modus' }), lab1, lab2);

    const sampleRow = el('div', 'sepa-sample');
    const sampleAt = el('button', 'sepa-btn sepa-btn--ghost', { type: 'button', text: 'Beispiel AT' });
    const sampleDe = el('button', 'sepa-btn sepa-btn--ghost', { type: 'button', text: 'Beispiel DE' });
    sampleRow.append(sampleAt, sampleDe);

    formCol.append(
      el('label', 'sepa-field', { text: 'Empfängername' }),
      nameInput,
      el('label', 'sepa-field', { text: 'IBAN' }),
      ibanInput,
      ibanBadge,
      bankHint,
      el('label', 'sepa-field', { text: 'Betrag in EUR (optional)' }),
      amountInput,
      togglePurpose,
      purposeInput,
      refInput,
      bicDetails,
      rememberLabel,
      deleteProfile,
      linkModeField,
      sampleRow,
      errorBox
    );

    const bindVal = (input, key, formatter) => {
      input.addEventListener('input', () => {
        fields[key] = formatter ? formatter(input.value) : input.value;
        if (key === 'iban') input.value = formatIban(fields.iban);
        updateValidation();
        refreshOutput();
      });
    };

    bindVal(nameInput, 'name');
    bindVal(ibanInput, 'iban', normalizeIban);
    bindVal(amountInput, 'amount');
    bindVal(bicInput, 'bic', (v) => v.toUpperCase().replace(/\s/g, ''));
    bindVal(purposeInput, 'purpose');
    bindVal(refInput, 'reference', (v) => v.toUpperCase());

    btnPurpose.addEventListener('click', () => {
      fields.purposeMode = 'purpose';
      fields.reference = '';
      renderForm();
      refreshOutput();
    });
    btnRef.addEventListener('click', () => {
      fields.purposeMode = 'reference';
      fields.purpose = '';
      renderForm();
      refreshOutput();
    });

    rememberCb.addEventListener('change', () => {
      fields.remember = rememberCb.checked;
      if (fields.remember) saveProfile({ name: fields.name, iban: fields.iban });
    });

    deleteProfile.addEventListener('click', () => {
      clearProfile();
      deleteProfile.hidden = true;
    });

    modeStandard.addEventListener('change', () => {
      fields.linkMode = 'standard';
      refreshOutput();
    });
    modePrivate.addEventListener('change', () => {
      fields.linkMode = 'private';
      refreshOutput();
    });

    sampleAt.addEventListener('click', () => {
      fields.name = 'Max Mustermann';
      fields.iban = 'AT483200000012345864';
      fields.amount = '25.50';
      fields.purposeMode = 'purpose';
      fields.purpose = 'Abendessen Pizzeria';
      fields.reference = '';
      renderForm();
      refreshOutput();
    });
    sampleDe.addEventListener('click', () => {
      fields.name = 'Erika Musterfrau';
      fields.iban = 'DE89370400440532013000';
      fields.amount = '42,00';
      fields.purposeMode = 'purpose';
      fields.purpose = 'Miete März';
      fields.reference = '';
      renderForm();
      refreshOutput();
    });
  };

  const updateValidation = () => {
    const v = validateIban(fields.iban);
    ibanBadge.textContent = v.valid ? 'IBAN gültig' : 'IBAN prüfen';
    ibanBadge.className = `sepa-badge${v.valid ? ' sepa-badge--ok' : ' sepa-badge--warn'}`;
    const bank = v.valid ? lookupRecipientBank(fields.iban) : null;
    bankHint.textContent = bank
      ? `${bank.country} · ${bank.bankName}`
      : '';
  };

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

  const validateForm = () => {
    const f = buildFieldsPayload();
    if (!f.name) return 'Bitte Empfängername angeben.';
    const v = validateIban(f.iban);
    if (!v.valid) return 'Bitte eine gültige IBAN eingeben.';
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

  let currentLink = '';
  let previewPayment = null;

  const refreshOutput = async () => {
    errorBox.hidden = true;
    const err = validateForm();
    if (err) {
      errorBox.textContent = err;
      errorBox.hidden = false;
      linkPreview.textContent = '';
      clear(qrBox);
      return;
    }

    if (fields.remember) saveProfile({ name: fields.name, iban: normalizeIban(fields.iban) });

    const f = buildFieldsPayload();
    let token = encodePaymentToken(f);
    let signed = false;

    if (fields.linkMode === 'standard' && state.hmacEnabled) {
      try {
        const res = await encodeViaApi(state.baseUrl, f);
        if (res?.token) {
          token = res.token;
          signed = true;
        }
      } catch {
        /* client-side fallback */
      }
    }

    const base = state.baseUrl.replace(/\/$/, '');
    currentLink =
      fields.linkMode === 'private' ? `${base}/#p=${token}` : `${base}/p/${token}`;
    linkPreview.textContent = currentLink;

    previewPayment = enrichPaymentForPreview({
      recipientName: f.name,
      iban: f.iban,
      bic: f.bic,
      amount: f.amount,
      purpose: f.purpose,
      reference: f.reference,
      verified: signed,
    });

    if (previewPayment?.epcPayload) await renderEpcQr(qrBox, previewPayment.epcPayload);
    renderActions();
  };

  const renderActions = () => {
    const existing = resultCol.querySelector('.sepa-actions');
    if (existing) existing.remove();

    const actions = el('div', 'sepa-actions');
    const wa = el('a', 'sepa-btn sepa-btn--primary', {
      href: previewPayment ? buildWhatsAppShareUrl(currentLink, previewPayment) : '#',
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'Per WhatsApp senden',
    });
    const shareBtn = el('button', 'sepa-btn sepa-btn--secondary', { type: 'button', text: 'Link teilen…' });
    const copyBtn = el('button', 'sepa-btn sepa-btn--secondary', { type: 'button', text: 'Link kopieren' });
    const testBtn = el('a', 'sepa-btn sepa-btn--ghost', {
      href: currentLink,
      text: 'Zahlungsseite testen',
    });

    shareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'SEPA-Link', url: currentLink });
        } catch {
          /* user cancelled */
        }
      } else {
        await copyText(currentLink);
        flashCopied(shareBtn);
      }
    });
    copyBtn.addEventListener('click', async () => {
      await copyText(currentLink);
      flashCopied(copyBtn);
    });

    actions.append(wa, shareBtn, copyBtn, testBtn);
    resultCol.appendChild(actions);
  };

  const renderResult = () => {
    clear(resultCol);
    resultCol.append(
      el('h2', 'sepa-card__title', { text: 'Live-Ergebnis & Teilen' }),
      qrBox,
      el('label', 'sepa-field', { text: 'Ihr Link' }),
      linkPreview
    );
  };

  renderForm();
  renderResult();
  updateValidation();
  refreshOutput();
};
