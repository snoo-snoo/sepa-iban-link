import '../scss/main.scss';
import { loadInitialState, paymentFromHash } from './domain/state.js';
import { initTheme } from './ui/theme.js';
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
    clear(app);
    if (state.mode === 'payment' && state.payment) {
      await mountPaymentView(app, state);
      return;
    }
    if (state.error) {
      const err = document.createElement('p');
      err.className = 'kit-inline-error';
      err.textContent = state.error;
      app.appendChild(err);
    }
    mountGeneratorView(app, state);
  } finally {
    mounting = false;
  }
};

mountApp();

window.addEventListener('hashchange', () => {
  const payment = paymentFromHash();
  const app = document.getElementById('app');
  if (!app) return;
  clear(app);
  if (payment) {
    mountPaymentView(app, { ...loadInitialState(), mode: 'payment', payment, error: null });
  } else {
    mountGeneratorView(app, loadInitialState());
  }
});
