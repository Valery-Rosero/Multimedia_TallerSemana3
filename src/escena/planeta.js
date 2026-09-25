/**
 * VESPERIA · EL PLANETA DEL ALTAR
 * -------------------------------------------------------------
 * Entorno que rodea al altar de proyeccion:
 *
 *   TERRENO     llanura facetada generada con ruido fractal, que se
 *               alza en cordilleras a lo lejos; circulo ritual
 *               luminoso alrededor del altar.
 *   CIELO       cupula con shader propio (degradado, nebulosa
 *               animada), estrellas, auroras ondulantes, un gigante
 *               gaseoso con anillos y dos lunas.
 *   RELIQUIAS   siete monolitos que levitan y se encienden en
 *               cascada; islas de roca flotantes coronadas de cristal.
 *   VIDA        grupos de cristales semitransparentes, hongos
 *               bioluminiscentes, plantas-tentaculo que se mecen y
 *               esporas luminosas (shader propio).
 *   LA SONDA    una sonda humana estrellada: capto la señal y su
 *               antena gira hacia el holograma al sincronizar.
 *
 * Expone { grupo, update(t, dt, energia, pulso), ajustarEscala(alto) }.
 */
import * as THREE from 'three';
import { texturaGlifos, texturaCirculoRitual } from './glifos.js';

const CIAN = new THREE.Color(0x5ef2ff);
const VIOLETA = new THREE.Color(0xa56bff);
const ACIDO = new THREE.Color(0x9dff7a);
const ROSA = new THREE.Color(0xff6fd8);

/* ================================================================== */
/* 1. Ruido fractal para el terreno                                    */
/* ================================================================== */
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function ruido(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, octavas = 5) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octavas; i++) {
    s += amp * ruido(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}

const suave = THREE.MathUtils.smoothstep;

/** Altura del terreno en (x, z): plano junto al altar, cordilleras a lo lejos. */
export function alturaTerreno(x, z) {
  const r = Math.hypot(x, z);
  const ondulacion = (fbm(x * 0.05, z * 0.05) - 0.5) * 2.4 * suave(r, 9, 30);
  const montes = fbm(x * 0.016 + 7, z * 0.016 - 3) ** 2.2 * 70 * suave(r, 45, 120);
  return ondulacion + montes;
}

function malla(geo, mat, x = 0, y = 0, z = 0, sombra = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = sombra;
  m.receiveShadow = sombra;
  return m;
}

/** Textura de bandas para el gigante gaseoso. */
function texturaBandas() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 512; y++) {
    const b = Math.sin(y * 0.05) * 0.5 + Math.sin(y * 0.13 + 1) * 0.3 + Math.sin(y * 0.41) * 0.2;
    const l = 30 + b * 14 + (Math.random() - 0.5) * 4;
    ctx.fillStyle = `hsl(${285 + b * 30}, 45%, ${l}%)`;
    ctx.fillRect(0, y, 64, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Anillo del gigante gaseoso: circulos concentricos (mapeo plano). */
function texturaAnilloPlaneta() {
  const tam = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tam;
  const ctx = canvas.getContext('2d');
  const c = tam / 2;
  for (let r = c * 0.62; r < c; r += 1) {
    const u = (r - c * 0.62) / (c * 0.38);
    const a = (0.25 + 0.5 * Math.abs(Math.sin(u * 23)) * Math.sin(u * Math.PI)) * (Math.random() * 0.3 + 0.7);
    ctx.strokeStyle = `rgba(${210 + u * 40}, ${170 + u * 40}, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ================================================================== */
/* 2. Construccion del planeta                                         */
/* ================================================================== */
export function crearPlaneta() {
  const grupo = new THREE.Group();
  grupo.name = 'vesperia';

  /* ---- 2.1 Terreno facetado con color por altura ------------------ */
  const geoTerreno = new THREE.PlaneGeometry(320, 320, 170, 170);
  geoTerreno.rotateX(-Math.PI / 2);
  const pos = geoTerreno.attributes.position;
  const colores = new Float32Array(pos.count * 3);
  const bajo = new THREE.Color(0x231a33);
  const medio = new THREE.Color(0x3b2f52);
  const alto = new THREE.Color(0x5e7486);
  const _c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = alturaTerreno(x, z);
    pos.setY(i, h);
    const k = THREE.MathUtils.clamp(h / 30, 0, 1);
    _c.copy(bajo).lerp(medio, suave(h, -1.2, 1.5)).lerp(alto, k);
    _c.offsetHSL(0, 0, (hash(x, z) - 0.5) * 0.04);
    colores.set([_c.r, _c.g, _c.b], i * 3);
  }
  geoTerreno.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geoTerreno.computeVertexNormals();
  const terreno = new THREE.Mesh(geoTerreno, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0.08, flatShading: true,
  }));
  terreno.receiveShadow = true;
  grupo.add(terreno);

  // Circulo ritual que rodea el altar: se ilumina con la sincronia
  const matRitual = new THREE.MeshBasicMaterial({
    map: texturaCirculoRitual(1024), color: VIOLETA, transparent: true, opacity: 0.2,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const ritual = new THREE.Mesh(new THREE.CircleGeometry(13, 96), matRitual);
  ritual.rotation.x = -Math.PI / 2;
  ritual.position.y = 0.04;
  grupo.add(ritual);

  /* ---- 2.2 Cupula celeste (shader) --------------------------------- */
  const matCielo = new THREE.ShaderMaterial({
    uniforms: { uTiempo: { value: 0 }, uEnergia: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTiempo;
      uniform float uEnergia;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float s = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { s += a * ruido(p); p *= 2.02; a *= 0.5; }
        return s;
      }
      void main() {
        float h = vDir.y;
        vec3 cenit = vec3(0.012, 0.008, 0.035);
        vec3 horizonte = mix(vec3(0.16, 0.04, 0.2), vec3(0.3, 0.08, 0.28), uEnergia);
        vec3 col = mix(horizonte, cenit, pow(clamp(h, 0.0, 1.0), 0.45));
        // Nebulosa: dos capas de ruido fractal que derivan lentamente
        vec2 p = vDir.xz / (abs(vDir.y) + 0.35);
        float n1 = fbm(p * 1.3 + uTiempo * 0.004);
        float n2 = fbm(p * 2.6 - uTiempo * 0.006 + 4.0);
        float nube = smoothstep(0.45, 0.85, n1) * smoothstep(0.0, 0.25, h);
        col += nube * mix(vec3(0.22, 0.08, 0.36), vec3(0.05, 0.3, 0.38), n2) * (0.7 + uEnergia * 0.5);
        // Resplandor del horizonte al sincronizar
        col += vec3(0.35, 0.1, 0.4) * pow(1.0 - abs(h), 8.0) * (0.3 + uEnergia * 0.5);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(380, 48, 24), matCielo);
  cielo.renderOrder = -1;
  grupo.add(cielo);

  // Estrellas
  const TOTAL_ESTRELLAS = 1600;
  const posEstrellas = new Float32Array(TOTAL_ESTRELLAS * 3);
  for (let i = 0; i < TOTAL_ESTRELLAS; i++) {
    const v = new THREE.Vector3().randomDirection();
    v.y = Math.abs(v.y) * 0.95 + 0.05;
    v.normalize().multiplyScalar(360);
    posEstrellas.set([v.x, v.y, v.z], i * 3);
  }
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute('position', new THREE.BufferAttribute(posEstrellas, 3));
  const matEstrellas = new THREE.PointsMaterial({
    color: 0xe8e0ff, size: 1.4, transparent: true, opacity: 0.85, fog: false, depthWrite: false,
  });
  grupo.add(new THREE.Points(geoEstrellas, matEstrellas));

  // Gigante gaseoso con anillos
  const gigante = new THREE.Group();
  gigante.position.set(-150, 85, -240);
  gigante.rotation.z = 0.35;
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(48, 48, 32),
    new THREE.MeshBasicMaterial({ map: texturaBandas(), fog: false }));
  gigante.add(esfera);
  const anilloPlaneta = new THREE.Mesh(new THREE.RingGeometry(58, 94, 128),
    new THREE.MeshBasicMaterial({
      map: texturaAnilloPlaneta(), transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false,
    }));
  anilloPlaneta.rotation.x = Math.PI / 2 - 0.25;
  gigante.add(anilloPlaneta);
  grupo.add(gigante);

  // Dos lunas
  [[110, 120, -180, 9, 0xb9f3ff], [60, 60, -260, 5, 0xffc9f0]].forEach(([x, y, z, r, c]) => {
    grupo.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: c, fog: false })).translateX(x).translateY(y).translateZ(z));
  });

  // Auroras: cortinas ondulantes en el horizonte (shader)
  const matAurora = new THREE.ShaderMaterial({
    uniforms: { uTiempo: { value: 0 }, uEnergia: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uTiempo;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x * 0.025 + uTiempo * 0.25) * 18.0 + sin(p.x * 0.06 - uTiempo * 0.4) * 6.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTiempo;
      uniform float uEnergia;
      varying vec2 vUv;
      void main() {
        float rayos = 0.5 + 0.5 * sin(vUv.x * 90.0 + sin(vUv.x * 13.0 + uTiempo * 0.6) * 4.0);
        float vertical = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
        vec3 col = mix(vec3(0.3, 1.0, 0.6), vec3(0.8, 0.3, 1.0), vUv.y);
        float a = rayos * vertical * (0.08 + uEnergia * 0.4) * smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
  });
  [[0, 70, -210, 0], [180, 60, -40, -Math.PI / 2.3]].forEach(([x, y, z, ry]) => {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(320, 70, 160, 1), matAurora);
    a.position.set(x, y, z);
    a.rotation.y = ry;
    grupo.add(a);
  });

  /* ---- 2.3 Monolitos que levitan ----------------------------------- */
  const monolitos = [];
  const matMonolito = new THREE.MeshStandardMaterial({ color: 0x14111c, roughness: 0.35, metalness: 0.7 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const r = 19 + (i % 2) * 3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const suelo = alturaTerreno(x, z);
    const m = new THREE.Group();
    m.position.set(x, suelo + 5.4, z);
    m.lookAt(0, suelo + 5.4, 0);
    const bloque = malla(new THREE.BoxGeometry(1.8, 9, 0.9), matMonolito);
    m.add(bloque);
    // Columna de glifos en la cara que mira al altar
    const mat = new THREE.MeshBasicMaterial({
      map: texturaGlifos(1, 9, 64), color: i % 2 ? CIAN : VIOLETA, transparent: true, opacity: 0.05,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const glifos = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 8.2), mat);
    glifos.position.z = 0.46;
    m.add(glifos);
    grupo.add(m);
    // Almohadilla de energia en el suelo bajo el monolito
    const pad = malla(new THREE.CircleGeometry(1.6, 6), new THREE.MeshBasicMaterial({
      color: i % 2 ? CIAN : VIOLETA, transparent: true, opacity: 0.05, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }), x, suelo + 0.08, z, false);
    pad.rotation.x = -Math.PI / 2;
    grupo.add(pad);
    monolitos.push({ m, mat, pad, base: suelo + 5.4, fase: i * 0.9, umbral: 0.3 + i * 0.07 });
  }

  /* ---- 2.4 Islas de roca flotantes ---------------------------------- */
  const islas = [];
  const matRoca = new THREE.MeshStandardMaterial({ color: 0x3a3048, roughness: 0.95, flatShading: true });
  // Las islas se recortan contra el cielo: un leve brillo propio evita que se vean como siluetas negras
  const matRocaIsla = new THREE.MeshStandardMaterial({
    color: 0x5a4a72, emissive: 0x2a1446, emissiveIntensity: 0.6, roughness: 0.9, flatShading: true,
  });
  const matCristalIsla = new THREE.MeshStandardMaterial({
    color: 0x4b2d80, emissive: VIOLETA, emissiveIntensity: 0.4, roughness: 0.1, transparent: true, opacity: 0.8,
  });
  for (let i = 0; i < 6; i++) {
    const isla = new THREE.Group();
    const radioIsla = 1.8 + Math.random() * 1.4;
    const altoIsla = 3.5 + Math.random() * 2.5;
    const roca = malla(new THREE.ConeGeometry(radioIsla, altoIsla, 7, 2), matRocaIsla, 0, 0, 0);
    roca.rotation.x = Math.PI;
    isla.add(roca);
    // Cristal que cuelga de la punta inferior
    const colgante = malla(new THREE.OctahedronGeometry(0.45, 0), matCristalIsla, 0, -altoIsla / 2 - 0.5, 0, false);
    colgante.scale.set(0.6, 1.6, 0.6);
    isla.add(colgante);
    for (let k = 0; k < 4; k++) {
      const c = malla(new THREE.ConeGeometry(0.3, 1.2 + Math.random() * 1.4, 6), matCristalIsla,
        (Math.random() - 0.5) * radioIsla, altoIsla / 2, (Math.random() - 0.5) * radioIsla, false);
      c.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);
      isla.add(c);
    }
    grupo.add(isla);
    islas.push({
      isla, radio: 44 + Math.random() * 20, angulo: (i / 6) * Math.PI * 2,
      altura: 20 + Math.random() * 12, vel: 0.01 + Math.random() * 0.012, fase: Math.random() * 6,
    });
  }

  /* ---- 2.5 Grupos de cristales semitransparentes -------------------- */
  const matsCristal = [CIAN, VIOLETA, ACIDO, ROSA].map((c) => new THREE.MeshPhysicalMaterial({
    color: c.clone().multiplyScalar(0.5), emissive: c, emissiveIntensity: 0.25,
    roughness: 0.06, metalness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6,
  }));
  const geoPrisma = new THREE.CylinderGeometry(0, 0.5, 1, 6);
  geoPrisma.translate(0, 0.5, 0);
  for (let i = 0; i < 11; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 9.5 + Math.random() * 24;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const g = new THREE.Group();
    g.position.set(x, alturaTerreno(x, z) - 0.2, z);
    const mat = matsCristal[i % matsCristal.length];
    const n = 4 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      const c = malla(geoPrisma, mat, (Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6);
      c.scale.set(0.6 + Math.random() * 0.7, 1.2 + Math.random() * 3.2, 0.6 + Math.random() * 0.7);
      c.rotation.set((Math.random() - 0.5) * 0.9, Math.random() * 3, (Math.random() - 0.5) * 0.9);
      g.add(c);
    }
    grupo.add(g);
  }

  /* ---- 2.6 Rocas dispersas (instanciadas) --------------------------- */
  const TOTAL_ROCAS = 180;
  const rocas = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), matRoca, TOTAL_ROCAS);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < TOTAL_ROCAS; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 70;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const s = 0.2 + Math.random() ** 3 * 2.4;
    dummy.position.set(x, alturaTerreno(x, z) + s * 0.3, z);
    dummy.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    dummy.scale.set(s, s * (0.5 + Math.random() * 0.6), s);
    dummy.updateMatrix();
    rocas.setMatrixAt(i, dummy.matrix);
  }
  rocas.castShadow = true;
  rocas.receiveShadow = true;
  grupo.add(rocas);

  /* ---- 2.7 Hongos bioluminiscentes ---------------------------------- */
  const matsSombrero = [CIAN, ROSA, ACIDO].map((c) => new THREE.MeshStandardMaterial({
    color: c.clone().multiplyScalar(0.25), emissive: c, emissiveIntensity: 0.3, roughness: 0.6,
  }));
  const matPie = new THREE.MeshStandardMaterial({ color: 0xcfc6e6, roughness: 0.8 });
  const geoSombrero = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  geoSombrero.scale(1, 0.55, 1);
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 7.5 + Math.random() * 12;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Evita los alrededores inmediatos de la sonda
    if (Math.hypot(x - 10, z - 6) < 3) continue;
    const s = 0.25 + Math.random() * 0.6;
    const h = alturaTerreno(x, z);
    const hongo = new THREE.Group();
    hongo.position.set(x, h, z);
    hongo.scale.setScalar(s);
    hongo.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
    hongo.add(malla(new THREE.CylinderGeometry(0.18, 0.28, 1.8, 8), matPie, 0, 0.9, 0));
    hongo.add(malla(geoSombrero, matsSombrero[i % 3], 0, 1.75, 0));
    grupo.add(hongo);
  }

  /* ---- 2.8 Plantas-tentaculo que se mecen -------------------------- */
  const tentaculos = [];
  const matTentaculo = new THREE.MeshStandardMaterial({ color: 0x3a2350, roughness: 0.6, metalness: 0.1 });
  const matPunta = new THREE.MeshBasicMaterial({ color: ACIDO, toneMapped: false });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.5;
    const r = 11 + Math.random() * 6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const planta = new THREE.Group();
    planta.position.set(x, alturaTerreno(x, z), z);
    grupo.add(planta);
    const brazos = 3 + Math.floor(Math.random() * 2);
    for (let b = 0; b < brazos; b++) {
      // Cadena de segmentos: cada uno cuelga del anterior
      let eslabon = new THREE.Group();
      eslabon.rotation.set((Math.random() - 0.5) * 0.8, (b / brazos) * Math.PI * 2, 0.25);
      planta.add(eslabon);
      const cadena = [];
      const segs = 7;
      for (let k = 0; k < segs; k++) {
        const radio = 0.2 * (1 - k / segs) + 0.04;
        eslabon.add(malla(new THREE.CylinderGeometry(radio * 0.8, radio, 0.55, 7), matTentaculo, 0, 0.27, 0));
        const siguiente = new THREE.Group();
        siguiente.position.y = 0.52;
        eslabon.add(siguiente);
        cadena.push(eslabon);
        eslabon = siguiente;
      }
      eslabon.add(malla(new THREE.SphereGeometry(0.11, 8, 6), matPunta, 0, 0.05, 0, false));
      tentaculos.push({ cadena, fase: Math.random() * 6, amp: 0.1 + Math.random() * 0.08 });
    }
  }

  /* ---- 2.9 La sonda humana estrellada ------------------------------- */
  // Llego a Vesperia buscando señales de vida. Aun transmite lo que capta.
  const sonda = new THREE.Group();
  sonda.position.set(10, alturaTerreno(10, 6) + 0.3, 6);
  sonda.rotation.set(0.18, -0.9, 0.22);
  const matSonda = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.45, metalness: 0.6 });
  const matOro = new THREE.MeshStandardMaterial({ color: 0xc9a13a, roughness: 0.3, metalness: 0.95 });
  const matPanel = new THREE.MeshStandardMaterial({ color: 0x1b2a55, roughness: 0.25, metalness: 0.6 });
  sonda.add(malla(new THREE.BoxGeometry(1.6, 1.2, 1.6), matOro, 0, 0.6, 0));
  sonda.add(malla(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 12), matSonda, 0, 1.45, 0));
  // Paneles solares: uno roto y clavado en el suelo
  sonda.add(malla(new THREE.BoxGeometry(3.2, 0.06, 1.2), matPanel, -2.4, 0.9, 0).rotateZ(0.12));
  const panelRoto = malla(new THREE.BoxGeometry(2.2, 0.06, 1.2), matPanel, 2.1, 0.35, 0.3);
  panelRoto.rotation.set(0.3, 0.2, -0.55);
  sonda.add(panelRoto);
  // Antena parabolica orientable
  const antena = new THREE.Group();
  antena.position.set(0, 1.75, 0);
  sonda.add(antena);
  antena.add(malla(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), matSonda, 0, 0.3, 0));
  const plato = new THREE.Group();
  plato.position.y = 0.65;
  antena.add(plato);
  const disco = malla(new THREE.SphereGeometry(0.95, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), matSonda);
  disco.material = matSonda.clone();
  disco.material.side = THREE.DoubleSide;
  disco.rotation.x = -Math.PI / 2; // la concavidad mira hacia +Z local
  disco.position.z = 0.55;
  plato.add(disco);
  plato.add(malla(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), matSonda, 0, 0, 0.45).rotateX(Math.PI / 2));
  const luzBaliza = malla(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }), 0.6, 1.3, 0.6, false);
  sonda.add(luzBaliza);
  grupo.add(sonda);

  // Orientaciones de la antena: dormida (caida hacia el cielo) y apuntando al holograma
  plato.rotation.set(-1.1, 0.4, 0);
  const qDormida = plato.quaternion.clone();
  grupo.updateMatrixWorld(true);
  const objetivoMundo = new THREE.Vector3(0, 6, 0);
  const objetivoLocal = antena.worldToLocal(objetivoMundo.clone()).sub(plato.position).normalize();
  const qAlineada = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), objetivoLocal);

  /* ---- 2.10 Esporas luminosas (shader propio) ------------------------ */
  const TOTAL_ESPORAS = 320;
  const posEsporas = new Float32Array(TOTAL_ESPORAS * 3);
  const faseEsporas = new Float32Array(TOTAL_ESPORAS);
  for (let i = 0; i < TOTAL_ESPORAS; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 34;
    posEsporas.set([Math.cos(a) * r, 0.5 + Math.random() * 12, Math.sin(a) * r], i * 3);
    faseEsporas[i] = Math.random();
  }
  const geoEsporas = new THREE.BufferGeometry();
  geoEsporas.setAttribute('position', new THREE.BufferAttribute(posEsporas, 3));
  geoEsporas.setAttribute('fase', new THREE.BufferAttribute(faseEsporas, 1));
  const matEsporas = new THREE.ShaderMaterial({
    uniforms: {
      uTiempo: { value: 0 }, uEnergia: { value: 0 }, uEscala: { value: 400 },
      uColorA: { value: ACIDO.clone() }, uColorB: { value: CIAN.clone() },
    },
    vertexShader: /* glsl */`
      attribute float fase;
      uniform float uTiempo;
      uniform float uEnergia;
      uniform float uEscala;
      varying float vBrillo;
      varying float vFase;
      void main() {
        vec3 p = position;
        float f = fase * 6.2831;
        // Ascienden lentamente y vuelven a empezar, con deriva lateral
        p.y = mod(p.y + uTiempo * (0.2 + fase * 0.3) * (1.0 + uEnergia), 13.0) + 0.3;
        p.x += sin(uTiempo * 0.3 + f * 3.0) * 1.1;
        p.z += cos(uTiempo * 0.27 + f * 2.0) * 1.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float destello = pow(0.5 + 0.5 * sin(uTiempo * (1.2 + fase) + f), 3.0);
        vBrillo = (0.18 + uEnergia * 0.82) * (0.25 + 0.75 * destello);
        vFase = fase;
        gl_PointSize = 0.16 * uEscala * (0.7 + destello * 0.5) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vBrillo;
      varying float vFase;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float halo = smoothstep(0.5, 0.0, d);
        float nucleo = smoothstep(0.15, 0.0, d);
        vec3 col = mix(uColorA, uColorB, step(0.5, vFase));
        gl_FragColor = vec4(col * (halo * 0.7 + nucleo * 1.5) * vBrillo, halo * vBrillo);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const esporas = new THREE.Points(geoEsporas, matEsporas);
  esporas.frustumCulled = false;
  grupo.add(esporas);

  /* ================================================================ */
  /* 3. Animacion del entorno                                          */
  /* ================================================================ */
  function update(t, dt, energia, pulso = 0) {
    // Cielo y auroras
    matCielo.uniforms.uTiempo.value = t;
    matCielo.uniforms.uEnergia.value = energia;
    matAurora.uniforms.uTiempo.value = t;
    matAurora.uniforms.uEnergia.value = energia + pulso * 0.3;
    esfera.rotation.y += dt * 0.01;
    matEstrellas.opacity = 0.85 - energia * 0.25;

    // Circulo ritual
    ritual.rotation.z -= dt * (0.01 + energia * 0.06);
    matRitual.opacity = 0.12 + energia * (0.5 + pulso * 0.3);

    // Monolitos: levitan y se encienden en cascada
    monolitos.forEach((m) => {
      const activo = suave(energia, m.umbral, m.umbral + 0.15);
      m.m.position.y = m.base + Math.sin(t * 0.6 + m.fase) * 0.35 + activo * 0.8;
      m.mat.opacity = 0.05 + activo * (0.8 + Math.sin(t * 3 + m.fase) * 0.1 + pulso * 0.3);
      m.pad.material.opacity = 0.05 + activo * 0.45;
    });

    // Islas flotantes: orbitan muy despacio alrededor del altar
    islas.forEach((i) => {
      i.angulo += dt * i.vel;
      i.isla.position.set(Math.cos(i.angulo) * i.radio, i.altura + Math.sin(t * 0.3 + i.fase) * 0.8, Math.sin(i.angulo) * i.radio);
      i.isla.rotation.y += dt * 0.05;
    });
    matCristalIsla.emissiveIntensity = 0.3 + energia * 1.2;

    // Cristales, hongos y puntas de los tentaculos laten con el audio
    matsCristal.forEach((m, i) => { m.emissiveIntensity = 0.2 + energia * (0.8 + pulso * 1.4) + Math.sin(t * 1.3 + i) * 0.08; });
    matsSombrero.forEach((m, i) => { m.emissiveIntensity = 0.25 + energia * (0.9 + Math.sin(t * 2 + i * 2) * 0.2) + pulso * 0.5; });
    matPunta.color.copy(ACIDO).multiplyScalar(0.4 + energia * 0.9 + pulso * 0.6);

    // Tentaculos: onda que recorre cada cadena de segmentos
    tentaculos.forEach(({ cadena, fase, amp }) => {
      for (let k = 1; k < cadena.length; k++) {
        cadena[k].rotation.x = Math.sin(t * 1.1 + fase + k * 0.6) * amp * (1 + energia);
        cadena[k].rotation.z = Math.cos(t * 0.9 + fase + k * 0.5) * amp * 0.7;
      }
    });

    // Sonda: la antena se orienta hacia la transmision
    plato.quaternion.slerpQuaternions(qDormida, qAlineada, suave(energia, 0.1, 0.6));
    const alineada = energia > 0.5;
    luzBaliza.material.color.set(alineada ? 0x5dff8a : 0xff3b3b);
    luzBaliza.visible = (t * (alineada ? 3 : 1.2)) % 1 < 0.5;

    // Esporas
    matEsporas.uniforms.uTiempo.value = t;
    matEsporas.uniforms.uEnergia.value = energia;
  }

  /** El tamaño de las esporas depende del alto del lienzo en pixeles. */
  function ajustarEscala(altoPx) {
    matEsporas.uniforms.uEscala.value = altoPx / 2;
  }

  return { grupo, update, ajustarEscala };
}
