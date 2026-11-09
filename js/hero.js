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

  initHeroSnow(hero.querySelector('.hero__snow'), reduced);
  if (!reduced) {
    const ov = hero.querySelector('.hero__overlay');
    if (ov) {
      gsap.from(ov.querySelectorAll('.hero__headline > span'), { y: 50, opacity: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out', delay: 0.3 });
      gsap.from(ov.querySelectorAll('.hero__kicker, .hero__lead, .hero__btns'), { opacity: 0, y: 24, duration: 1.1, stagger: 0.12, ease: 'expo.out', delay: 0.5 });
    }
  }

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

// ---------- śnieg nad filmem: pada cały czas, 3 warstwy głębi ----------
function initHeroSnow(canvas, reduced) {
  if (!canvas || reduced) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  // gotowe „duszki” płatków: ostry mały i miękki rozmyty
  const sprite = (size, blur) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(blur ? 0.25 : 0.55, 'rgba(255,250,245,.85)');
    r.addColorStop(1, 'rgba(255,250,245,0)');
    g.fillStyle = r; g.fillRect(0, 0, size, size);
    return c;
  };
  const sharp = sprite(32, false), soft = sprite(64, true);
  const layers = [
    { n: 0.00022, size: [1.2, 2.6], speed: [18, 30], sway: 10, alpha: [0.35, 0.6], img: sharp, par: 0.15 },
    { n: 0.0001, size: [2.6, 4.8], speed: [32, 50], sway: 18, alpha: [0.55, 0.85], img: sharp, par: 0.35 },
    { n: 0.00002, size: [9, 18], speed: [55, 85], sway: 26, alpha: [0.25, 0.45], img: soft, par: 0.7 },
  ];
  let w = 0, h = 0, flakes = [];
  const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = [];
    for (const L of layers) {
      const count = Math.max(6, Math.round(w * h * L.n));
      for (let i = 0; i < count; i++) flakes.push({ L, x: Math.random() * w, y: Math.random() * h, s: rnd(L.size), v: rnd(L.speed), a: rnd(L.alpha), ph: Math.random() * 6.28, f: 0.4 + Math.random() * 0.8 });
    }
  }
  resize(); addEventListener('resize', resize);

  let visible = true, lastY = scrollY, last = performance.now();
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const dy = scrollY - lastY; lastY = scrollY;
    if (!visible) return;
    ctx.clearRect(0, 0, w, h);
    const t = now / 1000;
    for (const p of flakes) {
      p.y += p.v * dt - dy * p.L.par;               // opad + paralaksa przy scrollu
      p.x += Math.sin(t * p.f + p.ph) * p.L.sway * dt + 6 * dt; // kołysanie + lekki wiatr
      if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      if (p.y < -30) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x > w + 20) p.x = -20;
      ctx.globalAlpha = p.a;
      ctx.drawImage(p.L.img, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
    }
    ctx.globalAlpha = 1;
  })(performance.now());
}
