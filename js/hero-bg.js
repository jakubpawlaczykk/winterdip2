// =========================================================
// HERO — tło 3D w barwach Winter Dip
// Aksamitna fala (wino/czekolada), błyszczące śnieżynki 3D
// w kolorze logo, bombki i śnieg w głębi. Reaguje na scroll i mysz.
// =========================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const C = {
  wine: 0x7a0e1e, wineDeep: 0x3a0711, cream: 0xf6e9d7, ice: 0x8fd3f4, iceDeep: 0x2fa6e0, choco: 0x4a1f12,
};

export function initHeroBg(canvas, state, reduced) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x24070e, 9, 22);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  // lights: warm fire left, ice moon right
  scene.add(new THREE.AmbientLight(0xffe8d6, 0.25));
  const warm = new THREE.PointLight(0xff9a5c, 60, 30); warm.position.set(-6, 1, 5); scene.add(warm);
  const cool = new THREE.PointLight(C.ice, 45, 30); cool.position.set(6, 3, 4); scene.add(cool);
  const top = new THREE.DirectionalLight(0xfff1e0, 1.2); top.position.set(0, 6, 6); scene.add(top);

  // ---------- velvet wave ----------
  const waveMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uT: { value: 0 }, uP: { value: 0 }, uWine: { value: new THREE.Color(C.wine) }, uDeep: { value: new THREE.Color(0x1c050a) }, uCream: { value: new THREE.Color(C.cream) }, uIce: { value: new THREE.Color(C.ice) } },
    vertexShader: `
      uniform float uT; uniform float uP; varying float vH; varying vec3 vPos; varying vec2 vUv;
      vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
      vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
      float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
        vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
        vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
        vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
        vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
        m*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
      varying vec3 vN;
      float disp(vec2 q){
        float n = snoise(vec2(q.x*.22 + uT*.05, q.y*.3 - uT*.04)) * 1.1
                + snoise(vec2(q.x*.6 - uT*.08, q.y*.7 + uT*.06)) * .3;
        float fold = sin(q.x*.55 + uT*.25 + q.y*.4) * .55;
        return (n + fold) * (1. + uP*.6);
      }
      void main(){
        vUv=uv; vec3 p=position;
        float e = .06;
        float h = disp(p.xy);
        float hx = disp(p.xy + vec2(e,0.)) - disp(p.xy - vec2(e,0.));
        float hy = disp(p.xy + vec2(0.,e)) - disp(p.xy - vec2(0.,e));
        vec3 nLocal = normalize(vec3(-hx, -hy, 2.*e));
        vN = normalize(mat3(modelMatrix) * nLocal);
        p.z += h;
        vH = h; vPos = (modelMatrix*vec4(p,1.)).xyz;
        gl_Position = projectionMatrix*viewMatrix*vec4(vPos,1.);
      }`,
    fragmentShader: `
      uniform vec3 uWine; uniform vec3 uDeep; uniform vec3 uCream; uniform vec3 uIce; uniform float uP;
      varying float vH; varying vec3 vPos; varying vec2 vUv; varying vec3 vN;
      void main(){
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vPos);
        float diff = clamp(dot(N, normalize(vec3(-.4,.6,.7))), 0., 1.);
        vec3 col = mix(uDeep, uWine, smoothstep(-1.4, 1.2, vH) * (.45 + .55*diff));
        // velvet sheen: bright at grazing angles
        float sheen = pow(1. - abs(dot(N, V)), 3.);
        col += mix(uCream, uIce, smoothstep(0., 1., vUv.x)) * sheen * .28;
        // soft specular ridge
        vec3 H = normalize(normalize(vec3(.5,.8,.6)) + V);
        col += uCream * pow(max(dot(N,H),0.), 60.) * .35;
        float edge = smoothstep(0., .18, vUv.y) * smoothstep(1., .75, vUv.y);
        gl_FragColor = vec4(col, edge * .95);
      }`,
  });
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(26, 11, 220, 110), waveMat);
  wave.position.set(0, -2.6, -3.5);
  wave.rotation.x = -1.05;
  scene.add(wave);

  // ---------- floating objects ----------
  const group = new THREE.Group(); scene.add(group);
  const flakeGeo = makeSnowflakeGeometry();
  const iceMat = new THREE.MeshPhysicalMaterial({ color: C.ice, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.4, sheenColor: new THREE.Color(0xffffff) });
  const iceDeepMat = iceMat.clone(); iceDeepMat.color = new THREE.Color(C.iceDeep);
  const creamMat = new THREE.MeshPhysicalMaterial({ color: C.cream, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const wineMat = new THREE.MeshPhysicalMaterial({ color: 0x9c1428, roughness: 0.12, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const chocoMat = new THREE.MeshPhysicalMaterial({ color: C.choco, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const sphereGeo = new THREE.SphereGeometry(1, 48, 48);
  const capGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.22, 24);

  const items = [];
  // [type, x, y, z, scale] — tylko po bokach, środek zostaje dla kubka
  const layout = [
    ['flake', -4.5, 2.0, -0.5, 0.6], ['flake', 4.6, -1.3, -0.5, 0.7], ['flake', -3.2, -2.7, 1.5, 0.35], ['flake', 3.6, 2.5, -2.5, 0.5],
    ['flake', -6.8, -0.8, -4, 0.85], ['flake', 7.2, 2.0, -5, 0.8], ['flake', 2.4, -3.0, 2.6, 0.22],
    ['orn-wine', -4.0, -1.0, 0.8, 0.3], ['orn-cream', 4.2, 0.9, 1.0, 0.24], ['orn-wine', 5.8, 2.9, -3, 0.42], ['orn-ice', -5.6, 2.8, -3.5, 0.34],
    ['drop', 2.9, 0.6, 3.0, 0.09], ['drop', -2.9, 1.5, 3.2, 0.08], ['drop', 3.8, -2.1, 2.2, 0.12], ['drop', -4.6, 0.3, 1.6, 0.11],
  ];
  // układ na telefon (wąski ekran): dekoracje w rogach, nad i pod kubkiem
  const mobileLayout = [
    [-1.9, 3.5, 0, 0.45], [2.0, -3.6, 0, 0.5], [-2.0, -2.2, 1, 0.3], [1.8, 2.6, -2, 0.4],
    [-2.6, 0.6, -3, 0.6], [2.8, 0.2, -4, 0.55], [0.9, -4.2, 1.5, 0.2],
    [-1.6, -3.9, 0.5, 0.26], [1.9, 1.0, 0.5, 0.2], [2.2, 4.0, -2, 0.3], [-2.3, 4.3, -2.5, 0.26],
    [1.2, 3.1, 2.5, 0.07], [-1.3, 2.0, 2.5, 0.06], [1.5, -2.6, 2, 0.09], [-1.9, -0.4, 1.5, 0.08],
  ];
  layout.forEach(([type, x, y, z, s], i) => {
    let obj;
    if (type === 'flake') obj = new THREE.Mesh(flakeGeo, Math.random() > 0.35 ? iceMat : iceDeepMat);
    else if (type === 'drop') obj = new THREE.Mesh(sphereGeo, chocoMat);
    else {
      obj = new THREE.Group();
      const mat = type === 'orn-wine' ? wineMat : type === 'orn-cream' ? creamMat : iceMat;
      obj.add(new THREE.Mesh(sphereGeo, mat));
      const cap = new THREE.Mesh(capGeo, new THREE.MeshPhysicalMaterial({ color: 0xd9c3a0, metalness: 0.9, roughness: 0.3 }));
      cap.position.y = 1.02; obj.add(cap);
    }
    obj.position.set(x, y, z);
    obj.scale.setScalar(s);
    obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    group.add(obj);
    const m = mobileLayout[i];
    items.push({ obj, desk: { pos: new THREE.Vector3(x, y, z), s }, mob: { pos: new THREE.Vector3(m[0], m[1], m[2]), s: m[3] }, spin: (Math.random() - 0.5) * 0.6, phase: Math.random() * 6, float: 0.12 + Math.random() * 0.2 });
  });
  let isMobile = false;
  const applyLayout = () => items.forEach((it) => { it.base = isMobile ? it.mob.pos : it.desk.pos; it.obj.scale.setScalar(isMobile ? it.mob.s : it.desk.s); });

  // ---------- snow ----------
  const N = reduced ? 0 : 900;
  const snowGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(N * 3), sv = new Float32Array(N);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 22; sp[i * 3 + 1] = (Math.random() - 0.5) * 12; sp[i * 3 + 2] = Math.random() * 10 - 5; sv[i] = 0.3 + Math.random() * 0.7; }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xfff6ec, size: 0.06, map: dotTexture(), transparent: true, depthWrite: false, opacity: 0.85, sizeAttenuation: true }));
  scene.add(snow);

  // ---------- interaction ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    isMobile = w / h < 0.8;
    camera.fov = isMobile ? 55 : 38; // telefon: szerszy kadr
    camera.updateProjectionMatrix();
    applyLayout();
  }
  addEventListener('resize', resize); resize();

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  const clock = new THREE.Clock();
  let p = 0;

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || state.bgHidden) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    p += ((state.p || 0) - p) * 0.08;
    mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;

    waveMat.uniforms.uT.value = reduced ? 0 : t;
    waveMat.uniforms.uP.value = p;

    // scroll: kamera wjeżdża w scenę, obiekty rozsuwają się na boki
    camera.position.z = 9 - p * 3.2;
    camera.position.x = mouse.x * 0.8;
    camera.position.y = -mouse.y * 0.5 + p * 0.6;
    camera.lookAt(0, p * 0.3, 0);

    for (const it of items) {
      const spread = 1 + p * (isMobile ? 0.35 : 0.55);
      it.obj.position.x = it.base.x * spread;
      it.obj.position.y = it.base.y + Math.sin(t * 0.6 + it.phase) * it.float + p * (it.base.y > 0 ? 1.2 : -1.2);
      it.obj.position.z = it.base.z;
      if (!reduced) { it.obj.rotation.y += it.spin * dt; it.obj.rotation.x += it.spin * 0.4 * dt; }
      it.obj.rotation.z = it.phase + p * it.spin * 4;
    }

    if (N) {
      const pos = snowGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        pos[i * 3 + 1] -= sv[i] * dt * 0.6;
        pos[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.08;
        if (pos[i * 3 + 1] < -6) pos[i * 3 + 1] = 6;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  })();
}

// zaokrąglona śnieżynka jak w logo: 6 ramion + gałązki z kapsułek
function makeSnowflakeGeometry() {
  const parts = [];
  const r = 0.11;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const arm = new THREE.CapsuleGeometry(r, 1.0, 6, 12);
    arm.translate(0, 0.62, 0); arm.rotateZ(a); parts.push(arm);
    for (const side of [-1, 1]) {
      const br = new THREE.CapsuleGeometry(r * 0.85, 0.32, 6, 10);
      br.translate(0, 0.2, 0); br.rotateZ(side * 0.85); br.translate(0, 0.72, 0); br.rotateZ(a);
      parts.push(br);
    }
  }
  const center = new THREE.SphereGeometry(0.24, 24, 24); parts.push(center);
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  g.scale(1, 1, 0.9);
  return g;
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}
