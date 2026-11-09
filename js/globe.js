// =========================================================
// GLOBUS 3D — naturalne kolory Ziemi, scroll przesuwa go na bok
// i przybliża do Polski: widać kontur kraju, granice i miasta.
// Zamówienia na żywo: window.WINTERDIP_ORDERS_URL -> JSON
// [{ city: "Kraków", product: "chocolate-mug", ts: 1731150000000 }]
// Bez endpointu działa tryb demo (widoczna plakietka).
// =========================================================
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { CITIES, PRODUCTS } from './data.js';
import { initHeroSnow } from './hero.js';

const gsap = window.gsap;
const DEG = Math.PI / 180;

function latLon(lat, lon, r = 1) {
  const phi = (lon + 180) * DEG, theta = (90 - lat) * DEG;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}

export async function initGlobe(reduced) {
  const sec = document.querySelector('.globe-sec');
  if (!sec) return;
  const sticky = sec.querySelector('.globe-sec__sticky');
  const canvas = sec.querySelector('.globe-canvas');

  // śnieg nad sceną
  const snow = document.createElement('canvas');
  snow.className = 'globe-snow'; snow.setAttribute('aria-hidden', 'true');
  sticky.appendChild(snow);
  initHeroSnow(snow, reduced);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, 0, 4.4);

  const tilt = new THREE.Group(), spin = new THREE.Group();
  tilt.add(spin); scene.add(tilt);

  // ---------- Ziemia ----------
  const tex = new THREE.TextureLoader().load('assets/img/earth-day.webp');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 c = texture2D(map, vUv).rgb;
        float facing = max(dot(vN, vV), 0.);
        float light = .8 + .45 * max(dot(vN, normalize(vec3(-.35,.45,.85))), 0.);
        c *= light;
        c = pow(c, vec3(.88)) * 1.12;
        c += vec3(.55,.75,1.) * pow(1. - facing, 3.) * .45;
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMat));

  // atmosfera
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vN; void main(){ float i = pow(max(.65 - dot(vN, vec3(0,0,1.)), 0.), 3.); gl_FragColor = vec4(.6,.8,1.,1.) * i * 1.6; }`,
  })));

  // ---------- granice i Polska ----------
  const lineMats = [];
  const makeLine = (coords, r, color, width, opacity) => {
    const pts = [];
    for (const [lon, lat] of coords) { const v = latLon(lat, lon, r); pts.push(v.x, v.y, v.z); }
    const g = new LineGeometry(); g.setPositions(pts);
    const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false });
    lineMats.push(m);
    const l = new Line2(g, m); l.computeLineDistances(); spin.add(l); return l;
  };
  let plOutline = [], plFill = null, nearLines = [], worldLines = [];
  try {
    const geo = await (await fetch('assets/geo/geo.json')).json();
    worldLines = geo.borders.map((l) => makeLine(l, 1.0015, 0xffffff, 0.8, 0.22));
    nearLines = geo.near.map((l) => makeLine(l, 1.002, 0xffffff, 1.2, 0));
    plOutline = geo.poland.map((ring) => makeLine([...ring, ring[0]], 1.003, 0xffe7c4, 3, 0));
    const ring = geo.poland.reduce((a, b) => (b.length > a.length ? b : a));
    const shape = new THREE.Shape(ring.map(([lon, lat]) => new THREE.Vector2(lon, lat)));
    const sg = new THREE.ShapeGeometry(shape);
    const pos = sg.attributes.position;
    for (let i = 0; i < pos.count; i++) { const v = latLon(pos.getY(i), pos.getX(i), 1.004); pos.setXYZ(i, v.x, v.y, v.z); }
    plFill = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xf2b05e, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    spin.add(plFill);
  } catch (e) { console.warn('geo', e); }

  // ---------- miasta ----------
  const dotTex = makeDotTexture();
  const markers = CITIES.map((c) => {
    const pos = latLon(c.lat, c.lon, 1.006);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff2dc, transparent: true, depthWrite: false }));
    m.position.copy(pos); m.scale.setScalar(0.012 + c.w * 0.0008);
    spin.add(m);
    const label = document.createElement('span');
    label.className = 'pl-label'; label.textContent = c.name;
    sticky.appendChild(label);
    return { ...c, pos, sprite: m, label };
  });

  function pulse(city) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.002, 0.004, 48), new THREE.MeshBasicMaterial({ color: 0xf2b05e, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(city.pos.clone().multiplyScalar(1.001));
    ring.lookAt(city.pos.clone().multiplyScalar(2));
    spin.add(ring);
    const o = { t: 0 };
    gsap.to(o, { t: 1, duration: 2.2, ease: 'power2.out', onUpdate: () => { ring.scale.setScalar(1 + o.t * 8); ring.material.opacity = 1 - o.t; },
      onComplete: () => { spin.remove(ring); ring.geometry.dispose(); } });
    gsap.fromTo(city.sprite.scale, { x: 0.04, y: 0.04 }, { x: 0.012 + city.w * 0.0008, y: 0.012 + city.w * 0.0008, duration: 1.2, ease: 'expo.out' });
    city.flash = performance.now();
  }

  // ---------- scroll: obrót -> przesunięcie na bok -> zbliżenie na Polskę ----------
  const PL = latLon(52, 19.3);
  const targetY = -Math.atan2(PL.x, PL.z);
  const targetX = 52 * DEG;
  const st = { ry: targetY - 2.4, rx: 0.2, z: 4.4, shift: 0, zoomP: 0 };
  const mobile = () => innerWidth < 960;
  gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom bottom', scrub: reduced ? true : 1 } })
    .to(st, { ry: targetY - 0.5, rx: targetX * 0.6, z: 3.6, duration: 0.4, ease: 'none' })
    .to(st, { ry: targetY, rx: targetX, z: 1.36, shift: 1, zoomP: 1, duration: 0.45, ease: 'power2.inOut' })
    .to({}, { duration: 0.15 });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    lineMats.forEach((m) => m.resolution.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()));
  }
  addEventListener('resize', resize); resize();

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(sec);
  const tmp = new THREE.Vector3();

  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const m = mobile();
    // Polska ląduje po prawej (komputer) albo niżej (telefon)
    camera.setViewOffset(w, h, m ? 0 : -0.2 * w * st.shift, m ? -0.16 * h * st.shift : 0, w, h);
    camera.position.set(0, 0, m ? 1 + (st.z - 1) * 1.7 : st.z);

    const idle = reduced ? 0 : (1 - st.zoomP) * now * 0.00003;
    spin.rotation.y = st.ry + idle;
    tilt.rotation.x = st.rx;

    const zp = st.zoomP;
    plOutline.forEach((l) => (l.material.opacity = Math.min(1, zp * 1.6)));
    nearLines.forEach((l) => (l.material.opacity = Math.min(0.55, zp * 0.8)));
    worldLines.forEach((l) => (l.material.opacity = 0.22 * (1 - zp * 0.6)));
    if (plFill) plFill.material.opacity = 0.12 + zp * 0.14;

    renderer.render(scene, camera);

    for (const c of markers) {
      c.sprite.getWorldPosition(tmp);
      const facing = tmp.clone().normalize().dot(camera.position.clone().normalize()) > 0.2;
      tmp.project(camera);
      const big = zp > 0.75 && (c.w >= 2 || zp > 0.95);
      const flash = c.flash && now - c.flash < 2200;
      c.label.style.opacity = facing && (big || flash) ? 1 : 0;
      c.label.style.left = ((tmp.x + 1) / 2) * w + 'px';
      c.label.style.top = ((1 - tmp.y) / 2) * h + 'px';
    }
  })(performance.now());

  initFeed(sec, pulse, markers);
}

function makeDotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,214,150,.95)'); grd.addColorStop(1, 'rgba(242,176,94,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------- feed zamówień ----------------
function initFeed(sec, pulse, markers) {
  const feed = sec.querySelector('.order-feed');
  const countEl = sec.querySelector('[data-orders-today]');
  const citiesEl = sec.querySelector('[data-orders-cities]');
  const badge = sec.querySelector('.demo-badge');
  const endpoint = window.WINTERDIP_ORDERS_URL;
  const byName = Object.fromEntries(markers.map((m) => [m.name, m]));
  const seenCities = new Set();
  let total = 0, active = false;
  new IntersectionObserver(([e]) => { active = e.isIntersecting; }).observe(sec);

  function push(order) {
    const city = byName[order.city];
    const product = PRODUCTS[order.product] || PRODUCTS['chocolate-mug'];
    total++; if (countEl) countEl.textContent = total;
    seenCities.add(order.city); if (citiesEl) citiesEl.textContent = seenCities.size;
    if (city) pulse(city);
    const el = document.createElement('div');
    el.className = 'order-toast';
    const ago = order.ts ? Math.max(0, Math.round((Date.now() - order.ts) / 60000)) : 0;
    el.innerHTML = `<div>Nowe zamówienie · <b>${order.city}</b><small>${product.name} · ${ago ? ago + ' min temu' : 'przed chwilą'}</small></div>`;
    feed.appendChild(el);
    gsap.fromTo(el, { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' });
    const items = feed.querySelectorAll('.order-toast');
    if (items.length > 3) gsap.to(items[0], { opacity: 0, height: 0, padding: 0, margin: 0, duration: 0.4, onComplete: () => items[0].remove() });
  }

  if (endpoint) {
    badge?.remove();
    let lastTs = 0;
    const poll = async () => {
      try {
        const data = await (await fetch(endpoint, { cache: 'no-store' })).json();
        const fresh = data.filter((o) => (o.ts || 0) > lastTs).sort((a, b) => a.ts - b.ts);
        fresh.slice(-5).forEach((o, i) => setTimeout(() => push(o), i * 900));
        if (data.length) lastTs = Math.max(...data.map((o) => o.ts || 0));
      } catch {}
      setTimeout(poll, 8000);
    };
    poll();
    return;
  }

  const weighted = markers.flatMap((m) => Array(m.w).fill(m.name));
  const tick = () => {
    if (active && document.visibilityState === 'visible') {
      push({ city: weighted[(Math.random() * weighted.length) | 0], product: Math.random() < 0.35 ? 'chocolate-duo' : 'chocolate-mug', ts: Date.now() });
    }
    setTimeout(tick, 2200 + Math.random() * 2600);
  };
  setTimeout(tick, 1200);
}
