import { clear } from './components.js';
import { icon } from './icons.js';
import { FLOW_STEPS, mountGeneratorFlow } from './generator-flow.js';
import { el } from './kit-primitives.js';
import { mountThemeToggle } from './theme.js';

const TRUST_BADGES = [
  { icon: 'databaseOff', title: 'Keine Datenspeicherung', subtitle: '0 Bytes am Server' },
  { icon: 'shieldCheck', title: 'DSGVO-konform', subtitle: 'Ohne Cookies & Tracking' },
  { icon: 'eyeOff', title: '#-Link bleibt privat', subtitle: 'Server sieht keine IBAN' },
  { icon: 'qrCode', title: 'EPC069-12 Norm', subtitle: 'Offizieller Banken-QR AT/DE' },
];

const AT_BANKS = [
  'George / Erste Bank & Sparkassen',
  'Raiffeisen Mein ELBA',
  'Bank Austria',
  'BAWAG / easybank',
  'Volksbank',
  'Trade Republic',
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
    a: 'Nur dieser Browser und wer den Link bekommt. Der Server sieht das #-Fragment nicht.',
  },
  {
    q: 'Wo liegen die Daten?',
    a: 'Optional lokal auf deinem Gerät. Keine Datenbank, keine Cookies.',
  },
  {
    q: 'Wie lösche ich sie?',
    a: 'Im Generator auf „Löschen“ tippen.',
  },
];

const updateRail = (rail, step) => {
  const idx = FLOW_STEPS.findIndex((s) => s.id === step);
  rail.querySelectorAll('.kit-rail__item').forEach((btn, i) => {
    const state = i < idx ? 'completed' : i === idx ? 'current' : 'upcoming';
    btn.dataset.state = state;
    if (state === 'current') btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
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
    ['#so-funktionierts', "So geht's"],
    ['#sicherheit', 'Datenschutz'],
    ['#banken', 'Banken'],
  ].forEach(([href, label]) => {
    nav.appendChild(el('a', 'sepa-topnav__link', { href, text: label }));
  });

  const themeSlot = el('div', 'sepa-topbar__theme');
  mountThemeToggle(themeSlot);

  top.append(brand, safeLabels, nav, themeSlot);
  page.appendChild(top);

  const hero = el('section', 'sepa-hero');
  const errorText = typeof state?.error === 'string' ? state.error.trim() : '';
  if (errorText) {
    hero.appendChild(el('p', 'kit-inline-error', { role: 'alert', text: errorText }));
  }

  const heroKit = el('div', 'sepa-hero-kit');
  const left = el('div', 'sepa-hero-desktop__copy');

  const heroHead = el('div', 'sepa-hero-head');
  const h1 = el('h1', 'sepa-hero-title', {
    text: 'Überweisungslink per WhatsApp. Vorausgefüllt für Banken in AT und DE.',
  });
  const mobileHero = el('div', 'sepa-hero-mobile');
  const mobilePills = el('div', 'sepa-hero-mobile__pills');
  ['100 % lokal', '0 €', 'AT & DE Banken'].forEach((label) => {
    mobilePills.appendChild(el('span', 'sepa-hero-mobile__pill', { text: label }));
  });
  mobileHero.appendChild(mobilePills);
  heroHead.append(h1, mobileHero);

  const eyebrow = el('p', 'sepa-hero-eyebrow', { text: '100 % LOKAL IM BROWSER · KEINE DATENBANK' });
  const lead = el('p', 'sepa-hero-lead', {
    text: 'IBAN einmal lokal speichern, Betrag tippen, Link schicken. George, ELBA, Sparkasse. Nichts geht an den Server.',
  });
  left.append(heroHead, eyebrow, lead);

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
  hero.appendChild(heroKit);
  page.appendChild(hero);

  const so = el('section', 'sepa-section');
  so.id = 'so-funktionierts';
  so.appendChild(el('h2', 'sepa-section__title', { text: "So geht's" }));
  const steps = el('ol', 'sepa-step-list');
  [
    'IBAN einmal eintragen',
    'Betrag tippen & Link per WhatsApp schicken',
    'Empfänger schickt den QR-Code einfach an „George“ oder seine Bank-App – alles vorausgefüllt',
  ].forEach((t) => {
    steps.appendChild(el('li', '', { text: t }));
  });
  so.appendChild(steps);

  const sicher = el('section', 'sepa-section sepa-section--security');
  sicher.id = 'sicherheit';
  sicher.appendChild(el('h2', 'sepa-section__title', { text: 'Datenschutz' }));
  const points = el('ul', 'sepa-step-list');
  ['Keine Speicherung am Server', 'Keine Cookies, kein Tracking', 'Löschen mit einem Tipp'].forEach((t) => {
    points.appendChild(el('li', '', { text: t }));
  });
  sicher.appendChild(points);
  const why = el('details', 'sepa-fold-details');
  why.append(
    el('summary', 'sepa-faq-item__q', { text: 'Warum der Server nichts sieht' }),
    el('p', 'sepa-faq-item__a', {
      text: 'Die Zahlungsdaten stecken hinter # im Link. Diesen Teil sendet der Browser nicht an den Server.',
    })
  );
  sicher.appendChild(why);
  page.append(so, sicher);

  const banken = el('section', 'sepa-section');
  banken.id = 'banken';
  banken.appendChild(el('h2', 'sepa-section__title', { text: 'Banken' }));
  banken.appendChild(el('p', 'sepa-section__lead', { text: `Österreich: ${AT_BANKS.join(', ')}` }));
  banken.appendChild(el('p', 'sepa-section__lead sepa-section__lead--next', { text: `Deutschland: ${DE_BANKS.join(', ')}` }));
  page.appendChild(banken);

  const faqSec = el('section', 'sepa-section sepa-section--faq');
  faqSec.appendChild(el('h2', 'sepa-section__title', { text: 'Kurz gefragt' }));
  FAQ.forEach((item) => {
    const d = el('details', 'sepa-faq-item');
    d.append(el('summary', 'sepa-faq-item__q', { text: item.q }), el('p', 'sepa-faq-item__a', { text: item.a }));
    faqSec.appendChild(d);
  });
  page.appendChild(faqSec);

  const foot = el('footer', 'sepa-landing-footer');
  const jumpNav = el('nav', 'sepa-jump-links', { 'aria-label': 'Schnellnavigation' });
  [
    ['#so-funktionierts', "So geht's"],
    ['#sicherheit', 'Datenschutz-Prinzip'],
    ['#banken', 'Banken'],
  ].forEach(([href, label]) => {
    jumpNav.appendChild(el('a', 'sepa-jump-links__link', { href, text: label }));
  });
  const legalNav = el('nav', 'sepa-legal-footer-nav', { 'aria-label': 'Rechtliches' });
  [
    ['/impressum', 'Impressum'],
    ['/datenschutz', 'Datenschutzerklärung'],
  ].forEach(([href, label]) => {
    legalNav.appendChild(el('a', 'sepa-legal-footer-nav__link', { href, text: label }));
  });
  foot.append(
    jumpNav,
    legalNav,
    el('p', '', {
      text: 'MPI GmbH · Keine Cookies · nichts am Server',
    })
  );
  page.appendChild(foot);

  root.appendChild(page);
};
