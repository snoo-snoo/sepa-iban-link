import { icon } from './icons.js';

export const tapHaptic = () => {
  navigator.vibrate?.(8);
};

export const el = (tag, className, attrs = {}) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  });
  return node;
};

export const PrimaryAction = (label, { disabled, onClick, type = 'button', className = '' } = {}) => {
  const btn = el('button', `kit-primary-action${className ? ` ${className}` : ''}`, {
    type,
    disabled: disabled || undefined,
  });
  btn.textContent = label;
  btn.addEventListener('click', (e) => {
    if (btn.disabled) return;
    tapHaptic();
    onClick?.(e);
  });
  return btn;
};

export const QuietAction = (label, { disabled, onClick, type = 'button', className = '' } = {}) => {
  const btn = el('button', `kit-quiet-action${className ? ` ${className}` : ''}`, { type, disabled: disabled || undefined });
  btn.textContent = label;
  btn.addEventListener('click', (e) => {
    if (btn.disabled) return;
    onClick?.(e);
  });
  return btn;
};

export const BackButton = (onClick, label = 'Zurück') => {
  const btn = el('button', 'kit-back-btn', { type: 'button', 'aria-label': label });
  btn.appendChild(icon('chevronLeft', { size: 20 }));
  btn.addEventListener('click', onClick);
  return btn;
};

export const ProgressBar = ({ value = 0, label = '' } = {}) => {
  const wrap = el('div', 'kit-progress');
  wrap.setAttribute('role', 'progressbar');
  wrap.setAttribute('aria-valuemin', '0');
  wrap.setAttribute('aria-valuemax', '100');
  wrap.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  if (label) wrap.setAttribute('aria-label', label);
  const track = el('div', 'kit-progress__track');
  const fill = el('div', 'kit-progress__fill');
  fill.style.width = `${Math.min(100, Math.max(0, value * 100))}%`;
  track.appendChild(fill);
  wrap.appendChild(track);
  if (label) {
    const lbl = el('span', 'kit-progress__label', { text: label });
    wrap.appendChild(lbl);
  }
  return wrap;
};

const isDeviceFrame = () => window.matchMedia('(min-width: 768px)').matches;

export const PhoneFrame = (childFactory) => {
  const root = el('div', 'kit-phone');
  const render = () => {
    const device = isDeviceFrame();
    root.dataset.frame = device ? 'device' : 'full';
    root.replaceChildren();
    if (!device) {
      const inner = el('div', 'kit-phone__screen kit-phone__screen--native');
      inner.appendChild(childFactory());
      root.appendChild(inner);
      return;
    }
    const bezel = el('div', 'kit-phone__bezel');
    const status = el('div', 'kit-phone__status', { 'aria-hidden': 'true' });
    status.appendChild(el('span', 'kit-phone__time', { text: '9:41' }));
    const island = el('span', 'kit-phone__island');
    status.appendChild(island);
    const iconsRow = el('span', 'kit-phone__status-icons');
    iconsRow.append(icon('signal', { size: 16 }), icon('wifi', { size: 16 }), icon('batteryFull', { size: 18, strokeWidth: 1.8 }));
    status.appendChild(iconsRow);
    const screen = el('div', 'kit-phone__screen');
    screen.appendChild(childFactory());
    const home = el('div', 'kit-phone__home', { 'aria-hidden': 'true' });
    home.appendChild(el('span', 'kit-phone__home-bar'));
    bezel.append(status, screen, home);
    root.appendChild(bezel);
  };
  render();
  const onResize = () => render();
  window.addEventListener('resize', onResize);
  root.cleanup = () => window.removeEventListener('resize', onResize);
  return root;
};

export const MobileScreen = ({
  titleId,
  header,
  footer,
  children,
  testId,
  className = '',
}) => {
  const section = el('section', `kit-mobile-screen ${className}`.trim());
  section.setAttribute('aria-labelledby', titleId);
  if (testId) section.dataset.testid = testId;
  if (header) {
    const h = el('div', 'kit-mobile-screen__header');
    header.forEach((n) => h.appendChild(n));
    section.appendChild(h);
  }
  const body = el('div', 'kit-mobile-screen__body');
  if (Array.isArray(children)) children.forEach((n) => body.appendChild(n));
  else if (children) body.appendChild(children);
  section.appendChild(body);
  if (footer) {
    const f = el('div', 'kit-mobile-screen__footer');
    if (Array.isArray(footer)) footer.forEach((n) => f.appendChild(n));
    else f.appendChild(footer);
    section.appendChild(f);
  }
  return section;
};

export const StepTransition = (stepKey, content) => {
  const wrap = el('div', 'kit-step-transition');
  wrap.dataset.step = stepKey;
  wrap.appendChild(content);
  return wrap;
};

export const OptionCard = ({
  id,
  title,
  subtitle,
  iconName,
  selected,
  name,
  onSelect,
}) => {
  const card = el('button', `kit-option-card${selected ? ' kit-option-card--selected' : ''}`, {
    type: 'button',
    role: 'radio',
    'aria-checked': selected ? 'true' : 'false',
    'data-value': id,
  });
  if (name) card.dataset.name = name;
  const iconBox = el('span', 'kit-option-card__icon');
  if (iconName) iconBox.appendChild(icon(iconName, { size: 20 }));
  const text = el('span', 'kit-option-card__text');
  text.appendChild(el('span', 'kit-option-card__title', { text: title }));
  if (subtitle) text.appendChild(el('span', 'kit-option-card__subtitle', { text: subtitle }));
  const marker = el('span', 'kit-option-card__marker');
  if (selected) marker.appendChild(icon('check', { size: 14, strokeWidth: 3 }));
  card.append(iconBox, text, marker);
  card.addEventListener('click', () => onSelect?.(id));
  return card;
};

export const mountOptionRadiogroup = (host, options, selected, onChange) => {
  host.setAttribute('role', 'radiogroup');
  const render = () => {
    host.replaceChildren();
    options.forEach((opt) => {
      host.appendChild(
        OptionCard({
          ...opt,
          selected: selected === opt.id,
          onSelect: (id) => {
            onChange(id);
            render();
          },
        })
      );
    });
  };
  host.addEventListener('keydown', (e) => {
    const ids = options.map((o) => o.id);
    const idx = ids.indexOf(selected);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(ids[(idx + 1) % ids.length]);
      render();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(ids[(idx - 1 + ids.length) % ids.length]);
      render();
    }
  });
  render();
  return render;
};

export const SharedList = ({ positive, negative }) => {
  const root = el('div', 'kit-shared-list');
  root.appendChild(SharedColumn(positive.title, positive.items, true));
  root.appendChild(SharedColumn(negative.title, negative.items, false));
  return root;
};

export const SharedColumn = (title, items, positive) => {
  const col = el('div', 'kit-shared-column');
  col.appendChild(el('h3', 'kit-shared-column__title', { text: title }));
  const ul = el('ul', 'kit-shared-column__list');
  items.forEach((item) => {
    const li = el('li', 'kit-shared-column__item');
    const badge = el('span', `kit-shared-column__badge${positive ? ' kit-shared-column__badge--positive' : ''}`);
    badge.appendChild(icon(positive ? 'check' : 'minus', { size: 12, strokeWidth: 3 }));
    li.append(badge, document.createTextNode(item));
    ul.appendChild(li);
  });
  col.appendChild(ul);
  return col;
};

export const ChecklistRow = (label, state, detail = '') => {
  const row = el('div', `kit-checklist-row kit-checklist-row--${state}`);
  const mark = el('span', 'kit-checklist-row__mark');
  if (state === 'done') mark.appendChild(icon('check', { size: 12, strokeWidth: 3 }));
  const text = el('span', 'kit-checklist-row__text');
  text.appendChild(document.createTextNode(label));
  if (detail) text.appendChild(el('span', 'kit-checklist-row__detail', { text: detail }));
  row.append(mark, text);
  return row;
};

export const ProcessTimeline = (steps) => {
  const ol = el('ol', 'kit-process-timeline');
  steps.forEach((step, i) => {
    const li = el('li', 'kit-process-timeline__item');
    const badge = el('span', 'kit-process-timeline__badge');
    if (step.icon) badge.appendChild(icon(step.icon, { size: 16 }));
    else badge.textContent = String(i + 1);
    const body = el('div', 'kit-process-timeline__body');
    body.appendChild(el('p', 'kit-process-timeline__title', { text: step.title }));
    if (step.body) body.appendChild(el('p', 'kit-process-timeline__text', { text: step.body }));
    li.append(badge, body);
    ol.appendChild(li);
  });
  return ol;
};

export const PrivacyFounderNote = ({ title, body, signatureName }) => {
  const card = el('article', 'kit-founder-note');
  card.appendChild(el('p', 'kit-founder-note__eyebrow', { text: 'TRANSPARENZ' }));
  if (title) card.appendChild(el('h3', 'kit-founder-note__title', { text: title }));
  card.appendChild(el('p', 'kit-founder-note__body', { text: body }));
  const sigWrap = el('div', 'kit-founder-note__signature');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 220 48');
  svg.setAttribute('class', 'kit-founder-note__signature-svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M8 32c18-28 36-28 54 0s36 28 54 0 36-28 54 0 36 28 36 28'
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  svg.appendChild(path);
  sigWrap.appendChild(svg);
  sigWrap.appendChild(el('p', 'kit-founder-note__name', { text: signatureName }));
  card.appendChild(sigWrap);
  return card;
};
