// =========================================================
// HERO — film na pełny ekran sterowany scrollem
// Klatki: tools/extract-frames.sh -> assets/hero/
//
// Płynność:
//  - klatki dekodowane poza głównym wątkiem (createImageBitmap)
//  - pozycja filmu „dogania” scroll z lekką bezwładnością (lerp)
//  - przenikanie sąsiednich klatek -> brak skoków między klatkami
//  - rysowanie tylko gdy coś się zmieniło
// =========================================================
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

export async function initHero(reduced) {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const canvas = hero.querySelector('.hero__canvas');
  const loader = hero.querySelector('.hero__loader');

  // w hero widać tylko logo
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom 60%',
    onToggle: (self) => document.documentElement.classList.toggle('in-hero', self.isActive),
  });
  if (scrollY < hero.offsetTop + hero.offsetHeight * 0.85) document.documentElement.classList.add('in-hero');

  let manifest = null;
  try {
    const r = await fetch('assets/hero/frames.json', { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch {}

  if (!manifest || !manifest.count) {
    hero.classList.add('is-fallback');
    if (loader) loader.style.opacity = 0;
    return;
  }

  const mobile = matchMedia('(max-width: 760px)').matches && manifest.mobile;
  const src = mobile ? manifest.mobile : manifest;
  const N = src.count;
  const url = (i) => `assets/hero/${src.dir}/${String(i + 1).padStart(4, '0')}.${src.ext || 'webp'}`;
  const frames = new Array(N);
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  // ---------- scroll -> docelowa pozycja ----------
  let target = 0, current = 0;
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => { target = self.progress * (N - 1); },
  });

  // ---------- rozmiar canvasa ----------
  let cw = 0, ch = 0, dirty = true;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cw = canvas.width = Math.round(canvas.clientWidth * dpr);
    ch = canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    dirty = true;
  }
  addEventListener('resize', resize);
  resize();

  // ---------- rysowanie ----------
  const nearest = (i, dir) => {
    for (let d = 0; d < N; d++) {
      const j = i + d * dir;
      if (j >= 0 && j < N && frames[j]) return frames[j];
      const k = i - d * dir;
      if (k >= 0 && k < N && frames[k]) return frames[k];
    }
    return null;
  };
  function cover(img, alpha) {
    const s = Math.max(cw / img.width, ch / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  let lastKey = '';
  function draw() {
    const i = Math.floor(current);
    const f = current - i;
    const a = frames[i] || nearest(i, -1);
    if (!a) return;
    const b = f > 0.02 && i + 1 < N ? frames[i + 1] : null;
    const key = `${i}|${b ? f.toFixed(2) : 0}|${a === frames[i]}|${cw}`;
    if (key === lastKey && !dirty) return;
    lastKey = key; dirty = false;
    cover(a, 1);
    if (b) cover(b, f);
    ctx.globalAlpha = 1;
  }

  (function loop() {
    requestAnimationFrame(loop);
    const diff = target - current;
    current = reduced || Math.abs(diff) < 0.01 ? target : current + diff * 0.22;
    draw();
  })();

  // ---------- ładowanie: najpierw co 16. klatka, potem gęściej ----------
  const order = [], seen = new Set();
  [32, 16, 8, 4, 2, 1].forEach((step) => { for (let i = 0; i < N; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });
  let cursor = 0, loaded = 0;
  const useBitmap = 'createImageBitmap' in window;
  async function load(i) {
    try {
      if (useBitmap) {
        const blob = await (await fetch(url(i))).blob();
        frames[i] = await createImageBitmap(blob);
      } else {
        const img = new Image(); img.src = url(i); await img.decode(); frames[i] = img;
      }
    } catch {}
    loaded++;
    if (loader) { loader.style.width = (loaded / N) * 100 + '%'; if (loaded === N) loader.style.opacity = 0; }
    if (i === 0 || Math.abs(i - current) < 2) dirty = true;
  }
  async function worker() { while (cursor < order.length) await load(order[cursor++]); }
  await load(order[cursor++]); // pierwsza klatka od razu
  for (let k = 0; k < 6; k++) worker();
}
