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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  // zawsze jedna, pełna klatka (bez nakładania dwóch) = maksymalna ostrość
  let lastDrawn = -1, lastImg = null;
  function draw() {
    const i = Math.max(0, Math.min(N - 1, Math.round(current)));
    const img = frames[i] || nearest(i, -1);
    if (!img) return;
    if (i === lastDrawn && img === lastImg && !dirty) return;
    lastDrawn = i; lastImg = img; dirty = false;
    cover(img, 1);
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

// ---------- śnieg nad filmem: pada CAŁY CZAS, także bez scrollowania ----------
// Mieszanka: kryształki-śnieżynki (jak w logo) + miękkie płatki, 3 warstwy głębi.
function initHeroSnow(canvas, reduced) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);

  // kryształek: 6 zaokrąglonych ramion z gałązkami
  function crystal(size, color) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size * 0.42;
    g.translate(size / 2, size / 2);
    g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = size * 0.07;
    g.shadowColor = 'rgba(255,255,255,.8)'; g.shadowBlur = size * 0.08;
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate((i * Math.PI) / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r);
      g.moveTo(0, -r * 0.55); g.lineTo(-r * 0.22, -r * 0.78);
      g.moveTo(0, -r * 0.55); g.lineTo(r * 0.22, -r * 0.78);
      g.stroke(); g.restore();
    }
    g.beginPath(); g.arc(0, 0, size * 0.06, 0, 7); g.fillStyle = color; g.fill();
    return c;
  }
  function dot(size, soft) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(soft ? 0.3 : 0.6, 'rgba(255,252,248,.9)');
    gr.addColorStop(1, 'rgba(255,252,248,0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  const IMG = {
    crystalW: crystal(96, '#ffffff'),
    crystalI: crystal(96, '#cfeeff'),
    dot: dot(32, false),
    soft: dot(64, true),
  };

  // warstwy: tło (małe, wolne), środek, przód (duże, szybkie, lekko rozmyte)
  const layers = [
    { density: 0.00016, kinds: ['dot', 'dot', 'crystalW'], size: [2, 5], crystal: [9, 15], speed: [22, 38], sway: 12, alpha: [0.45, 0.75], par: 0.12 },
    { density: 0.00007, kinds: ['dot', 'crystalW', 'crystalI'], size: [4, 7], crystal: [16, 26], speed: [40, 65], sway: 20, alpha: [0.7, 0.95], par: 0.3 },
    { density: 0.000016, kinds: ['soft', 'crystalW'], size: [12, 22], crystal: [30, 48], speed: [70, 110], sway: 30, alpha: [0.35, 0.6], par: 0.6, blur: true },
  ];
  const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
  let w = 0, h = 0, flakes = [];

  function make(L, anywhere) {
    const kind = L.kinds[(Math.random() * L.kinds.length) | 0];
    const isCrystal = kind.startsWith('crystal');
    return {
      L, kind, img: IMG[kind], isCrystal,
      x: Math.random() * w, y: anywhere ? Math.random() * h : -40,
      s: isCrystal ? rnd(L.crystal) : rnd(L.size),
      v: rnd(L.speed), a: rnd(L.alpha),
      ph: Math.random() * 6.28, f: 0.3 + Math.random() * 0.7,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 1.2,
    };
  }
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = [];
    for (const L of layers) {
      const n = Math.max(8, Math.round(w * h * L.density * (reduced ? 0.3 : 1)));
      for (let i = 0; i < n; i++) flakes.push(make(L, true));
    }
  }
  resize(); addEventListener('resize', resize);

  let visible = true, lastY = scrollY, last = performance.now();
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const dy = scrollY - lastY; lastY = scrollY;
    if (!visible || document.hidden) return;
    ctx.clearRect(0, 0, w, h);
    const t = now / 1000;
    const wind = 8 + Math.sin(t * 0.15) * 10; // delikatne podmuchy
    for (const p of flakes) {
      p.y += p.v * dt * (reduced ? 0.4 : 1) - dy * p.L.par;
      p.x += (Math.sin(t * p.f + p.ph) * p.L.sway + wind) * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 40) Object.assign(p, make(p.L, false));
      if (p.y < -60) { p.y = h + 30; p.x = Math.random() * w; }
      if (p.x > w + 40) p.x = -40; else if (p.x < -40) p.x = w + 40;
      ctx.globalAlpha = p.a;
      if (p.isCrystal) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s);
        ctx.restore();
      } else {
        ctx.drawImage(p.img, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
    }
    ctx.globalAlpha = 1;
  })(performance.now());
}
