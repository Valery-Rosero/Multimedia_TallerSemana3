/**
 * ============================================================
 *  ECO DE VESPERIA — HOLOGRAMA ALIENIGENA
 *  Taller Semana 3 · Video + Audio espacial + Animacion 3D
 *  Valery Nickol Rosero Molina
 * ============================================================
 *
 *  NARRATIVA
 *  En Vesperia, un planeta violeta bajo un gigante gaseoso, una
 *  civilizacion desaparecida dejo un altar de proyeccion. Lleva mil
 *  años guardando una transmision que nadie ha visto. Una sonda
 *  humana se estrello a su lado y capta un eco debil de la señal.
 *
 *  Al pulsar SINCRONIZAR, el altar entra en resonancia: los glifos
 *  despiertan, los anillos del giroscopio empiezan a girar, el
 *  holograma se materializa desde el ruido, los monolitos responden
 *  uno a uno, la aurora se enciende y la antena de la sonda gira
 *  hacia la luz. Todo late al ritmo REAL del audio.
 *
 *  REQUISITOS CUBIERTOS
 *  1. Entorno 3D completo .... planeta.js (terreno, cielo, gigante
 *     gaseoso, monolitos, islas, cristales, flora, sonda) +
 *     holograma.js (altar, giroscopio, cristales en orbita, haz).
 *  2. Animacion fluida a 60 FPS ... bucle con paso fijo (seccion 6).
 *  3. Interaccion de usuario ...... pantalla de arranque, HUD, teclado,
 *     clic sobre el holograma y vistas de camara.
 *  4. Audio espacial funcional .... PositionalAudio en el centro del
 *     holograma, camara libre, medidor de volumen y espectro percibido.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearPlaneta } from './escena/planeta.js';
import { crearHolograma, ALTURA_HOLOGRAMA } from './escena/holograma.js';
import { crearMedios, BANDAS_ESPECTRO } from './medios.js';
import './style.css';

/* ================================================================== */
/* 0. Constantes de escena                                             */
/* ================================================================== */
const CAMARA_INICIAL = new THREE.Vector3(9, 7.6, 13.5);
const OBJETIVO_INICIAL = new THREE.Vector3(0, 5.2, 0);
const FPS_OBJETIVO = 60;
const PASO_FIJO = 1 / FPS_OBJETIVO;

/* Vistas predefinidas (teclas 1, 2 y 3) */
const VISTAS = [
  { nombre: 'Vista general', pos: CAMARA_INICIAL, obj: OBJETIVO_INICIAL },
  { nombre: 'Frente al holograma', pos: new THREE.Vector3(0, ALTURA_HOLOGRAMA + 0.6, 7.4), obj: new THREE.Vector3(0, ALTURA_HOLOGRAMA, 0) },
  { nombre: 'Entre los monolitos', pos: new THREE.Vector3(-24.5, 4, -8.5), obj: new THREE.Vector3(0, 5.5, 0) },
];

/* Paleta de la atmosfera: la sincronia lleva la escena del silencio
   violeta a la resonancia turquesa. */
const SILENCIO = {
  niebla: new THREE.Color(0x160b20), ambiente: new THREE.Color(0x2c2045),
  hemiCielo: new THREE.Color(0x6a4cff), luna: new THREE.Color(0xc3a8ff),
};
const RESONANCIA = {
  niebla: new THREE.Color(0x1c1030), ambiente: new THREE.Color(0x24405a),
  hemiCielo: new THREE.Color(0x5ef2ff), luna: new THREE.Color(0xd9f7ff),
};

/* ================================================================== */
/* 1. Renderizador, escena y camara                                    */
/* ================================================================== */
const contenedor = document.getElementById('lienzo');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
contenedor.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05030c); // la cupula celeste lo cubre
scene.fog = new THREE.FogExp2(SILENCIO.niebla.clone(), 0.012);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.copy(CAMARA_INICIAL);

/* ---- Controles de orbita: el usuario mueve la camara libremente --- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(OBJETIVO_INICIAL);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 4;
controls.maxDistance = 45;
controls.maxPolarAngle = Math.PI * 0.495; // no atravesar el suelo
controls.autoRotateSpeed = 0.6;
controls.update();

/* ================================================================== */
/* 2. Iluminacion base                                                 */
/* ================================================================== */
const luzAmbiente = new THREE.AmbientLight(SILENCIO.ambiente, 0.8);
scene.add(luzAmbiente);
const luzHemisferio = new THREE.HemisphereLight(SILENCIO.hemiCielo, 0x140a1c, 0.7);
scene.add(luzHemisferio);

// Luz reflejada del gigante gaseoso (llega del mismo lado del cielo)
const luzLuna = new THREE.DirectionalLight(SILENCIO.luna, 1.6);
luzLuna.position.set(-16, 22, -24);
luzLuna.castShadow = true;
luzLuna.shadow.mapSize.set(2048, 2048);
luzLuna.shadow.camera.left = -26;
luzLuna.shadow.camera.right = 26;
luzLuna.shadow.camera.top = 26;
luzLuna.shadow.camera.bottom = -26;
luzLuna.shadow.camera.far = 70;
luzLuna.shadow.bias = -0.0015;
scene.add(luzLuna);

/* ================================================================== */
/* 3. Medios, planeta y altar                                          */
/* ================================================================== */
const medios = crearMedios();
camera.add(medios.listener);   // los oidos viajan con la camara
scene.add(camera);             // necesario para que el listener se actualice

const planeta = crearPlaneta();
planeta.ajustarEscala(window.innerHeight * renderer.getPixelRatio());
scene.add(planeta.grupo);

const altar = crearHolograma(medios.texturaVideo);
scene.add(altar.grupo);

// La fuente de sonido vive en el centro del holograma (y oscila con el)
altar.focoAudio.add(medios.sonido);

// El holograma se adapta al aspecto real del video (no lo deforma)
const ajustarPantalla = () => altar.ajustarPantalla(medios.video.videoWidth, medios.video.videoHeight);
medios.video.addEventListener('loadedmetadata', ajustarPantalla);
ajustarPantalla();

/* ================================================================== */
/* 4. HUD                                                              */
/* ================================================================== */
const $ = (id) => document.getElementById(id);
const ui = {
  arranque: $('arranque'),
  btnIniciar: $('btn-iniciar'),
  barra: $('barra-carga-relleno'),
  estadoCarga: $('estado-carga'),
  hud: $('hud'),
  btnPlay: $('btn-play'),
  btnPlayTexto: $('btn-play-texto'),
  btnReiniciar: $('btn-reiniciar'),
  btnOrbita: $('btn-orbita'),
  btnVista: $('btn-vista'),
  medidorEnergia: $('medidor-energia'),
  valorEnergia: $('valor-energia'),
  estadoSistema: $('estado-sistema'),
  fase: $('valor-fase'),
  memoria: $('medidor-memoria'),
  tiempoMemoria: $('valor-memoria'),
  valorDistancia: $('valor-distancia'),
  medidorVolumen: $('medidor-volumen'),
  valorVolumen: $('valor-volumen'),
  deslizador: $('deslizador-volumen'),
  espectro: $('espectro'),
  bitacora: $('bitacora'),
  pistaCursor: $('pista-cursor'),
  aviso: $('aviso-vista'),
  fps: $('fps'),
};

/* ---- 4.1 Precarga de video y audio -------------------------------- */
let listo = false;
medios.precargar((fraccion) => {
  ui.barra.style.width = `${Math.round(fraccion * 100)}%`;
}).then(() => {
  listo = true;
  ui.barra.style.width = '100%';
  ui.estadoCarga.textContent = medios.estado.error
    ? `Aviso: no se pudo cargar el ${medios.estado.error}. La escena funciona igual.`
    : 'Señal captada · lista para sincronizar';
  ui.btnIniciar.disabled = false;
});

/* ---- 4.2 Bitacora: frases que narran la sincronizacion ------------- */
const BITACORA = [
  { umbral: 0.04, texto: 'Señal detectada en el altar…' },
  { umbral: 0.2, texto: 'Los glifos despiertan tras mil años de silencio.' },
  { umbral: 0.4, texto: 'El giroscopio entra en resonancia.' },
  { umbral: 0.6, texto: 'Los monolitos responden a la llamada.' },
  { umbral: 0.85, texto: 'Transmisión estable · el mensaje de Vesperia es visible.' },
];
let siguienteEntrada = 0;
let temporizadorBitacora = 0;

function escribirBitacora(texto) {
  ui.bitacora.textContent = texto;
  ui.bitacora.classList.remove('visible');
  void ui.bitacora.offsetWidth; // reinicia la animacion CSS
  ui.bitacora.classList.add('visible');
  clearTimeout(temporizadorBitacora);
  temporizadorBitacora = setTimeout(() => ui.bitacora.classList.remove('visible'), 4200);
}

function revisarBitacora() {
  if (siguienteEntrada < BITACORA.length && energia >= BITACORA[siguienteEntrada].umbral && reproduciendo) {
    escribirBitacora(BITACORA[siguienteEntrada].texto);
    siguienteEntrada++;
  }
  // Cuando la señal se pierde del todo, la historia puede repetirse
  if (energia < 0.02) siguienteEntrada = 0;
}

/* ---- 4.3 Espectro de audio (lo que oye la camara) ------------------- */
const ctxEspectro = ui.espectro.getContext('2d');
const bandas = new Float32Array(BANDAS_ESPECTRO);

function dibujarEspectro() {
  const { width: w, height: h } = ui.espectro;
  ctxEspectro.clearRect(0, 0, w, h);
  medios.espectroOido(bandas);
  const ancho = w / BANDAS_ESPECTRO;
  for (let i = 0; i < BANDAS_ESPECTRO; i++) {
    const alto = Math.max(1.5, bandas[i] * h);
    // Degradado violeta -> cian -> verde acido a lo largo del espectro
    const hue = 285 - (i / BANDAS_ESPECTRO) * 180;
    ctxEspectro.fillStyle = `hsla(${hue}, 95%, 68%, ${0.35 + bandas[i] * 0.65})`;
    ctxEspectro.fillRect(i * ancho + 1, h - alto, ancho - 2, alto);
  }
}

/* ================================================================== */
/* 5. Interaccion                                                      */
/* ================================================================== */
let reproduciendo = false;

async function alternarReproduccion() {
  const antes = reproduciendo;
  reproduciendo = await medios.alternar();
  if (antes && !reproduciendo) escribirBitacora('La señal se desvanece…');
  actualizarBotonPlay();
}

function actualizarBotonPlay() {
  ui.btnPlay.classList.toggle('reproduciendo', reproduciendo);
  ui.btnPlayTexto.textContent = reproduciendo ? 'CORTAR SEÑAL' : 'SINCRONIZAR';
  ui.btnPlay.querySelector('.icono').textContent = reproduciendo ? '❚❚' : '◈';
  ui.estadoSistema.textContent = reproduciendo ? 'ALTAR ACTIVO · PROYECTANDO TRANSMISIÓN' : 'SEÑAL EN REPOSO';
  ui.estadoSistema.classList.toggle('activo', reproduciendo);
}

async function iniciarExperiencia() {
  if (!listo) return;
  ui.arranque.classList.add('cerrado');
  ui.hud.classList.remove('oculto');
  reproduciendo = await medios.reproducir();
  actualizarBotonPlay();
}

ui.btnIniciar.addEventListener('click', iniciarExperiencia);
ui.btnPlay.addEventListener('click', alternarReproduccion);
ui.btnReiniciar.addEventListener('click', () => {
  medios.reiniciar();
  energia = 0;
  escribirBitacora('Transmisión reiniciada desde el origen.');
});
ui.btnOrbita.addEventListener('click', () => alternarOrbita());
ui.btnVista.addEventListener('click', () => irAVista((vistaActual + 1) % VISTAS.length));
ui.deslizador.addEventListener('input', () => medios.setVolumen(ui.deslizador.value / 100));

function alternarOrbita() {
  controls.autoRotate = !controls.autoRotate;
  ui.btnOrbita.classList.toggle('activa', controls.autoRotate);
}

/* ---- 5.1 Vistas de camara con transicion suave -------------------- */
let vistaActual = 0;
let transicion = null; // { desdePos, desdeObj, hastaPos, hastaObj, t }

function irAVista(i) {
  vistaActual = i;
  const v = VISTAS[i];
  transicion = {
    desdePos: camera.position.clone(), desdeObj: controls.target.clone(),
    hastaPos: v.pos, hastaObj: v.obj, t: 0,
  };
  ui.aviso.textContent = `${i + 1} · ${v.nombre}`;
  ui.aviso.classList.remove('visible');
  void ui.aviso.offsetWidth;
  ui.aviso.classList.add('visible');
}

function avanzarTransicion(dt) {
  if (!transicion) return;
  transicion.t = Math.min(1, transicion.t + dt / 1.6);
  const k = 1 - (1 - transicion.t) ** 3; // ease-out cubico
  camera.position.lerpVectors(transicion.desdePos, transicion.hastaPos, k);
  controls.target.lerpVectors(transicion.desdeObj, transicion.hastaObj, k);
  if (transicion.t >= 1) transicion = null;
}
// Si el usuario toma el control de la camara, la transicion se cancela
controls.addEventListener('start', () => { transicion = null; });

/* ---- 5.2 Clic sobre el holograma (raycasting) --------------------- */
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
let sobreHolograma = false;
let pulsacion = null;

function tocaHolograma(e) {
  puntero.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(puntero, camera);
  return raycaster.intersectObjects(altar.objetivosClic, false).length > 0;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  if (!ui.arranque.classList.contains('cerrado') || e.buttons) return;
  sobreHolograma = tocaHolograma(e);
  renderer.domElement.style.cursor = sobreHolograma ? 'pointer' : '';
  ui.pistaCursor.classList.toggle('visible', sobreHolograma);
  ui.pistaCursor.textContent = reproduciendo ? 'Clic · cortar la señal' : 'Clic · sincronizar el altar';
  ui.pistaCursor.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 14}px)`;
});
renderer.domElement.addEventListener('pointerdown', (e) => { pulsacion = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  // Solo cuenta como clic si no fue un arrastre para orbitar
  if (!pulsacion || Math.hypot(e.clientX - pulsacion.x, e.clientY - pulsacion.y) > 5) return;
  if (ui.arranque.classList.contains('cerrado') && tocaHolograma(e)) alternarReproduccion();
});

/* ---- 5.3 Teclado --------------------------------------------------- */
const teclas = new Set();

window.addEventListener('keydown', (e) => {
  if (e.target === ui.deslizador && e.code.startsWith('Arrow')) return;
  const k = e.code;

  // Espacio: arranca la experiencia la primera vez, luego play/pausa
  if (k === 'Space') {
    e.preventDefault();
    if (!ui.arranque.classList.contains('cerrado')) iniciarExperiencia();
    else alternarReproduccion();
    return;
  }
  if (k === 'KeyR') { irAVista(0); return; }
  if (k === 'KeyC') { alternarOrbita(); return; }
  if (k === 'KeyH') { ui.hud.classList.toggle('oculto'); return; }
  if (k === 'KeyM') {
    const mudo = medios.alternarSilencio();
    escribirBitacora(mudo ? 'Audio silenciado.' : 'Audio restaurado.');
    return;
  }
  if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') { irAVista(Number(k.at(-1)) - 1); return; }

  teclas.add(k);
});
window.addEventListener('keyup', (e) => teclas.delete(e.code));
window.addEventListener('blur', () => teclas.clear());

/* ---- 5.4 Desplazamiento libre de la camara (WASD/QE) --------------- */
// Mueve camara y objetivo a la vez: cambia la posicion del oyente en el
// espacio 3D y por tanto el volumen percibido del holograma.
const _adelante = new THREE.Vector3();
const _derecha = new THREE.Vector3();
const _desplazamiento = new THREE.Vector3();
const ARRIBA = new THREE.Vector3(0, 1, 0);

function moverCamara(dt) {
  const vel = (teclas.has('ShiftLeft') || teclas.has('ShiftRight') ? 26 : 12) * dt;
  _desplazamiento.set(0, 0, 0);

  camera.getWorldDirection(_adelante);
  _adelante.y = 0;
  if (_adelante.lengthSq() < 1e-6) _adelante.set(0, 0, -1);
  _adelante.normalize();
  _derecha.crossVectors(_adelante, ARRIBA).normalize();

  if (teclas.has('KeyW') || teclas.has('ArrowUp')) _desplazamiento.addScaledVector(_adelante, vel);
  if (teclas.has('KeyS') || teclas.has('ArrowDown')) _desplazamiento.addScaledVector(_adelante, -vel);
  if (teclas.has('KeyD') || teclas.has('ArrowRight')) _desplazamiento.addScaledVector(_derecha, vel);
  if (teclas.has('KeyA') || teclas.has('ArrowLeft')) _desplazamiento.addScaledVector(_derecha, -vel);
  if (teclas.has('KeyE')) _desplazamiento.y += vel;
  if (teclas.has('KeyQ')) _desplazamiento.y -= vel;

  if (_desplazamiento.lengthSq() === 0) return;
  transicion = null;

  camera.position.add(_desplazamiento);
  controls.target.add(_desplazamiento);

  // Mantener la camara en la llanura del altar y por encima del suelo
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -32, 32);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.2, 24);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -32, 32);
}

/* ================================================================== */
/* 6. Bucle de animacion con paso fijo de 60 FPS                       */
/* ================================================================== */
const reloj = new THREE.Clock();
const posHolograma = new THREE.Vector3();

let energia = 0;        // sincronia: 0 = sin señal, 1 = transmision estable
let pulso = 0;          // nivel suavizado del audio en el holograma (0..1)
let acumulador = 0;     // acumulador del paso fijo
let tiempo = 0;         // tiempo simulado
let fpsMuestra = 60;
let contadorHud = 0;

function simular(dt) {
  tiempo += dt;

  // La señal se estabiliza despacio al reproducir y se pierde al pausar
  const objetivo = reproduciendo ? 1 : 0;
  const velocidad = reproduciendo ? 0.38 : 0.9;
  energia += (objetivo - energia) * Math.min(1, dt * velocidad);

  // El latido sigue al audio con ataque rapido y caida lenta
  const nivel = medios.nivelFuente();
  pulso += (nivel - pulso) * Math.min(1, dt * (nivel > pulso ? 18 : 5));

  moverCamara(dt);
  avanzarTransicion(dt);
  planeta.update(tiempo, dt, energia, pulso);
  altar.update(tiempo, dt, energia, pulso);

  // La atmosfera pasa del silencio violeta a la resonancia turquesa
  const k = THREE.MathUtils.smoothstep(energia, 0.15, 1);
  scene.fog.color.lerpColors(SILENCIO.niebla, RESONANCIA.niebla, k);
  scene.fog.density = 0.012 - energia * 0.003;
  luzAmbiente.color.lerpColors(SILENCIO.ambiente, RESONANCIA.ambiente, k);
  luzHemisferio.color.lerpColors(SILENCIO.hemiCielo, RESONANCIA.hemiCielo, k);
  luzLuna.color.lerpColors(SILENCIO.luna, RESONANCIA.luna, k);
  luzLuna.intensity = 1.6 + k * 0.4;
  renderer.toneMappingExposure = 0.95 + energia * 0.1;
}

const FASES = [
  [0.05, 'SIN SEÑAL'],
  [0.35, 'CAPTANDO'],
  [0.7, 'MATERIALIZANDO'],
  [1.01, 'ESTABLE'],
];

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function actualizarHud() {
  // Sincronia y fase de la señal
  const pct = Math.round(energia * 100);
  ui.medidorEnergia.style.width = `${pct}%`;
  ui.valorEnergia.textContent = `${pct}%`;
  ui.fase.textContent = FASES.find(([u]) => energia < u)[1];

  // Linea de tiempo de la transmision (video)
  const { actual, total } = medios.progreso();
  ui.memoria.style.width = total ? `${(actual / total) * 100}%` : '0%';
  ui.tiempoMemoria.textContent = total ? `${mmss(actual)} / ${mmss(total)}` : '—';

  // Audio espacial: distancia real camara -> holograma y volumen resultante
  altar.posicionHolograma(posHolograma);
  const distancia = camera.position.distanceTo(posHolograma);
  const ganancia = medios.gananciaEstimada(distancia) * (reproduciendo ? medios.volumen : 0);

  ui.valorDistancia.textContent = `${distancia.toFixed(1)} u`;
  ui.medidorVolumen.style.width = `${Math.round(ganancia * 100)}%`;
  ui.valorVolumen.textContent = `${Math.round(ganancia * 100)}%`;
  ui.fps.textContent = `${Math.round(fpsMuestra)} FPS · ${renderer.info.render.triangles.toLocaleString('es')} tris · ${renderer.info.render.calls} draws`;

  revisarBitacora();
}

function animate() {
  requestAnimationFrame(animate);

  const bruto = Math.min(reloj.getDelta(), 0.25); // evita saltos tras un parpadeo de pestaña
  fpsMuestra += ((bruto > 0 ? 1 / bruto : 60) - fpsMuestra) * 0.08;
  acumulador += bruto;

  // Paso fijo: la animacion avanza siempre a 60 pasos por segundo,
  // independientemente de la velocidad real del equipo.
  let pasos = 0;
  while (acumulador >= PASO_FIJO && pasos < 5) {
    simular(PASO_FIJO);
    acumulador -= PASO_FIJO;
    pasos++;
  }
  if (pasos === 5) acumulador = 0; // el equipo no da mas: descartamos atraso

  controls.update();

  // El HUD se refresca 10 veces por segundo; el espectro, 30
  contadorHud = (contadorHud + 1) % 6;
  if (contadorHud === 0) actualizarHud();
  if (contadorHud % 2 === 0) dibujarEspectro();

  renderer.render(scene, camera);
}
animate();

/* ================================================================== */
/* 7. Redimensionado y visibilidad                                     */
/* ================================================================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  planeta.ajustarEscala(window.innerHeight * renderer.getPixelRatio());
});

// Al ocultar la pestaña pausamos para no gastar recursos ni sonar de fondo
document.addEventListener('visibilitychange', () => {
  if (document.hidden && reproduciendo) {
    medios.pausar();
    reproduciendo = false;
    actualizarBotonPlay();
  }
});
