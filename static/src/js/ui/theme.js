import { icon } from './icons.js';

const STORAGE_KEY = 'sepa_theme';

const THEME_COLOR_LIGHT = '#fafafa';
const THEME_COLOR_DARK = '#09090b';

const resolveEffectiveTheme = () => {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
};

const syncThemeColorMeta = () => {
  const color = resolveEffectiveTheme() === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  const metas = document.querySelectorAll?.('meta[name="theme-color"]');
  if (!metas?.length) return;
  metas.forEach((meta) => {
    if (!meta.hasAttribute('media')) {
      meta.setAttribute('content', color);
    }
  });
};

export const getStoredTheme = () => {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark') return v;
  return null;
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  } else {
    root.removeAttribute('data-theme');
    localStorage.removeItem(STORAGE_KEY);
  }
  syncThemeColorMeta();
};

export const initTheme = () => {
  const stored = getStoredTheme();
  if (stored) applyTheme(stored);
  else syncThemeColorMeta();
};

export const toggleTheme = () => {
  const current =
    document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
};

export const mountThemeToggle = (host, { compact = false } = {}) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `kit-theme-toggle${compact ? ' kit-theme-toggle--compact' : ''}`;
  const setIcon = () => {
    const dark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    btn.replaceChildren(icon(dark ? 'sun' : 'moon', { size: 18 }));
    btn.setAttribute('aria-label', dark ? 'Helles Design' : 'Dunkles Design');
  };
  setIcon();
  btn.addEventListener('click', () => {
    toggleTheme();
    setIcon();
  });
  host.appendChild(btn);
  return btn;
};
