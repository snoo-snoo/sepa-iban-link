import '../scss/main.scss';
import { loadInitialState } from './domain/state.js';
import { initTheme, mountThemeToggle } from './ui/theme.js';
import { mountGeneratorView } from './ui/generator-view.js';
import { mountPaymentView } from './ui/payment-view.js';
import { clear } from './ui/components.js';

initTheme();

let mounting = false;

const mountApp = async () => {
  const app = document.getElementById('app');
  if (!app || mounting) return;
  mounting = true;
  try {
    const state = loadInitialState();
    if (
      (state.mode === 'impressum' || state.mode === 'datenschutz') &&
      app.querySelector('[data-legal-page]')
    ) {
      const themeSlot = app.querySelector('[data-legal-theme-slot]');
      if (themeSlot && !themeSlot.firstChild) {
        mountThemeToggle(themeSlot);
      }
      return;
    }
    clear(app);
    if (state.mode === 'payment' && state.payment) {
      await mountPaymentView(app, state);
      return;
    }
    mountGeneratorView(app, state);
  } finally {
    mounting = false;
  }
};

mountApp();

window.addEventListener('hashchange', () => {
  mountApp();
});
