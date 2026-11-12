import QRCode from 'qrcode';

export const el = (tag, className, attrs = {}) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  return node;
};

export const clear = (parent) => {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
};

/** Mount or refresh EPC QR in a container (canvas). */
export const renderEpcQr = async (container, epcPayload) => {
  clear(container);
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  await QRCode.toCanvas(canvas, epcPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: Math.min(280, container.clientWidth || 280),
    color: { dark: '#000000', light: '#ffffff' },
  });
};

import { copyText } from '../services/share-service.js';

export const bindCopyRow = (button, getText, onCopied) => {
  button.addEventListener('click', async () => {
    await copyText(getText());
    onCopied?.(button);
  });
};

export const flashCopied = (btn, label = 'Kopiert ✓') => {
  const valNode = btn.querySelector?.('.sepa-copy-row__value');
  if (valNode) {
    const prev = valNode.textContent;
    valNode.textContent = label;
    btn.classList.add('sepa-btn--copied');
    window.setTimeout(() => {
      valNode.textContent = prev;
      btn.classList.remove('sepa-btn--copied');
    }, 2000);
    return;
  }
  const prev = btn.textContent;
  btn.textContent = label;
  btn.classList.add('sepa-btn--copied');
  window.setTimeout(() => {
    btn.textContent = prev;
    btn.classList.remove('sepa-btn--copied');
  }, 2000);
};

export const isDesktopNonTouch = () =>
  window.matchMedia('(min-width: 900px)').matches && !window.matchMedia('(pointer: coarse)').matches;
