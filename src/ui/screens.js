/**
 * Ekran (Modal) İdarəetməsi
 */

const screens = {
  menu:         document.getElementById('screen-menu'),
  'mode-select':document.getElementById('screen-mode-select'),
  result:       document.getElementById('screen-result'),
  stats:        document.getElementById('screen-stats'),
  rules:        document.getElementById('screen-rules'),
  settings:     document.getElementById('screen-settings'),
  about:        document.getElementById('screen-about'),
  hintConfirm:  document.getElementById('screen-hint-confirm'),
};

let _backStack = [];

export function openScreen(name) {
  const el = screens[name];
  if (!el) return;
  el.removeAttribute('hidden');
  _backStack.push(name);
  el.focus?.();
}

export function closeScreen(name) {
  const el = screens[name];
  if (!el) return;
  el.setAttribute('hidden', '');
  _backStack = _backStack.filter(s => s !== name);
}

export function closeTopScreen() {
  const top = _backStack.at(-1);
  if (top) closeScreen(top);
}

export function isScreenOpen(name) {
  return !screens[name]?.hasAttribute('hidden');
}

export function anyScreenOpen() {
  return _backStack.length > 0;
}

/** ESC / Android Back düyməsi ilə bağla */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeTopScreen();
});

/** Overlay arxa planına klik ilə bağla */
Object.entries(screens).forEach(([name, el]) => {
  if (!el) return;
  el.addEventListener('click', e => {
    if (e.target === el) closeScreen(name);
  });
});

// Bağla düymələri
[
  ['close-stats',    'stats'],
  ['close-rules',    'rules'],
  ['close-settings', 'settings'],
  ['close-about',    'about'],
].forEach(([id, name]) => {
  document.getElementById(id)?.addEventListener('click', () => closeScreen(name));
});
