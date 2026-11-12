/**
 * Vibrasiya (Haptics) Modulu
 * Web Vibration API (navigator.vibrate) istifadə edir.
 * Dəstəkləməyən brauzerlər (Safari desktop, iOS) üçün səssiz fail edir.
 */

let enabled = true;

function vibrate(pattern) {
  if (!enabled) return;
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

export const haptics = {
  key()     { vibrate(10); },
  invalid() { vibrate([40, 20, 40]); },
  win()     { vibrate([80, 30, 80, 30, 120]); },
  lose()    { vibrate([100, 50, 100]); },
  hint()    { vibrate(30); },
  coin()    { vibrate([20, 10, 30]); },
};

export function setHapticsEnabled(val) {
  enabled = val;
}
