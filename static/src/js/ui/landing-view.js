import { clear } from './components.js';
import { icon } from './icons.js';
import { FLOW_STEPS, mountGeneratorFlow } from './generator-flow.js';
import {
  PrivacyFounderNote,
  ProcessTimeline,
  SharedList,
  el,
} from './kit-primitives.js';
import { mountThemeToggle } from './theme.js';

const TRUST_BADGES = [
  { icon: 'databaseOff', title: 'Keine Datenspeicherung', subtitle: '0 Bytes am Server' },
  { icon: 'shieldCheck', title: 'DSGVO Art. 25', subtitle: 'Privacy by Design' },
  { icon: 'eyeOff', title: 'RFC-9110 #-Schutz', subtitle: 'Server sieht keine IBAN' },
  { icon: 'qrCode', title: 'EPC069-12 Norm', subtitle: 'Offizieller Banken-QR AT/DE' },
];

const AT_BANKS = [
  'George / Erste Bank & Sparkassen',
  'Raiffeisen Mein ELBA',
  'Bank Austria',
  'BAWAG / easybank',
  'Volksbank',
  'bank99',
];

const DE_BANKS = [
  'App Sparkasse',
  'VR Banking',
  'ING',
  'DKB',
  'Commerzbank / comdirect',
  'Deutsche Bank / Postbank',
  'N26',
  'C24',
  'Outbank',
  'Banking4',
  'MoneyMoney',
];

const FAQ = [
  {
    q: 'Wer sieht meine IBAN?',
    a: 'Nur dein Browser und die Person, der du den Link schickst. Unser Server lädt nur die statische App – das #-Fragment mit den Zahlungsdaten verlässt deinen Browser nicht in Richtung Server.',
  },
  {
    q: 'Wo werden Kontodaten gespeichert?',
    a: 'Optional einmalig in localStorage auf deinem Gerät. Keine Datenbank, keine Cookies, kein Tracking.',
  },
  {
    q: 'Kann ich gespeicherte Daten löschen?',
    a: 'Ja – im Generator unter „Löschen“ oder durch Löschen der Website-Daten im Browser.',
  },
];

const updateRail = (rail, step) => {
  const idx = FLOW_STEPS.findIndex((s) => s.id === step);
  rail.querySelectorAll('.kit-rail__item').forEach((btn, i) => {
    const state = i < idx ? 'completed' : i === idx ? 'current' : 'upcoming';
    btn.dataset.state = state;
    btn.setAttribute('aria-current', state === 'current' ? 'step' : 'false');
    const marker = btn.querySelector('.kit-rail__marker');
    if (!marker) return;
    marker.replaceChildren();
    if (state === 'completed') marker.appendChild(icon('check', { size: 12, strokeWidth: 3 }));
    else marker.textContent = String(i + 1);
  });
};

export const mountLandingView = (root, state) => {
  clear(root);
  const page = el('div', 'sepa-landing');

  const top = el('header', 'sepa-topbar');
  const brand = el('div', 'sepa-brand');
  const mark = el('span', 'sepa-brand__mark');
  mark.append(icon('shieldCheck', { size: 20 }), icon('qrCode', { size: 16 }));
  brand.append(mark, el('span', 'sepa-brand__name', { text: 'SEPA-Link' }), el('span', 'sepa-brand__region', { text: 'AT · DE' }));

  const safeLabels = el('div', 'sepa-safe-labels');
  [
    ['shieldCheck', 'DSGVO-konform'],
    ['serverOff', '0 Bytes Server-Speicherung'],
    ['eyeOff', 'Kein Tracking · 0 Cookies'],
  ].forEach(([ic, text]) => {
    const pill = el('span', 'sepa-safe-pill');
    pill.append(icon(ic, { size: 14 }), document.createTextNode(text));
    safeLabels.appendChild(pill);
  });

  const nav = el('nav', 'sepa-topnav', { 'aria-label': 'Inhaltsnavigation' });
  [
    ['#so-funktionierts', "So funktioniert's"],
    ['#sicherheit', 'Sicherheit & DSGVO'],
    ['#banken', 'Unterstützte Banken'],
  ].forEach(([href, label]) => {
    nav.appendChild(el('a', 'sepa-topnav__link', { href, text: label }));
  });

  const themeSlot = el('div', 'sepa-topbar__theme');
  mountThemeToggle(themeSlot);

  top.append(brand, safeLabels, nav, themeSlot);
  page.appendChild(top);

  const hero = el('section', 'sepa-hero');
  const heroMobile = el('div', 'sepa-hero-mobile');
  heroMobile.appendChild(
    el('p', 'sepa-hero-mobile__title', {
      text: 'SEPA-Link für AT & DE · 100 % lokal, keine Server-Speicherung',
    })
  );
  const mobilePills = el('div', 'sepa-hero-mobile__pills');
  ['DSGVO', 'Nur lokal', '0 €'].forEach((t) => {
    mobilePills.appendChild(el('span', 'sepa-hero-mobile__pill', { text: t }));
  });
  heroMobile.appendChild(mobilePills);

  const heroKit = el('div', 'sepa-hero-kit');
  const left = el('div', 'sepa-hero-desktop__copy');
  const eyebrow = el('p', 'sepa-hero-eyebrow', { text: '100 % LOKAL IM BROWSER · KEINE DATENBANK' });
  const h1 = el('h1', 'sepa-hero-title', {
    text: 'Überweisungslink per WhatsApp senden – vorausgefüllt für Banken in AT & DE.',
  });
  const lead = el('p', 'sepa-hero-lead', {
    text: 'Einmal deine IBAN lokal auf deinem Handy speichern. Danach nur noch Betrag eintippen, Link teilen – und beim Empfänger ist in George, Mein ELBA, Sparkasse & Co. alles fertig ausgefüllt. Ohne Server-Speicherung, ohne Account, ohne Gebühren.',
  });
  left.append(eyebrow, h1, lead);

  const badgeGrid = el('div', 'sepa-trust-grid');
  TRUST_BADGES.forEach((b) => {
    const card = el('article', 'sepa-trust-badge');
    const icBox = el('span', 'sepa-trust-badge__icon');
    icBox.appendChild(icon(b.icon, { size: 18 }));
    card.append(icBox, el('p', 'sepa-trust-badge__title', { text: b.title }), el('p', 'sepa-trust-badge__sub', { text: b.subtitle }));
    badgeGrid.appendChild(card);
  });
  left.appendChild(badgeGrid);

  const rail = el('ol', 'kit-rail', { 'aria-label': 'Generator-Schritte' });
  let flowApi = null;
  FLOW_STEPS.forEach((s, i) => {
    const item = el('li', 'kit-rail__wrap');
    const btn = el('button', 'kit-rail__item', { type: 'button' });
    const marker = el('span', 'kit-rail__marker', { text: String(i + 1) });
    const text = el('span', 'kit-rail__text');
    text.append(el('span', 'kit-rail__label', { text: `${i + 1}. ${s.label}` }), el('span', 'kit-rail__detail', { text: s.detail }));
    btn.append(marker, text);
    btn.addEventListener('click', () => {
      if (!flowApi) return;
      if ((s.id === 'amount' || s.id === 'ready') && !localStorage.getItem('sepa_saved_profile')) {
        flowApi.setStep('iban');
        return;
      }
      flowApi.setStep(s.id);
    });
    item.appendChild(btn);
    rail.appendChild(item);
  });
  left.appendChild(rail);

  const flowHost = el('div', 'sepa-hero-flow');
  flowApi = mountGeneratorFlow(flowHost, state, {
    onStepChange: (step) => updateRail(rail, step),
  });
  updateRail(rail, flowApi.getStep());

  heroKit.append(left, flowHost);
  hero.append(heroMobile, heroKit);

  page.appendChild(hero);

  const sicher = el('section', 'sepa-section sepa-section--security');
  sicher.id = 'sicherheit';
  sicher.appendChild(el('h2', 'sepa-section__title', { text: 'Sicherheit & DSGVO' }));

  const matrix = SharedList({
    positive: {
      title: 'Was lokal in deinem Browser liegt (localStorage)',
      items: [
        'Empfängername & IBAN für schnelles Erstellen',
        'Bevorzugte Banking-App (optional)',
        'Jederzeit per Knopfdruck restlos löschbar',
      ],
    },
    negative: {
      title: 'Was unser Webserver niemals erhält',
      items: [
        'Keine IBANs, keine Beträge, keine Verwendungszwecke',
        'Keine Datenbank, keine Cookies, keine Tracker',
        'Keine IP-Profilbildung',
      ],
    },
  });
  sicher.appendChild(matrix);

  const fragment = el('article', 'sepa-fragment-card');
  fragment.appendChild(el('h3', 'sepa-fragment-card__title', { text: 'Warum der Server technisch blind ist' }));
  const urlLine = el('p', 'sepa-fragment-card__url');
  urlLine.appendChild(document.createTextNode('https://sepa-link.at/ '));
  urlLine.appendChild(el('span', 'sepa-fragment-card__quiet', { text: '(lädt nur die statische App)' }));
  urlLine.appendChild(document.createTextNode(' + '));
  urlLine.appendChild(el('span', 'sepa-fragment-card__hash', { text: '#p=eyJ2Ijox…' }));
  urlLine.appendChild(
    document.createTextNode(
      ' (verbleibt zu 100 % im Browser & Messenger – wird laut HTTP-Standard niemals an den Server gesendet!)'
    )
  );
  fragment.appendChild(urlLine);
  const labels = el('div', 'sepa-security-labels');
  ['Strikte Content-Security-Policy', 'Referrer-Policy: no-referrer', 'ISO 13616 & EPC069-12 Validierung', 'Selbst gehostet in der EU (kasserver.com)'].forEach(
    (t) => {
      const c = el('span', 'sepa-security-label');
      c.append(icon('checkCircle2', { size: 14 }), document.createTextNode(t));
      labels.appendChild(c);
    }
  );
  fragment.appendChild(labels);
  sicher.appendChild(fragment);

  const timelineRow = el('div', 'sepa-timeline-row');
  timelineRow.appendChild(
    ProcessTimeline([
      { title: 'Einmalig IBAN lokal hinterlegen', body: 'Nur auf deinem Gerät – kein Server-Kontakt.', icon: 'lock' },
      { title: 'Betrag tippen & per WhatsApp teilen', body: 'Link mit #-Fragment – unsichtbar für den Webserver.', icon: 'share2' },
      {
        title: 'Empfänger öffnet Zahlschein in der Banking-App',
        body: 'George, ELBA oder Sparkasse – alles vorausgefüllt.',
        icon: 'smartphone',
      },
    ])
  );
  timelineRow.appendChild(
    PrivacyFounderNote({
      title: 'Unser Datenschutz-Versprechen',
      body: 'Die sichersten Kontodaten sind die, die niemals auf einem fremden Server landen. Deshalb speichern wir nichts – und der HTTP-Standard hält dein #-Fragment ohnehin vom Server fern.',
      signatureName: 'Team SEPA-Link',
    })
  );
  const so = el('section', 'sepa-section');
  so.id = 'so-funktionierts';
  so.appendChild(el('h2', 'sepa-section__title', { text: "So funktioniert's – in 3 Sekunden" }));
  so.appendChild(
    el('p', 'sepa-section__lead', {
      text: 'IBAN einmalig lokal eintragen. Danach nur noch Betrag eingeben, Link generieren – fertig.',
    })
  );
  so.appendChild(timelineRow);
  page.append(so, sicher);

  const banken = el('section', 'sepa-section');
  banken.id = 'banken';
  banken.appendChild(el('h2', 'sepa-section__title', { text: 'Unterstützte Banken' }));
  const bankGrid = el('div', 'sepa-bank-grid');
  const atCol = el('div', 'sepa-bank-col');
  atCol.appendChild(el('h3', 'sepa-bank-col__title', { text: 'Österreich' }));
  const atUl = el('ul', 'sepa-bank-col__list');
  AT_BANKS.forEach((b) => atUl.appendChild(el('li', '', { text: b })));
  atCol.appendChild(atUl);
  const deCol = el('div', 'sepa-bank-col');
  deCol.appendChild(el('h3', 'sepa-bank-col__title', { text: 'Deutschland' }));
  const deUl = el('ul', 'sepa-bank-col__list');
  DE_BANKS.forEach((b) => deUl.appendChild(el('li', '', { text: b })));
  deCol.appendChild(deUl);
  bankGrid.append(atCol, deCol);
  banken.appendChild(bankGrid);
  page.appendChild(banken);

  const faqSec = el('section', 'sepa-section sepa-section--faq');
  faqSec.appendChild(el('h2', 'sepa-section__title', { text: 'FAQ Sicherheit & DSGVO' }));
  FAQ.forEach((item) => {
    const d = el('details', 'sepa-faq-item');
    d.append(el('summary', 'sepa-faq-item__q', { text: item.q }), el('p', 'sepa-faq-item__a', { text: item.a }));
    faqSec.appendChild(d);
  });
  page.appendChild(faqSec);

  const foot = el('footer', 'sepa-landing-footer');
  foot.appendChild(
    el('p', '', {
      text: 'Keine Cookies · Keine Server-Speicherung · Lokale Daten jederzeit löschbar',
    })
  );
  page.appendChild(foot);

  root.appendChild(page);
};
