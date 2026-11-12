/**
 * Səs Effektləri Modulu
 * Web Audio API ilə proqramatik olaraq yaradılır — xarici fayl lazım deyil.
 * İstəsəniz MP3 fayllar da əlavə edə bilərsiniz (public/audio/).
 */

let ctx = null;
let enabled = true;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

function beep({ freq = 440, type = 'sine', duration = 0.1, gain = 0.3, delay = 0 } = {}) {
  if (!enabled) return;
  try {
    const ac  = getCtx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g);
    g.connect(ac.destination);
    osc.type      = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.05);
  } catch {}
}

export const sounds = {
  key()    { beep({ freq: 500, duration: 0.05, gain: 0.15 }); },
  delete() { beep({ freq: 300, duration: 0.05, gain: 0.1  }); },
  submit() { beep({ freq: 600, duration: 0.08, gain: 0.2  }); },
  invalid(){ beep({ freq: 200, type: 'sawtooth', duration: 0.15, gain: 0.2 }); },
  correct(){ beep({ freq: 800, duration: 0.07, gain: 0.2 }); },
  absent() { beep({ freq: 350, duration: 0.07, gain: 0.1 }); },
  present(){ beep({ freq: 550, duration: 0.07, gain: 0.15 }); },
  win() {
    // Qalibiyyət fanfar
    [0, .12, .24, .36].forEach((d, i) => {
      beep({ freq: [523, 659, 784, 1047][i], duration: .15, gain: .25, delay: d });
    });
  },
  lose() {
    beep({ freq: 220, type: 'sawtooth', duration: .4, gain: .2 });
  },
  coin() {
    beep({ freq: 1200, duration: .06, gain: .15 });
    beep({ freq: 1500, duration: .06, gain: .12, delay: .07 });
  },
  hint() {
    beep({ freq: 700, duration: .08, gain: .2 });
  },
};

export function setSoundEnabled(val) {
  enabled = val;
}

/** AudioContext istifadəçi jestindən sonra başlamalıdır */
export function resumeAudio() {
  try { getCtx().resume(); } catch {}
}
