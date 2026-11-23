// Fondo 3D del acceso: hojas verdes y comida fresca flotando sobre la pizarra.
// Todo es procedural (sin modelos ni imágenes externas): texturas pintadas en canvas y materiales físicos.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const BOARD = 0x17231d;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ---------- Texturas pintadas ----------

type LeafKind = { w: number; h: number; base: [string, string, string]; serrated: boolean; veins: number; sheen: number; clearcoat: number };
const LEAVES: LeafKind[] = [
  { w: 0.62, h: 1, base: ['#2c8a2e', '#46ad3a', '#7fd056'], serrated: false, veins: 7, sheen: 0.2, clearcoat: 0.6 }, // albahaca
  { w: 0.78, h: 1, base: ['#1d6a2c', '#2e8a3a', '#56a84a'], serrated: false, veins: 6, sheen: 0.35, clearcoat: 0.35 }, // espinaca
  { w: 0.55, h: 1, base: ['#3a9a3c', '#5cbc4a', '#98dc68'], serrated: true, veins: 8, sheen: 0.6, clearcoat: 0.15 }, // menta
];

function leafPath(ctx: CanvasRenderingContext2D, W: number, H: number, k: LeafKind) {
  const cx = W / 2,
    hw = (W / 2) * k.w * 0.96;
  ctx.beginPath();
  ctx.moveTo(cx, H * 0.97);
  const steps = 48;
  const side = (dir: 1 | -1) => {
    for (let i = 0; i <= steps; i++) {
      const t = dir === 1 ? i / steps : 1 - i / steps;
      const y = H * 0.97 - t * H * 0.94;
      let w = Math.sin(Math.PI * Math.pow(t, 0.8)) * hw * (1 - 0.25 * t);
      if (k.serrated) w *= 1 - 0.06 * Math.abs(Math.sin(t * Math.PI * 14));
      ctx.lineTo(cx + dir * w, y);
    }
  };
  side(1);
  side(-1);
  ctx.closePath();
}

function leafTextures(k: LeafKind) {
  const W = 256,
    H = 512;
  const color = document.createElement('canvas');
  color.width = W;
  color.height = H;
  const c = color.getContext('2d')!;
  leafPath(c, W, H, k);
  const g = c.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0, k.base[0]);
  g.addColorStop(0.45, k.base[1]);
  g.addColorStop(1, k.base[2]);
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  // moteado natural
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(${Math.random() < 0.5 ? '20,60,20' : '170,210,120'},${rand(0.02, 0.07)})`;
    c.beginPath();
    c.arc(rand(0, W), rand(0, H), rand(1, 5), 0, Math.PI * 2);
    c.fill();
  }
  // brillo central y borde más oscuro
  const r = c.createRadialGradient(W * 0.45, H * 0.45, 10, W / 2, H / 2, H * 0.55);
  r.addColorStop(0, 'rgba(255,255,220,0.14)');
  r.addColorStop(1, 'rgba(0,30,0,0.25)');
  c.fillStyle = r;
  c.fillRect(0, 0, W, H);
  c.restore();

  // relieve: nervio central y secundarios (también se pintan, más claros)
  const bump = document.createElement('canvas');
  bump.width = W;
  bump.height = H;
  const b = bump.getContext('2d')!;
  b.fillStyle = '#808080';
  b.fillRect(0, 0, W, H);
  const veins = (ctx: CanvasRenderingContext2D, stroke: string, scale: number) => {
    ctx.save();
    leafPath(ctx, W, H, k);
    ctx.clip();
    ctx.strokeStyle = stroke;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(W / 2, H * 0.98);
    ctx.quadraticCurveTo(W / 2 + 4, H * 0.5, W / 2, H * 0.04);
    ctx.stroke();
    for (let i = 1; i <= k.veins; i++) {
      const y = H * 0.92 - (i / (k.veins + 1)) * H * 0.84;
      for (const dir of [1, -1]) {
        ctx.lineWidth = 3.2 * scale * (1 - i / (k.veins + 3));
        ctx.beginPath();
        ctx.moveTo(W / 2, y);
        ctx.quadraticCurveTo(W / 2 + dir * W * 0.2, y - H * 0.06, W / 2 + dir * W * 0.42, y - H * 0.13);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  veins(c, 'rgba(210,240,170,0.38)', 1);
  veins(b, '#c8c8c8', 1.3);
  // borde del relieve hacia abajo
  b.save();
  leafPath(b, W, H, k);
  b.lineWidth = 6;
  b.strokeStyle = '#5a5a5a';
  b.stroke();
  b.restore();

  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bumpMap = new THREE.CanvasTexture(bump);
  return { map, bumpMap };
}

function sliceTexture(kind: 'lemon' | 'cucumber') {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d')!;
  const R = S / 2,
    cx = R,
    cy = R;
  if (kind === 'lemon') {
    c.fillStyle = '#e9b50f';
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f7efcf';
    c.beginPath();
    c.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
    c.fill();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.04,
        a1 = ((i + 1) / n) * Math.PI * 2 - 0.04;
      const g = c.createRadialGradient(cx, cy, R * 0.08, cx, cy, R * 0.82);
      g.addColorStop(0, '#fbe68a');
      g.addColorStop(1, '#f4cc2c');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(cx + Math.cos((a0 + a1) / 2) * R * 0.1, cy + Math.sin((a0 + a1) / 2) * R * 0.1);
      c.arc(cx, cy, R * 0.82, a0, a1);
      c.closePath();
      c.fill();
      for (let j = 0; j < 40; j++) {
        // celdillas de pulpa
        const a = rand(a0, a1),
          rr = rand(R * 0.15, R * 0.78);
        c.fillStyle = `rgba(255,250,210,${rand(0.15, 0.4)})`;
        c.beginPath();
        c.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rand(3, 7), rand(8, 16), a, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = '#fbf3d8';
    c.beginPath();
    c.arc(cx, cy, R * 0.09, 0, Math.PI * 2);
    c.fill();
  } else {
    c.fillStyle = '#21451f';
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.92);
    g.addColorStop(0, '#dfeeb0');
    g.addColorStop(0.75, '#b7d77e');
    g.addColorStop(1, '#7fae4f');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(235,245,200,0.9)';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      for (let j = 0; j < 6; j++) {
        const rr = R * (0.18 + j * 0.05);
        c.beginPath();
        c.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 7, 12, a, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Geometrías ----------

function leafGeometry(k: LeafKind) {
  // Malla con la silueta real de la hoja (bordes limpios con antialiasing), no un plano recortado.
  const R = 28,
    C = 10,
    L = 1.55,
    W = 256,
    H = 512;
  const s = L / (H * 0.94); // unidades por píxel de la textura
  const hw = (W / 2) * k.w * 0.96;
  const cup = rand(0.25, 0.6),
    arch = rand(0.1, 0.35),
    twist = rand(-0.25, 0.25);
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= R; i++) {
    const t = i / R;
    const wpx = Math.max(Math.sin(Math.PI * Math.pow(t, 0.8)) * hw * (1 - 0.25 * t), 0.6);
    const y = -L / 2 + t * L;
    for (let j = 0; j <= C; j++) {
      const f = (j / C) * 2 - 1;
      const xpx = f * wpx;
      const x = xpx * s;
      pos.push(x, y, cup * x * x * 2.2 + arch * Math.sin(t * Math.PI) + twist * x * t);
      uv.push((W / 2 + xpx) / W, 0.03 + 0.94 * t);
    }
  }
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++) {
      const a = i * (C + 1) + j,
        b = a + C + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function tomatoGeometry() {
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const phi = Math.atan2(v.z, v.x);
    const top = Math.max(0, v.y);
    const k = 1 + 0.03 * Math.cos(phi * 5) * (1 - Math.abs(v.y)) - 0.12 * Math.pow(top, 6);
    p.setXYZ(i, v.x * k, v.y * 0.88 * k, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function calyxGeometry() {
  const s = new THREE.Shape();
  const n = 5;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 0.07 : 0.32;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

function strawberryGeometry() {
  const geo = new THREE.SphereGeometry(1, 48, 36);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // forma de corazón: ancha arriba, punta abajo, hombros redondeados
    const t = (v.y + 1) / 2;
    const w = 0.42 + 0.62 * Math.pow(t, 0.55) - 0.12 * Math.pow(t, 6);
    p.setXYZ(i, v.x * w, v.y * 1.05 - 0.08 * (1 - t), v.z * w);
  }
  geo.computeVertexNormals();
  return geo;
}

function strawberryTexture() {
  const W = 512,
    H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#9e0f14');
  g.addColorStop(0.35, '#d1222a');
  g.addColorStop(0.9, '#e2393a');
  g.addColorStop(1, '#f2a05a');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  for (let row = 1; row < 16; row++) {
    const y = (row / 16) * H;
    const n = Math.round(18 * Math.sin((row / 16) * Math.PI) + 6);
    for (let j = 0; j < n; j++) {
      const x = ((j + (row % 2) * 0.5) / n) * W;
      c.fillStyle = 'rgba(90,0,0,0.45)';
      c.beginPath();
      c.ellipse(x, y, 5, 6.5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#f3d36b';
      c.beginPath();
      c.ellipse(x, y - 0.5, 2.2, 3.4, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sepalGeometry() {
  // cáliz de fresa: 8 hojitas finas y algo levantadas
  const s = new THREE.Shape();
  const n = 8;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 0.1 : 0.5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ShapeGeometry(s, 4);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    p.setY(i, 0.18 * Math.hypot(x, z) - 0.04);
  }
  g.computeVertexNormals();
  return g;
}

function floretGeometry() {
  // copa de brócoli: icosfera con bultos de floretes
  const geo = new THREE.IcosahedronGeometry(1, 5);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const bumps = Array.from({ length: 22 }, () => new THREE.Vector3(rand(-1, 1), rand(0, 1), rand(-1, 1)).normalize());
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let k = 0;
    for (const b of bumps) k = Math.max(k, Math.pow(Math.max(0, v.dot(b)), 18));
    const fine = 0.035 * Math.sin(v.x * 40) * Math.sin(v.y * 37) * Math.sin(v.z * 43);
    const r = 1 + 0.16 * k + fine;
    p.setXYZ(i, v.x * r, Math.max(v.y, -0.25) * r * 0.85, v.z * r);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- Escena ----------

type Item = { obj: THREE.Object3D; vy: number; sway: number; swayF: number; phase: number; rot: THREE.Vector3; leaf: boolean; baseRot: THREE.Euler };

export default function FoodScene({ onFail, onReady }: { onFail?: () => void; onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onFail, onReady });
  useEffect(() => {
    cb.current = { onFail, onReady };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      cb.current.onFail?.();
      return;
    }
    let ready = false;
    const draw = () => {
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        cb.current.onReady?.();
      }
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dpr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    // niebla del color de la pizarra: lo cercano se ve nítido y vivo, lo lejano se funde
    scene.fog = new THREE.Fog(BOARD, 9, 21);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.85;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 0, 10);

    scene.add(new THREE.HemisphereLight(0xfff6e4, 0x1b3a26, 1.1));
    const key = new THREE.DirectionalLight(0xfff1d6, 3.0); // sol cálido desde arriba a la derecha
    key.position.set(5, 8, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbaf2d2, 2.4); // contraluz verdoso que recorta los bordes
    rim.position.set(-6, 2, -6);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe2b8, 0.6);
    fill.position.set(-3, -4, 8);
    scene.add(fill);

    const disposables: { dispose: () => void }[] = [env, pmrem];
    const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    const leafMats = LEAVES.flatMap((k) => {
      const { map, bumpMap } = leafTextures(k);
      track(map);
      track(bumpMap);
      return [0xffffff, 0xd2e2b4].map((tint) => track(
        new THREE.MeshPhysicalMaterial({
          map,
          bumpMap,
          bumpScale: 2.4,
          alphaTest: 0.5,
          alphaToCoverage: true,
          side: THREE.DoubleSide,
          roughness: 0.48,
          clearcoat: k.clearcoat,
          clearcoatRoughness: 0.3,
          sheen: k.sheen,
          sheenColor: new THREE.Color(0xd8f6b0),
          sheenRoughness: 0.45,
          // luz que atraviesa la hoja (falso subsurface): la textura brilla un poco por sí misma
          emissive: new THREE.Color(0xffffff),
          emissiveMap: map,
          emissiveIntensity: 0.09,
          color: tint,
        }),
      ));
    });
    const stemGeo = track(new THREE.CylinderGeometry(0.009, 0.015, 0.2, 6));
    stemGeo.translate(0, -0.775 - 0.08, 0);
    const stemMat = track(new THREE.MeshStandardMaterial({ color: 0x4f8a35, roughness: 0.6 }));

    const tomatoGeo = track(tomatoGeometry());
    const tomatoMat = track(new THREE.MeshPhysicalMaterial({ color: 0xd02a12, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04, emissive: 0x3a0500, emissiveIntensity: 0.3 }));
    const calyxGeo = track(calyxGeometry());
    const calyxMat = track(new THREE.MeshStandardMaterial({ color: 0x3f8a2c, roughness: 0.6, side: THREE.DoubleSide }));
    const berryGeo = track(new THREE.SphereGeometry(1, 32, 24));
    const berryMat = track(new THREE.MeshPhysicalMaterial({ color: 0x1c2452, roughness: 0.6, sheen: 0.7, sheenColor: new THREE.Color(0x7d8cc4), sheenRoughness: 0.6 }));
    const crownGeo = track(new THREE.TorusGeometry(0.28, 0.1, 10, 20));
    const crownMat = track(new THREE.MeshStandardMaterial({ color: 0x1a1f3b, roughness: 0.8 }));
    const lemonTex = track(sliceTexture('lemon'));
    const cucTex = track(sliceTexture('cucumber'));
    const lemonGeo = track(new THREE.CylinderGeometry(0.46, 0.46, 0.07, 64));
    const cucGeo = track(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 48));
    const juicy = (map: THREE.Texture) => track(new THREE.MeshPhysicalMaterial({ map, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.12 }));
    const lemonFace = juicy(lemonTex);
    const lemonMats = [track(new THREE.MeshPhysicalMaterial({ color: 0xf0bc12, roughness: 0.42, clearcoat: 0.6 })), lemonFace, lemonFace];
    const cucFace = juicy(cucTex);
    const cucMats = [track(new THREE.MeshPhysicalMaterial({ color: 0x24501f, roughness: 0.45, clearcoat: 0.4 })), cucFace, cucFace];
    const strawGeo = track(strawberryGeometry());
    const strawTex = track(strawberryTexture());
    const strawMat = track(new THREE.MeshPhysicalMaterial({ map: strawTex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x3a0004, emissiveIntensity: 0.35 }));
    const sepalGeo = track(sepalGeometry());
    const floretGeo = track(floretGeometry());
    const floretMat = track(new THREE.MeshStandardMaterial({ color: 0x2f7d2c, roughness: 0.85, emissive: 0x0b2a08, emissiveIntensity: 0.5 }));
    const broStemGeo = track(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 12));
    const broStemMat = track(new THREE.MeshStandardMaterial({ color: 0x9cc96b, roughness: 0.55 }));

    const items: Item[] = [];
    const spawn = (obj: THREE.Object3D, anywhere: boolean) => {
      const z = rand(-9, 2.2);
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - z);
      obj.position.set(rand(-halfH * camera.aspect * 1.1, halfH * camera.aspect * 1.1), anywhere ? rand(-halfH, halfH) : halfH + rand(0.5, 2), z);
    };
    const add = (obj: THREE.Object3D, leaf: boolean, speed: number) => {
      const it: Item = {
        obj,
        leaf,
        vy: -rand(0.18, 0.42) * speed,
        sway: rand(0.15, 0.5),
        swayF: rand(0.25, 0.6),
        phase: rand(0, Math.PI * 2),
        rot: new THREE.Vector3(rand(-0.4, 0.4), rand(-0.5, 0.5), rand(-0.4, 0.4)),
        baseRot: new THREE.Euler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)),
      };
      if (leaf) it.baseRot.set(rand(-0.5, 0.5), rand(-0.6, 0.6), rand(0, Math.PI * 2));
      obj.rotation.copy(it.baseRot);
      spawn(obj, true);
      scene.add(obj);
      items.push(it);
    };

    for (let i = 0; i < 28; i++) {
      const k = i % LEAVES.length;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(track(leafGeometry(LEAVES[k])), leafMats[k * 2 + (i % 2)]), new THREE.Mesh(stemGeo, stemMat));
      g.scale.setScalar(rand(0.85, 1.5));
      add(g, true, 1);
    }
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(tomatoGeo, tomatoMat);
      body.scale.setScalar(0.3);
      const cal = new THREE.Mesh(calyxGeo, calyxMat);
      cal.position.y = 0.255;
      cal.scale.setScalar(0.62);
      g.add(body, cal);
      g.scale.setScalar(rand(0.9, 1.25));
      add(g, false, 0.8);
    }
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(strawGeo, strawMat);
      body.scale.setScalar(0.26);
      const sep = new THREE.Mesh(sepalGeo, calyxMat);
      sep.position.y = 0.27;
      sep.scale.setScalar(0.5);
      g.add(body, sep);
      g.scale.setScalar(rand(0.95, 1.2));
      add(g, false, 0.85);
    }
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const top = new THREE.Mesh(floretGeo, floretMat);
      top.scale.setScalar(0.32);
      top.position.y = 0.18;
      const st = new THREE.Mesh(broStemGeo, broStemMat);
      st.position.y = -0.12;
      g.add(top, st);
      g.scale.setScalar(rand(0.9, 1.15));
      add(g, false, 0.7);
    }
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(berryGeo, berryMat);
      body.scale.set(0.15, 0.13, 0.15);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.scale.setScalar(0.15);
      crown.rotation.x = Math.PI / 2;
      crown.position.y = 0.125;
      g.add(body, crown);
      add(g, false, 0.9);
    }
    for (let i = 0; i < 3; i++) add(new THREE.Mesh(lemonGeo, lemonMats), false, 0.7);
    for (let i = 0; i < 3; i++) add(new THREE.Mesh(cucGeo, cucMats), false, 0.75);

    // Tamaño
    const resize = () => {
      const w = el.clientWidth || 1,
        h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Parallax suave con el dedo o el ratón
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / innerWidth - 0.5) * 0.9;
      target.y = (e.clientY / innerHeight - 0.5) * -0.6;
    };
    addEventListener('pointermove', onMove, { passive: true });

    let raf = 0,
      last = 0,
      t = 0,
      slow = 0,
      frames = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      t += dt;
      // En móviles modestos: si va lento, baja la resolución una vez (se nota poco y gana fluidez)
      if (dpr > 1 && frames < 90) {
        frames++;
        if (dt > 0.03) slow++;
        if (frames === 90 && slow > 45) {
          dpr = 1;
          renderer.setPixelRatio(1);
          resize();
        }
      }
      for (const it of items) {
        const o = it.obj;
        o.position.y += it.vy * dt;
        o.position.x += Math.sin(t * it.swayF + it.phase) * it.sway * dt;
        if (it.leaf) {
          // aleteo de hoja: balanceo alrededor de su eje más una rotación lenta
          // aleteo: se inclina adelante/atrás y a los lados, y gira despacio en su plano (casi siempre se ve de cara)
          o.rotation.x = it.baseRot.x + Math.sin(t * it.swayF * 1.6 + it.phase) * 0.5;
          o.rotation.y = it.baseRot.y + Math.cos(t * it.swayF * 1.2 + it.phase) * 0.55;
          it.baseRot.z += it.rot.z * dt * 0.5;
          o.rotation.z = it.baseRot.z;
        } else {
          o.rotation.x += it.rot.x * dt;
          o.rotation.y += it.rot.y * dt;
          o.rotation.z += it.rot.z * dt;
        }
        const halfH = Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - o.position.z);
        if (o.position.y < -halfH - 1.5) spawn(o, false);
      }
      camera.position.x += (target.x - camera.position.x) * 0.04;
      camera.position.y += (target.y - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -3);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    if (reduce) {
      camera.lookAt(0, 0, -3);
      draw();
    } else {
      start();
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}
