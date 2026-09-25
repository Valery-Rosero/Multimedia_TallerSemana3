/**
 * EL ALTAR DE PROYECCION DE VESPERIA
 * -------------------------------------------------------------
 * La plataforma alienigena que guarda la transmision:
 *
 *   ALTAR        base escalonada de obsidiana con filos luminosos,
 *                corona de glifos giratoria y tres pilones curvos
 *                que apuntan laseres al holograma.
 *   EMISOR       cristal central del que nace un haz conico
 *                semitransparente (shader propio con fresnel).
 *   HOLOGRAMA    el VIDEO, proyectado con un shader que simula una
 *                señal alienigena: se materializa desde el ruido,
 *                lineas de barrido, aberracion cromatica y fallos de
 *                señal. Dos "ecos" desfasados le dan profundidad.
 *   GIROSCOPIO   tres anillos ANIDADOS: cada uno gira sobre un eje
 *                distinto y hereda el giro del anterior, asi que la
 *                rotacion resultante es compuesta (como un astrolabio).
 *   CRISTALES    fragmentos semitransparentes en orbitas inclinadas
 *                que se ordenan en formacion al sincronizar.
 *   PARTICULAS   motas que ascienden en espiral por el haz.
 *
 * `energia` (0 -> 1) es la sincronia con la señal; `pulso` (0 -> 1)
 * llega del analizador de audio y hace latir todo al ritmo real.
 */
import * as THREE from 'three';
import { texturaGlifos, texturaCirculoRitual } from './glifos.js';

export const ALTURA_HOLOGRAMA = 6;
const CIAN = new THREE.Color(0x5ef2ff);
const VIOLETA = new THREE.Color(0xa56bff);
const ACIDO = new THREE.Color(0x9dff7a);

/* ---- Utilidades GLSL compartidas por los shaders ------------------ */
const GLSL_RUIDO = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`;

function malla(geo, mat, x = 0, y = 0, z = 0, sombra = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = sombra;
  m.receiveShadow = sombra;
  return m;
}

/** Cilindro que va exactamente del punto A al punto B. */
function barraEntre(a, b, radio, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, 1, 6, 1, true), mat);
  barra.position.copy(a).addScaledVector(dir, 0.5);
  barra.scale.y = dir.length();
  barra.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return barra;
}

/* Materiales del altar */
const M = {
  obsidiana: new THREE.MeshStandardMaterial({ color: 0x16121f, roughness: 0.28, metalness: 0.85 }),
  obsidianaClara: new THREE.MeshStandardMaterial({ color: 0x2a2440, roughness: 0.35, metalness: 0.8 }),
  filo: new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: CIAN, emissiveIntensity: 0.3 }),
  filoVioleta: new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: VIOLETA, emissiveIntensity: 0.3 }),
};

/**
 * @param {THREE.Texture} texturaVideo la transmision que proyecta el altar
 */
export function crearHolograma(texturaVideo) {
  const grupo = new THREE.Group();
  grupo.name = 'altar';

  /* ================================================================ */
  /* 1. Altar escalonado                                               */
  /* ================================================================ */
  // Tres gradas (octogonal, redonda con glifos, octogonal) con filos luminosos
  const gradas = [[6.2, 0.55, 8], [5.0, 0.5, 48], [3.7, 0.5, 8]];
  let y = 0;
  gradas.forEach(([r, alto, lados], i) => {
    const g = malla(new THREE.CylinderGeometry(r, r + 0.25, alto, lados), i === 1 ? M.obsidianaClara : M.obsidiana, 0, y + alto / 2, 0);
    g.rotation.y = Math.PI / 8;
    grupo.add(g);
    const filo = malla(new THREE.TorusGeometry(r + 0.02, 0.035, 4, lados), i % 2 ? M.filoVioleta : M.filo, 0, y + alto, 0, false);
    filo.rotation.set(Math.PI / 2, 0, Math.PI / 8);
    grupo.add(filo);
    y += alto;
  });
  const CIMA = y; // 1.55

  // Corona de glifos que gira sobre la grada superior
  const matCorona = new THREE.MeshBasicMaterial({
    map: texturaCirculoRitual(1024), color: CIAN, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const corona = new THREE.Mesh(new THREE.CircleGeometry(3.6, 64), matCorona);
  corona.rotation.x = -Math.PI / 2;
  corona.position.y = CIMA + 0.02;
  grupo.add(corona);

  // Glifos grabados en el canto de la grada central (se iluminan con la energia)
  const texCanto = texturaGlifos(48, 1, 64);
  texCanto.repeat.set(1, 1);
  const matCanto = new THREE.MeshStandardMaterial({
    color: 0x0a0812, emissive: VIOLETA, emissiveMap: texCanto, emissiveIntensity: 0.2,
    roughness: 0.4, metalness: 0.6,
  });
  const canto = malla(new THREE.CylinderGeometry(5.02, 5.27, 0.3, 48, 1, true), matCanto, 0, 0.55 + 0.25, 0, false);
  grupo.add(canto);

  /* ================================================================ */
  /* 2. Pilones curvos con laseres                                     */
  /* ================================================================ */
  const pilones = [];
  const matLaser = new THREE.MeshBasicMaterial({
    color: CIAN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false,
  });
  const matPuntaPilon = new THREE.MeshStandardMaterial({
    color: 0x0c1418, emissive: CIAN, emissiveIntensity: 0.4, roughness: 0.1,
    transparent: true, opacity: 0.85,
  });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    // Curva como una garra: sale hacia fuera y se cierra sobre el holograma
    const curva = new THREE.CatmullRomCurve3([
      dir.clone().multiplyScalar(4.6).setY(CIMA - 0.3),
      dir.clone().multiplyScalar(5.3).setY(CIMA + 1.4),
      dir.clone().multiplyScalar(5.0).setY(CIMA + 3.2),
      dir.clone().multiplyScalar(4.0).setY(CIMA + 4.4),
    ]);
    const tubo = malla(new THREE.TubeGeometry(curva, 30, 0.22, 8, false), M.obsidianaClara);
    grupo.add(tubo);
    // Vertebras luminosas a lo largo del pilon
    for (let k = 1; k < 6; k++) {
      const anillo = malla(new THREE.TorusGeometry(0.27, 0.04, 6, 16), M.filo, 0, 0, 0, false);
      anillo.position.copy(curva.getPointAt(k / 6));
      anillo.lookAt(anillo.position.clone().add(curva.getTangentAt(k / 6)));
      grupo.add(anillo);
    }
    const extremo = curva.getPointAt(1);
    const punta = malla(new THREE.OctahedronGeometry(0.42, 0), matPuntaPilon, extremo.x, extremo.y, extremo.z, false);
    punta.scale.set(0.7, 1.4, 0.7);
    grupo.add(punta);
    // Laser hacia una esquina del holograma
    const destino = new THREE.Vector3(Math.cos(a) * 1.4, ALTURA_HOLOGRAMA + (i - 1) * 1.1, Math.sin(a) * 0.6);
    const laser = barraEntre(extremo, destino, 0.025, matLaser);
    grupo.add(laser);
    pilones.push({ punta, fase: i * 2.1 });
  }

  /* ================================================================ */
  /* 3. Emisor y haz de luz                                            */
  /* ================================================================ */
  const matEmisor = new THREE.MeshPhysicalMaterial({
    color: 0x88f6ff, emissive: CIAN, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0,
    transparent: true, opacity: 0.8, clearcoat: 1,
  });
  const emisor = malla(new THREE.OctahedronGeometry(0.75, 0), matEmisor, 0, CIMA + 0.9, 0, false);
  emisor.scale.set(1, 1.5, 1);
  grupo.add(emisor);
  // Engaste del emisor
  const engaste = malla(new THREE.CylinderGeometry(1.1, 1.5, 0.4, 8), M.obsidianaClara, 0, CIMA + 0.2, 0);
  grupo.add(engaste);
  grupo.add(malla(new THREE.TorusGeometry(1.15, 0.05, 4, 8), M.filo, 0, CIMA + 0.42, 0, false).rotateX(Math.PI / 2));

  // Haz conico: se ensancha desde el emisor hasta el holograma
  const altoHaz = ALTURA_HOLOGRAMA - (CIMA + 0.9) + 2.4;
  const matHaz = new THREE.ShaderMaterial({
    uniforms: {
      uTiempo: { value: 0 }, uEnergia: { value: 0 }, uPulso: { value: 0 },
      uColor: { value: CIAN.clone() },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying float vFresnel;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFresnel = pow(1.0 - abs(dot(n, normalize(-mv.xyz))), 1.6);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTiempo;
      uniform float uEnergia;
      uniform float uPulso;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vFresnel;
      void main() {
        // Franjas que suben por el haz y se desvanecen en la punta
        float franjas = 0.55 + 0.45 * sin(vUv.y * 46.0 - uTiempo * 7.0);
        float vertical = smoothstep(1.0, 0.55, vUv.y) * smoothstep(0.0, 0.08, vUv.y);
        float a = vertical * (0.1 + vFresnel * 0.9) * franjas * (0.08 + uEnergia * 0.55 + uPulso * 0.25);
        gl_FragColor = vec4(uColor * (1.0 + uPulso), a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 0.35, altoHaz, 48, 1, true), matHaz);
  haz.position.y = CIMA + 0.9 + altoHaz / 2;
  grupo.add(haz);

  /* ================================================================ */
  /* 4. El holograma: la transmision                                   */
  /* ================================================================ */
  const soporteHolo = new THREE.Group(); // se balancea y oscila
  soporteHolo.position.y = ALTURA_HOLOGRAMA;
  grupo.add(soporteHolo);

  const uniformesHolo = {
    uMapa: { value: texturaVideo },
    uTiempo: { value: 0 },
    uEnergia: { value: 0 },
    uPulso: { value: 0 },
    uGlitch: { value: 0 },
    uOpacidad: { value: 1 },
    uTinte: { value: CIAN.clone() },
  };
  const shaderHolo = {
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapa;
      uniform float uTiempo;
      uniform float uEnergia;
      uniform float uPulso;
      uniform float uGlitch;
      uniform float uOpacidad;
      uniform vec3 uTinte;
      varying vec2 vUv;
      ${GLSL_RUIDO}
      void main() {
        vec2 uv = vUv;
        float inestable = 1.0 - uEnergia;

        // Fallos de señal: bandas horizontales que se desplazan de golpe
        float fila = floor(uv.y * 28.0);
        float golpe = step(0.9 - uGlitch * 0.35 - inestable * 0.12, hash(vec2(fila, floor(uTiempo * 14.0))));
        uv.x += golpe * (hash(vec2(fila, floor(uTiempo * 31.0))) - 0.5) * 0.09 * (uGlitch + inestable + 0.15);

        // Aberracion cromatica: cada canal se lee con un desfase
        float ab = 0.003 + inestable * 0.014 + uPulso * 0.006 + uGlitch * 0.01;
        vec3 col = vec3(
          texture2D(uMapa, uv + vec2(ab, 0.0)).r,
          texture2D(uMapa, uv).g,
          texture2D(uMapa, uv - vec2(ab, 0.0)).b
        );

        // Tinte holografico que respeta la luminancia del video
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, uTinte * (lum * 1.5 + 0.08), 0.3);

        // Lineas de barrido + franja brillante que recorre la imagen
        col *= 0.8 + 0.2 * sin(uv.y * 520.0 - uTiempo * 9.0);
        col += uTinte * exp(-pow((fract(uTiempo * 0.16) - uv.y) * 12.0, 2.0)) * 0.35;

        // Materializacion: el ruido "come" la imagen cuando falta energia
        float n = ruido(uv * 42.0 + vec2(0.0, uTiempo * 0.6));
        float nitido = smoothstep(n - 0.1, n + 0.1, uEnergia * 1.15 - 0.08);
        vec3 estatica = uTinte * (0.25 + hash(uv * 900.0 + uTiempo) * 0.6);
        col = mix(estatica, col, nitido);

        // Bordes que se disuelven y parpadeo de proyector
        vec2 d = abs(uv - 0.5) * 2.0;
        float borde = 1.0 - smoothstep(0.84, 1.0, max(d.x, d.y));
        float parpadeo = 0.93 + 0.07 * sin(uTiempo * 61.0) * sin(uTiempo * 7.3);
        float alfa = borde * parpadeo * mix(0.28, 0.95, nitido) * (0.35 + 0.65 * uEnergia) * uOpacidad;

        gl_FragColor = vec4(col * (0.75 + uEnergia * 0.45 + uPulso * 0.35), alfa);
        #include <colorspace_fragment>
      }`,
  };
  const matHolo = new THREE.ShaderMaterial({
    uniforms: uniformesHolo, ...shaderHolo,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matHolo);
  pantalla.scale.set(4.2, 4.2, 1);
  pantalla.renderOrder = 3;
  soporteHolo.add(pantalla);

  // Dos ecos: copias desfasadas, mas tenues, que dan volumen al holograma
  const ecos = [-0.35, 0.35].map((z, i) => {
    const mat = new THREE.ShaderMaterial({
      // Comparte los uniformes del holograma (misma señal) salvo opacidad y tinte
      uniforms: { ...uniformesHolo, uOpacidad: { value: 0.22 }, uTinte: { value: (i ? VIOLETA : CIAN).clone() } },
      ...shaderHolo,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    const eco = new THREE.Mesh(pantalla.geometry, mat);
    eco.position.z = z;
    eco.renderOrder = 2;
    soporteHolo.add(eco);
    return eco;
  });

  // Marco de esquinas que encuadra la transmision
  const matMarco = new THREE.LineBasicMaterial({ color: CIAN, transparent: true, opacity: 0.5, toneMapped: false });
  const marco = new THREE.Group();
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
    const p = [new THREE.Vector3(sx * 0.5, sy * 0.36, 0), new THREE.Vector3(sx * 0.5, sy * 0.5, 0), new THREE.Vector3(sx * 0.36, sy * 0.5, 0)];
    marco.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), matMarco));
  });
  marco.scale.copy(pantalla.scale).multiplyScalar(1.06);
  soporteHolo.add(marco);

  /** Encaja el video (ancho x alto) en el holograma sin deformarlo. */
  function ajustarPantalla(anchoVideo, altoVideo) {
    if (!anchoVideo || !altoVideo) return;
    const LADO = 4.4;
    const aspecto = anchoVideo / altoVideo;
    const ancho = aspecto >= 1 ? LADO : LADO * aspecto;
    pantalla.scale.set(ancho, ancho / aspecto, 1);
    marco.scale.set(ancho * 1.06, (ancho / aspecto) * 1.06, 1);
  }

  // Cinta de datos: cilindro de glifos que envuelve el holograma
  const texCinta = texturaGlifos(64, 2, 48, { marco: true });
  const matCinta = new THREE.MeshBasicMaterial({
    map: texCinta, color: ACIDO, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const cinta = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.55, 64, 1, true), matCinta);
  cinta.position.y = ALTURA_HOLOGRAMA - 2.75;
  grupo.add(cinta);

  // Luz de la transmision: tiñe el altar y el suelo (sin sombra, por rendimiento)
  const luzHolo = new THREE.PointLight(CIAN, 0, 26, 2);
  luzHolo.position.y = ALTURA_HOLOGRAMA;
  grupo.add(luzHolo);

  // Punto exacto del sonido espacial: el centro del holograma
  const focoAudio = new THREE.Object3D();
  soporteHolo.add(focoAudio);

  /* ================================================================ */
  /* 5. Giroscopio de anillos anidados (rotaciones compuestas)         */
  /* ================================================================ */
  const giroscopio = new THREE.Group();
  giroscopio.position.y = ALTURA_HOLOGRAMA;
  grupo.add(giroscopio);

  const anillos = [];
  let padre = giroscopio;
  [[4.9, CIAN, 'x'], [4.35, VIOLETA, 'y'], [3.85, ACIDO, 'z']].forEach(([radio, color, eje], i) => {
    const eslabon = new THREE.Group(); // cada eslabon hereda el giro del anterior
    padre.add(eslabon);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x1d1830, emissive: color, emissiveIntensity: 0.15, roughness: 0.25, metalness: 0.7,
      transparent: true, opacity: 0.78,
    });
    const aro = malla(new THREE.TorusGeometry(radio, 0.07, 8, 96), mat, 0, 0, 0, false);
    eslabon.add(aro);
    // Nodos y marcas a lo largo del aro
    const matNodo = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const nodo = malla(k % 2 ? new THREE.SphereGeometry(0.13, 10, 8) : new THREE.BoxGeometry(0.34, 0.12, 0.12),
        matNodo, Math.cos(a) * radio, Math.sin(a) * radio, 0, false);
      nodo.rotation.z = a;
      eslabon.add(nodo);
    }
    eslabon.rotation.set(i * 0.7, i * 0.4, i * 1.1);
    anillos.push({ eslabon, mat, eje, vel: 0.35 + i * 0.22, signo: i % 2 ? -1 : 1 });
    padre = eslabon;
  });

  /* ================================================================ */
  /* 6. Cristales en orbita                                            */
  /* ================================================================ */
  const matsCristal = [CIAN, VIOLETA, ACIDO].map((c) => new THREE.MeshPhysicalMaterial({
    color: c.clone().multiplyScalar(0.6), emissive: c, emissiveIntensity: 0.25,
    roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55,
  }));
  const geoCristal = new THREE.OctahedronGeometry(0.45, 0);
  geoCristal.scale(0.55, 1.5, 0.55);
  const cristales = [];
  for (let i = 0; i < 16; i++) {
    const m = malla(geoCristal, matsCristal[i % 3], 0, 0, 0, true);
    m.scale.setScalar(0.6 + Math.random() * 0.8);
    grupo.add(m);
    // Cada orbita tiene su propia inclinacion (cuaternion) y velocidad
    const inclinacion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      (Math.random() - 0.5) * 1.2, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 1.2,
    ));
    cristales.push({
      m, inclinacion,
      radioLibre: 6 + Math.random() * 2.8,
      fase: (i / 16) * Math.PI * 2,
      vel: (0.18 + Math.random() * 0.25) * (i % 2 ? 1 : -1),
      giro: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(1.5),
    });
  }
  // Formacion ordenada: al sincronizar, todos convergen a una corona horizontal
  const inclinacionFormacion = new THREE.Quaternion();

  /* ================================================================ */
  /* 7. Particulas que ascienden por el haz                            */
  /* ================================================================ */
  const TOTAL_MOTAS = 260;
  const posMotas = new Float32Array(TOTAL_MOTAS * 3);
  const datosMotas = [];
  for (let i = 0; i < TOTAL_MOTAS; i++) {
    datosMotas.push({ h: Math.random(), a: Math.random() * Math.PI * 2, v: 0.12 + Math.random() * 0.25 });
  }
  const geoMotas = new THREE.BufferGeometry();
  geoMotas.setAttribute('position', new THREE.BufferAttribute(posMotas, 3));
  const matMotas = new THREE.PointsMaterial({
    color: 0xbffaff, size: 0.07, transparent: true, opacity: 0.3,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const motas = new THREE.Points(geoMotas, matMotas);
  motas.frustumCulled = false;
  grupo.add(motas);

  /* ================================================================ */
  /* 8. Animacion                                                      */
  /* ================================================================ */
  const _pos = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  let glitch = 0;

  function update(t, dt, energia, pulso = 0) {
    /* --- Holograma ------------------------------------------------- */
    // Picos de fallo de señal: frecuentes sin energia, raros al sincronizar
    if (Math.random() < dt * (0.4 + (1 - energia) * 2.5)) glitch = 0.6 + Math.random() * 0.4;
    glitch = Math.max(0, glitch - dt * 3.2);
    uniformesHolo.uTiempo.value = t;
    uniformesHolo.uEnergia.value = energia;
    uniformesHolo.uPulso.value = pulso;
    uniformesHolo.uGlitch.value = glitch;
    // Levita, oscila y se inclina: la transmision "busca" al observador
    soporteHolo.position.y = ALTURA_HOLOGRAMA + Math.sin(t * 0.9) * 0.12;
    soporteHolo.rotation.y = Math.sin(t * 0.23) * 0.55;
    soporteHolo.rotation.x = Math.sin(t * 0.31) * 0.05;
    const escalaHolo = 0.92 + energia * 0.08 + pulso * 0.03;
    soporteHolo.scale.setScalar(escalaHolo);
    ecos.forEach((e, i) => { e.position.z = (i ? 1 : -1) * (0.25 + pulso * 0.35 + (1 - energia) * 0.2); });
    matMarco.opacity = 0.2 + energia * 0.5;
    luzHolo.intensity = 12 + energia * (60 + pulso * 60);

    /* --- Haz, emisor, corona y cinta ------------------------------- */
    matHaz.uniforms.uTiempo.value = t;
    matHaz.uniforms.uEnergia.value = energia;
    matHaz.uniforms.uPulso.value = pulso;
    emisor.rotation.y += dt * (0.4 + energia * 2.2);
    emisor.position.y = CIMA + 0.9 + Math.sin(t * 1.6) * 0.08;
    matEmisor.emissiveIntensity = 0.4 + energia * (1.4 + pulso * 1.6);
    corona.rotation.z += dt * (0.05 + energia * 0.25);
    matCorona.opacity = 0.15 + energia * 0.6 + pulso * 0.15;
    matCanto.emissiveIntensity = 0.15 + energia * (1.2 + Math.sin(t * 2) * 0.2);
    texCanto.offset.x = t * 0.01;
    M.filo.emissiveIntensity = 0.3 + energia * (1.4 + pulso);
    M.filoVioleta.emissiveIntensity = 0.3 + energia * (1.1 + Math.sin(t * 1.7) * 0.3);
    cinta.rotation.y -= dt * (0.1 + energia * 0.5);
    cinta.position.y = ALTURA_HOLOGRAMA - 2.75 + Math.sin(t * 0.7) * 0.15;
    matCinta.opacity = 0.05 + energia * 0.35;

    /* --- Pilones y laseres ----------------------------------------- */
    matLaser.opacity = THREE.MathUtils.smoothstep(energia, 0.25, 0.7) * (0.45 + pulso * 0.4 + Math.sin(t * 20) * 0.05);
    pilones.forEach((p) => { p.punta.rotation.y += dt * (0.5 + energia * 3); });
    matPuntaPilon.emissiveIntensity = 0.3 + energia * (1.5 + pulso);

    /* --- Giroscopio: cada eslabon gira sobre su eje ---------------- */
    anillos.forEach(({ eslabon, mat, eje, vel, signo }, i) => {
      eslabon.rotation[eje] += signo * dt * vel * (0.15 + energia * 2.2 + pulso * 1.2);
      mat.emissiveIntensity = 0.12 + energia * (1.1 + Math.sin(t * 2.4 + i) * 0.25) + pulso * 0.6;
    });

    /* --- Cristales: orbita libre -> formacion ---------------------- */
    const orden = THREE.MathUtils.smoothstep(energia, 0.35, 0.95);
    cristales.forEach((c, i) => {
      c.fase += dt * c.vel * (0.4 + energia * 1.6);
      const r = THREE.MathUtils.lerp(c.radioLibre, 6.4, orden);
      _pos.set(Math.cos(c.fase) * r, Math.sin(c.fase * 2 + i) * 0.4 * (1 - orden), Math.sin(c.fase) * r);
      _q.copy(c.inclinacion).slerp(inclinacionFormacion, orden);
      _pos.applyQuaternion(_q);
      c.m.position.set(_pos.x, _pos.y + ALTURA_HOLOGRAMA + Math.sin(t + i) * 0.15, _pos.z);
      c.m.rotation.x += dt * c.giro.x * (1 - orden * 0.8);
      c.m.rotation.y += dt * (c.giro.y + orden * 1.5);
      c.m.rotation.z += dt * c.giro.z * (1 - orden * 0.8);
      if (orden > 0.01) {
        // En formacion se enderezan poco a poco
        c.m.rotation.x *= 1 - orden * dt * 2;
        c.m.rotation.z *= 1 - orden * dt * 2;
      }
    });
    matsCristal.forEach((m, i) => { m.emissiveIntensity = 0.2 + energia * (0.9 + pulso * 1.2) + Math.sin(t * 1.5 + i) * 0.1; });

    /* --- Motas en espiral por el haz ------------------------------- */
    const arr = geoMotas.attributes.position.array;
    for (let i = 0; i < TOTAL_MOTAS; i++) {
      const d = datosMotas[i];
      d.h += dt * d.v * (0.4 + energia * 1.6);
      d.a += dt * (0.6 + energia * 1.5);
      if (d.h > 1) { d.h = 0; d.a = Math.random() * Math.PI * 2; }
      const radio = THREE.MathUtils.lerp(0.35, 2.6, d.h) * (0.6 + 0.4 * Math.sin(i));
      arr[i * 3] = Math.cos(d.a) * radio;
      arr[i * 3 + 1] = CIMA + 0.9 + d.h * altoHaz;
      arr[i * 3 + 2] = Math.sin(d.a) * radio;
    }
    geoMotas.attributes.position.needsUpdate = true;
    matMotas.opacity = 0.15 + energia * 0.65;
  }

  /** Posicion del centro del holograma en el mundo (para HUD y audio). */
  function posicionHolograma(destino = _v) {
    grupo.updateMatrixWorld(true);
    return focoAudio.getWorldPosition(destino);
  }

  // Mallas sobre las que el usuario puede hacer clic para sincronizar
  const objetivosClic = [pantalla, emisor];

  return { grupo, focoAudio, pantalla, objetivosClic, ajustarPantalla, update, posicionHolograma };
}
