/**
 * Toast Bildiriş Sistemi
 */
const toastEl = document.getElementById('toast');
let toastTimer = null;

export function showToast(msg, duration = 2000) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}
