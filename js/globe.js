// =========================================================
// GLOBUS 3D — obraca się scrollem w stronę Polski i pokazuje
// zamówienia na żywo.
// Źródło danych: ustaw window.WINTERDIP_ORDERS_URL na endpoint
// zwracający JSON [{ city: "Kraków", product: "chocolate-mug", ts: 1731150000000 }].
// Bez endpointu działa tryb demonstracyjny (widoczna plakietka DEMO).
// =========================================================
import * as THREE from 'three';
import { CITIES, PRODUCTS } from './data.js';

const gsap = window.gsap;
const DEG = Math.PI / 180;

function latLon(lat, lon, r = 1) {
  const phi = (lon + 180) * DEG, theta = (90 - lat) * DEG;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}

export function initGlobe(reduced) {
  const sec = document.querySelector('.globe-sec');
  if (!sec) return;
  const canvas = sec.querySelector('.globe-canvas');
  let visible = false, needsRender = true;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  tilt.add(spin); scene.add(tilt);

  // Earth — warm-tinted night texture
  const loader = new THREE.TextureLoader();
  const loadTex = (u) => { const t = loader.load(u, () => { needsRender = true; }); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { land: { value: loadTex('assets/img/earth-dark.webp') }, night: { value: loadTex('assets/img/earth-night.webp') } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D land; uniform sampler2D night; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float l = dot(texture2D(land, vUv).rgb, vec3(.299,.587,.114));
        float n = dot(texture2D(night, vUv).rgb, vec3(.299,.587,.114));
        float isLand = 1. - smoothstep(.025, .07, l);
        vec3 ocean = vec3(.07,.012,.024) + l * .12;
        vec3 ground = vec3(.42,.06,.11);
        vec3 col = mix(ocean, ground, isLand);
        col += vec3(.97,.91,.84) * smoothstep(.12,.7,n) * 1.15;
        float facing = max(dot(vN, vV), 0.);
        col *= .55 + .45 * facing;
        col += vec3(.56,.83,.96) * pow(1. - facing, 3.) * .55;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMat);
  spin.add(earth);

  // Atmosphere
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vN; void main(){ float i = pow(max(.62 - dot(vN, vec3(0,0,1.)), 0.), 4.); gl_FragColor = vec4(.56,.83,.96,1.) * i * 2.; }`,
  }));
  scene.add(atm);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(1500 * 3);
  for (let i = 0; i < sp.length; i += 3) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(18 + Math.random() * 20);
    sp.set([v.x, v.y, v.z], i);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xf6e9d7, size: 0.05, transparent: true, opacity: 0.7 }));
  scene.add(stars);

  // city markers
  const dotTex = makeDotTexture();
  const markers = CITIES.map((c) => {
    const pos = latLon(c.lat, c.lon, 1.005);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xf6e9d7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(pos); m.scale.setScalar(0.014 + c.w * 0.0012);
    spin.add(m);
    return { ...c, pos, sprite: m };
  });

  // pulses + beams
  const pulses = [];
  function pulse(city) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.004, 0.009, 48), new THREE.MeshBasicMaterial({ color: 0x8fd3f4, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.position.copy(city.pos.clone().multiplyScalar(1.002));
    ring.lookAt(city.pos.clone().multiplyScalar(2));
    spin.add(ring);
    const beamGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.16, 8, 1, true);
    beamGeo.translate(0, 0.08, 0);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xf6e9d7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.copy(city.pos);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), city.pos.clone().normalize());
    spin.add(beam);
    const o = { t: 0 };
    pulses.push(o);
    gsap.to(o, { t: 1, duration: 2.4, ease: 'power2.out', onUpdate: () => {
      ring.scale.setScalar(1 + o.t * 9); ring.material.opacity = 1 - o.t;
      beam.scale.y = Math.sin(Math.min(o.t * 2, 1) * Math.PI / 2) ; beam.material.opacity = 1 - o.t;
      needsRender = true;
    }, onComplete: () => { spin.remove(ring, beam); ring.geometry.dispose(); beam.geometry.dispose(); pulses.splice(pulses.indexOf(o), 1); } });
    gsap.fromTo(city.sprite.scale, { x: 0.05, y: 0.05 }, { x: 0.014 + city.w * 0.0012, y: 0.014 + city.w * 0.0012, duration: 1.2, ease: 'expo.out' });
    showLabel(city);
  }

  // HTML label over city
  const label = document.createElement('div');
  label.className = 'city-label';
  sec.querySelector('.globe-sec__sticky').appendChild(label);
  let labelCity = null, labelT;
  function showLabel(city) {
    labelCity = city; label.textContent = city.name; label.style.opacity = 1;
    clearTimeout(labelT); labelT = setTimeout(() => { label.style.opacity = 0; }, 2200);
  }
  const tmp = new THREE.Vector3();
  function placeLabel() {
    if (!labelCity) return;
    labelCity.sprite.getWorldPosition(tmp);
    const facing = tmp.clone().normalize().dot(camera.position.clone().normalize()) > 0.15;
    tmp.project(camera);
    label.style.left = ((tmp.x + 1) / 2) * canvas.clientWidth + 'px';
    label.style.top = ((1 - tmp.y) / 2) * canvas.clientHeight + 'px';
    if (!facing) label.style.opacity = 0;
  }

  // scroll-driven rotation toward Poland
  const PL = latLon(52, 19.4);
  const targetY = -Math.atan2(PL.x, PL.z);
  const targetX = 52 * DEG;
  const isMobile = matchMedia('(max-width: 960px)').matches;
  const st = { ry: targetY - 3.4, rx: 0.15, z: isMobile ? 6.2 : 4.6, x: 0 };
  gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom bottom', scrub: reduced ? true : 1.2, onUpdate: () => (needsRender = true) } })
    .to(st, { ry: targetY - 1.2, rx: 0.4, duration: 0.35, ease: 'none' })
    .to(st, { ry: targetY, rx: targetX, z: isMobile ? 3.4 : 2.35, x: isMobile ? 0 : -0.35, duration: 0.5, ease: 'power2.inOut' })
    .to(st, { ry: targetY + 0.08, duration: 0.15, ease: 'none' });

  // mouse parallax
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 0.12; mouse.ty = (e.clientY / innerHeight - 0.5) * 0.08; });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needsRender = true;
  }
  addEventListener('resize', resize); resize();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(sec);

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    spin.rotation.y = st.ry + mouse.x;
    tilt.rotation.x = st.rx + mouse.y;
    camera.position.z = st.z;
    camera.position.x = st.x;
    stars.rotation.y += 0.0002;
    renderer.render(scene, camera);
    placeLabel();
  })();

  initFeed(sec, pulse, markers);
}

function makeDotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(246,233,215,.9)'); grd.addColorStop(1, 'rgba(143,211,244,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------- orders feed ----------------
function initFeed(sec, pulse, markers) {
  const feed = sec.querySelector('.order-feed');
  const countEl = sec.querySelector('[data-orders-today]');
  const citiesEl = sec.querySelector('[data-orders-cities]');
  const badge = sec.querySelector('.demo-badge');
  const endpoint = window.WINTERDIP_ORDERS_URL;
  const byName = Object.fromEntries(markers.map((m) => [m.name, m]));
  const seenCities = new Set();
  let total = 0;
  let active = false;
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
    el.innerHTML = `<img src="${product.img}" alt=""><div>Nowe zamówienie · <b>${order.city}</b><small>${product.name} · ${ago ? ago + ' min temu' : 'przed chwilą'}</small></div>`;
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
        if (!lastTs) { total = data.length; } // initial count
        fresh.slice(-5).forEach((o, i) => setTimeout(() => push(o), i * 900));
        if (data.length) lastTs = Math.max(...data.map((o) => o.ts || 0));
      } catch {}
      setTimeout(poll, 8000);
    };
    poll();
    return;
  }

  // DEMO mode — synthetic orders for layout preview only
  const weighted = markers.flatMap((m) => Array(m.w).fill(m.name));
  const tick = () => {
    if (active && document.visibilityState === 'visible') {
      push({ city: weighted[(Math.random() * weighted.length) | 0], product: Math.random() < 0.35 ? 'chocolate-duo' : 'chocolate-mug', ts: Date.now() });
    }
    setTimeout(tick, 2200 + Math.random() * 2600);
  };
  setTimeout(tick, 1200);
}
