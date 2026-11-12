const PATHS = {
  shieldCheck:
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12l2 2 4-4',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4 M5 11h14v11H5z',
  eyeOff: 'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49 M14.084 14.158a3 3 0 0 1-4.242-4.242 M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143 M2 2l20 20',
  databaseOff: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414L8 18.414V5a2 2 0 0 1 2-2h.586z M22 13.586V4a2 2 0 0 0-2-2h-7.172a2 2 0 0 0-1.414.586L2.586 13.414A2 2 0 0 0 2 14.828V20a2 2 0 0 0 2 2h7.172a2 2 0 0 0 1.414-.586L22 13.586z M22 22l-5-5',
  serverOff: 'M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2 M6 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2 M6 6h.01 M6 18h.01 M2 2l20 20',
  check: 'M20 6 9 17l-5-5',
  minus: 'M5 12h14',
  chevronLeft: 'm15 18-6-6 6-6',
  sparkles: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z',
  smartphone: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01',
  qrCode:
    'M4 4h4v4H4z M16 4h4v4h-4z M4 16h4v4H4z M8 4v4 M16 12v4 M12 8h4 M12 16h4 M12 12h4v4',
  share2: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13',
  copy: 'M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.242a2 2 0 0 0-.602-1.43L16.398 2.602A2 2 0 0 0 15.172 2H10a2 2 0 0 0-2 2z M16 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2',
  trash2:
    'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  edit3: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  sun: 'M12 3v2 M12 19v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M3 12h2 M19 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  moon: 'M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9z',
  rotateCcw: 'M3 2v6h6 M21 12A9 9 0 0 0 6 5.3L3 8 M21 22v-6h-6 M3 12a9 9 0 0 0 15 6.7l3-2.7',
  building2:
    'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4',
  fileText:
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M10 13H8 M16 13h-2 M10 17H8 M16 17h-2',
  externalLink: 'M15 3h6v6 M10 14 21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  checkCircle2: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3',
  signal: 'M2 20h.01 M7 20v-4 M12 20v-8 M17 20V8 M22 4v16',
  wifi: 'M5 12.55a11 11 0 0 1 14.08 0 M8.53 16.11a6 11 0 0 1 6.95 0 M12 20h.01',
  batteryFull: 'M4 10v4 M22 10v4 M6 6h12v12H6z',
};

export const icon = (name, { size = 20, className = '', strokeWidth = 2 } = {}) => {
  const d = PATHS[name];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
};
