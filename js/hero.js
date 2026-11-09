// =========================================================
// HERO — film sterowany scrollem (sekwencja klatek na <canvas>)
// Klatki generuje tools/extract-frames.sh -> assets/hero/
// Bez klatek uruchamia się fallback ze zdjęciem kubka.
// =========================================================
const gsap = window.gsap;

export async function initHero(reduced) {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const canvas = hero.querySelector('.hero__canvas');
  const progressEl = hero.querySelector('.hero__progress');
  const loader = hero.querySelector('.hero__loader');

  let manifest = null;
  try {
    const r = await fetch('assets/hero/frames.json', { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch {}

  const state = { p: 0 };
  const setProgress = (p) => { if (progressEl) progressEl.textContent = String(Math.round(p * 100)).padStart(3, '0') + ' / 100'; };

  if (manifest && manifest.count > 0) {
    initSequence(canvas, manifest, state, loader);
  } else {
    hero.classList.add('is-fallback');
    initFallback(hero, state);
    if (loader) loader.style.opacity = 0;
  }
  initSnow(hero.querySelector('.snow'), reduced);
  const bg3d = hero.querySelector('.hero__bg3d');
  if (bg3d) import('./hero-bg.js').then((m) => m.initHeroBg(bg3d, state, reduced)).catch((e) => console.warn('3D bg disabled', e));

  // copy slides timeline
  const slides = hero.querySelectorAll('.hero__slide');
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.6,
      onUpdate: (self) => { state.p = self.progress; setProgress(self.progress); state.render?.(); },
    },
  });
  // slide 1 visible at start
  gsap.set(slides[0], { opacity: 1 });
  tl.to(slides[0], { opacity: 0, y: -60, filter: 'blur(10px)', duration: 0.12, ease: 'power2.in' }, 0.06)
    .to(hero.querySelector('.scroll-hint'), { opacity: 0, duration: 0.05 }, 0.02)
    .fromTo(slides[1], { opacity: 0, x: -40, filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.1 }, 0.24)
    .to(slides[1], { opacity: 0, x: -40, filter: 'blur(10px)', duration: 0.1 }, 0.42)
    .fromTo(slides[2], { opacity: 0, x: 40, filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.1 }, 0.5)
    .to(slides[2], { opacity: 0, x: 40, filter: 'blur(10px)', duration: 0.1 }, 0.68)
    .fromTo(slides[3], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.12 }, 0.78)
    .to({}, { duration: 0.1 }, 0.9);

  // entrance
  if (!reduced) {
    gsap.from(slides[0].querySelectorAll('.split-line > span'), { yPercent: 110, duration: 1.4, stagger: 0.08, ease: 'expo.out', delay: 0.2 });
    gsap.from(slides[0].querySelector('.hero__sub'), { opacity: 0, y: 20, duration: 1.2, delay: 0.8, ease: 'expo.out' });
  }
}

function initSequence(canvas, m, state, loader) {
  const ctx = canvas.getContext('2d');
  const isMobile = matchMedia('(max-width: 760px)').matches && m.mobile;
  const src = isMobile ? m.mobile : m;
  const frames = new Array(src.count);
  let loaded = 0, lastDrawn = -1;
  const url = (i) => `assets/hero/${src.dir}/${String(i + 1).padStart(4, '0')}.${src.ext || 'webp'}`;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    lastDrawn = -1; draw();
  }
  function nearestLoaded(i) {
    if (frames[i]?.complete) return frames[i];
    for (let d = 1; d < src.count; d++) {
      if (frames[i - d]?.complete && frames[i - d].naturalWidth) return frames[i - d];
      if (frames[i + d]?.complete && frames[i + d].naturalWidth) return frames[i + d];
    }
    return null;
  }
  function draw() {
    const i = Math.min(src.count - 1, Math.floor(state.p * (src.count - 1)));
    if (i === lastDrawn) return;
    const img = nearestLoaded(i);
    if (!img) return;
    if (img === frames[i]) lastDrawn = i;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  state.render = () => requestAnimationFrame(draw);

  // load order: first frame, then every 8th, 4th, 2nd, rest — scrubbing works early
  const order = [];
  const seen = new Set();
  [16, 8, 4, 2, 1].forEach((step) => { for (let i = 0; i < src.count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });
  let cursor = 0;
  const pump = () => {
    if (cursor >= order.length) return;
    const i = order[cursor++];
    const img = new Image();
    img.decoding = 'async';
    img.onload = img.onerror = () => {
      loaded++;
      if (loader) { loader.style.width = (loaded / src.count) * 100 + '%'; if (loaded === src.count) loader.style.opacity = 0; }
      if (i === 0) resize();
      state.render();
      pump();
    };
    img.src = url(i);
    frames[i] = img;
  };
  for (let k = 0; k < 6; k++) pump();
  addEventListener('resize', resize);
  resize();
}

function initFallback(hero, state) {
  const mug = hero.querySelector('.fb-mug');
  const gsap_ = window.gsap;
  state.render = () => {
    const p = state.p;
    gsap_.set(mug, {
      rotateY: Math.sin(p * Math.PI * 2) * 22,
      rotateZ: -6 + p * 12,
      y: Math.sin(p * Math.PI) * -30,
      scale: 1 + Math.sin(p * Math.PI) * 0.18,
    });
  };
  // idle float
  gsap_.to(hero.querySelector('.fb-mug-wrap'), { y: -14, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  state.render();
}

function initSnow(canvas, reduced) {
  if (!canvas || reduced) return;
  const ctx = canvas.getContext('2d');
  let w, h, flakes = [];
  const resize = () => {
    w = canvas.width = canvas.clientWidth; h = canvas.height = canvas.clientHeight;
    flakes = Array.from({ length: Math.round(w / 14) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + 0.4, s: Math.random() * 0.5 + 0.2, d: Math.random() * Math.PI * 2 }));
  };
  resize(); addEventListener('resize', resize);
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,245,235,.7)';
    for (const f of flakes) {
      f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.3;
      if (f.y > h) { f.y = -5; f.x = Math.random() * w; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
    }
  })();
}
