/**
 * Konfeti animasiyası — Canvas API
 * prefers-reduced-motion-a hörmət edir.
 */
const canvas = document.getElementById('confetti-canvas');
const ctx    = canvas?.getContext('2d');
let running  = false;
let raf      = null;
let particles = [];

const COLORS = ['#00B5E2','#EF3340','#509E2F','#FFD700','#FF6B6B','#74C69D'];

function rand(min, max) { return Math.random() * (max - min) + min; }

function createParticle() {
  return {
    x:   rand(0, canvas.width),
    y:   rand(-20, -5),
    r:   rand(6, 12),
    dx:  rand(-2, 2),
    dy:  rand(3, 7),
    rot: rand(0, Math.PI * 2),
    drot:rand(-0.1, 0.1),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 1,
  };
}

function resize() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

export function launchConfetti(duration = 3000) {
  if (!canvas || !ctx) return;

  // prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  resize();
  window.addEventListener('resize', resize);

  particles = Array.from({ length: 120 }, createParticle);
  running   = true;

  const end = Date.now() + duration;

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x    += p.dx;
      p.y    += p.dy;
      p.rot  += p.drot;
      p.alpha = Math.max(0, p.alpha - 0.005);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    });

    // Yeni hissəciklər əlavə et (ilk 1 saniyə)
    if (Date.now() < end - duration + 1000) {
      particles.push(createParticle());
    }

    // Görünən hissəciklər var?
    if (particles.some(p => p.alpha > 0)) {
      raf = requestAnimationFrame(frame);
    } else {
      stop();
    }
  }

  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);

  setTimeout(stop, duration + 2000);
}

function stop() {
  running = false;
  cancelAnimationFrame(raf);
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  window.removeEventListener('resize', resize);
}
