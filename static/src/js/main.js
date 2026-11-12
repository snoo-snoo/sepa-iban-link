import '../scss/main.scss';
import { loadInitialState } from './domain/state.js';
import { mountGeneratorView } from './ui/generator-view.js';
import { mountPaymentView } from './ui/payment-view.js';

const bootstrap = async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const state = loadInitialState();

  if (state.mode === 'payment' && state.payment) {
    await mountPaymentView(app, state);
    return;
  }

  if (state.error) {
    const err = document.createElement('p');
    err.className = 'sepa-alert sepa-alert--error';
    err.textContent = state.error;
    app.appendChild(err);
  }

  mountGeneratorView(app, state);
};

bootstrap();
