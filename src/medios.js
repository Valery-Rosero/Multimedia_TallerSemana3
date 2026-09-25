/**
 * MEDIOS: video (la transmision de Vesperia) + audio espacial + analisis
 * -------------------------------------------------------------
 * - Crea el <video> y su VideoTexture para el holograma del altar.
 * - Crea el AudioListener (oidos = camara) y el PositionalAudio
 *   (fuente = centro del holograma), de modo que el volumen depende de la
 *   distancia y la orientacion de la camara en el espacio 3D.
 * - Inserta DOS analizadores de frecuencia en la cadena de audio:
 *
 *     fuente ─► [analizador FUENTE] ─► panner 3D ─► ganancia ─► altavoces
 *                                                      └─► [analizador OIDO]
 *
 *   El primero mide el sonido tal como sale del holograma y hace latir
 *   la escena al ritmo real del audio. El segundo mide lo que llega
 *   a los oidos del usuario DESPUES de la espacializacion: por eso el
 *   espectro del HUD se encoge al alejarse del altar.
 * - Centraliza el play/pausa para sortear la restriccion de
 *   autoplay: nada suena hasta que el usuario lo ordena.
 */
import * as THREE from 'three';

export const RUTA_VIDEO = '/assets/video.mp4';
export const RUTA_AUDIO = '/assets/audio.mp3';

/* Parametros del modelo de atenuacion por distancia (PannerNode) */
export const AUDIO_3D = {
  refDistance: 8,     // hasta aqui el volumen es maximo
  maxDistance: 60,    // mas alla ya no se atenua mas
  rolloffFactor: 1.1, // cuan rapido cae el volumen al alejarse
  volumen: 1.0,
};

/* Bandas del espectro que se dibujan en el HUD */
export const BANDAS_ESPECTRO = 32;

export function crearMedios() {
  /* ---------------------------------------------------------------- */
  /* 1. Video -> VideoTexture                                          */
  /* ---------------------------------------------------------------- */
  const video = document.createElement('video');
  video.src = RUTA_VIDEO;
  video.loop = true;
  video.muted = true;        // el sonido llega por el audio espacial
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  // Algunos navegadores (Safari en particular) solo actualizan los frames de
  // un video que forma parte del documento: lo anclamos fuera de pantalla.
  Object.assign(video.style, {
    position: 'fixed', width: '1px', height: '1px',
    left: '-10px', top: '-10px', opacity: '0', pointerEvents: 'none',
  });
  document.body.appendChild(video);
  video.load();

  const texturaVideo = new THREE.VideoTexture(video);
  texturaVideo.colorSpace = THREE.SRGBColorSpace;
  texturaVideo.minFilter = THREE.LinearFilter;
  texturaVideo.magFilter = THREE.LinearFilter;
  texturaVideo.generateMipmaps = false;

  /* ---------------------------------------------------------------- */
  /* 2. Audio espacial                                                 */
  /* ---------------------------------------------------------------- */
  const listener = new THREE.AudioListener();         // se cuelga de la camara
  const sonido = new THREE.PositionalAudio(listener); // se cuelga del holograma

  sonido.setRefDistance(AUDIO_3D.refDistance);
  sonido.setMaxDistance(AUDIO_3D.maxDistance);
  sonido.setRolloffFactor(AUDIO_3D.rolloffFactor);
  sonido.setDistanceModel('inverse');
  // Cono directivo: el holograma "proyecta" su voz hacia su cara frontal,
  // y como el holograma oscila, el usuario nota tambien el cambio al rodearlo.
  sonido.setDirectionalCone(110, 250, 0.22);
  sonido.setLoop(true);
  sonido.setVolume(AUDIO_3D.volumen);

  /* ---- 2.1 Analizadores de frecuencia ----------------------------- */
  const ctx = listener.context;

  // Antes del panner: un AnalyserNode deja pasar el audio intacto, asi que
  // se puede insertar como "filtro" entre la fuente y la espacializacion.
  const analizadorFuente = ctx.createAnalyser();
  analizadorFuente.fftSize = 256;
  analizadorFuente.smoothingTimeConstant = 0.72;
  sonido.setFilter(analizadorFuente);

  // Despues del panner y del volumen: lo que de verdad oye la camara
  const analizadorOido = ctx.createAnalyser();
  analizadorOido.fftSize = 128;
  analizadorOido.smoothingTimeConstant = 0.8;
  sonido.gain.connect(analizadorOido);

  const datosFuente = new Uint8Array(analizadorFuente.frequencyBinCount);
  const datosOido = new Uint8Array(analizadorOido.frequencyBinCount);

  const estado = {
    reproduciendo: false,
    audioListo: false,
    videoListo: false,
    silenciado: false,
    error: null,
  };

  /* ---------------------------------------------------------------- */
  /* 3. Carga de video y audio                                         */
  /* ---------------------------------------------------------------- */
  const cargarAudio = (onProgreso) => new Promise((resolve) => {
    new THREE.AudioLoader().load(
      RUTA_AUDIO,
      (buffer) => {
        sonido.setBuffer(buffer);
        estado.audioListo = true;
        onProgreso?.(1);
        resolve(true);
      },
      (evt) => {
        if (evt.lengthComputable) onProgreso?.(evt.loaded / evt.total);
      },
      (err) => {
        console.error('[medios] no se pudo cargar el audio', err);
        estado.error = 'audio';
        resolve(false);
      },
    );
  });

  const cargarVideo = (onProgreso) => new Promise((resolve) => {
    if (video.readyState >= 3) { estado.videoListo = true; onProgreso?.(1); return resolve(true); }
    const ok = () => { estado.videoListo = true; onProgreso?.(1); limpiar(); resolve(true); };
    const fallo = () => { estado.error = 'video'; limpiar(); resolve(false); };
    const avance = () => {
      if (video.buffered.length && video.duration) {
        onProgreso?.(Math.min(1, video.buffered.end(0) / video.duration));
      }
    };
    const limpiar = () => {
      video.removeEventListener('canplaythrough', ok);
      video.removeEventListener('error', fallo);
      video.removeEventListener('progress', avance);
    };
    video.addEventListener('canplaythrough', ok);
    video.addEventListener('error', fallo);
    video.addEventListener('progress', avance);
  });

  /**
   * Espera a que ambos medios esten listos para el primer PLAY.
   * @param {(fraccion:number)=>void} [onProgreso] avance combinado 0..1
   */
  function precargar(onProgreso) {
    let pAudio = 0;
    let pVideo = 0;
    const avisar = () => onProgreso?.((pAudio + pVideo) / 2);
    return Promise.all([
      cargarAudio((p) => { pAudio = p; avisar(); }),
      cargarVideo((p) => { pVideo = p; avisar(); }),
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* 4. Control de reproduccion (gesto del usuario obligatorio)        */
  /* ---------------------------------------------------------------- */
  async function reproducir() {
    // Los navegadores dejan el AudioContext suspendido hasta que hay
    // una interaccion real del usuario: aqui lo reanudamos.
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      await video.play();
    } catch (err) {
      console.warn('[medios] el navegador bloqueo el video', err);
    }

    if (estado.audioListo && !sonido.isPlaying) sonido.play();
    estado.reproduciendo = true;
    return estado.reproduciendo;
  }

  function pausar() {
    video.pause();
    if (sonido.isPlaying) sonido.pause();
    estado.reproduciendo = false;
  }

  function alternar() {
    return estado.reproduciendo ? (pausar(), Promise.resolve(false)) : reproducir();
  }

  function reiniciar() {
    video.currentTime = 0;
    if (sonido.isPlaying) sonido.stop();
    if (estado.audioListo && estado.reproduciendo) sonido.play();
  }

  /* ---------------------------------------------------------------- */
  /* 5. Volumen y silencio                                             */
  /* ---------------------------------------------------------------- */
  let volumen = AUDIO_3D.volumen;

  function setVolumen(v) {
    volumen = THREE.MathUtils.clamp(v, 0, 1);
    if (!estado.silenciado) sonido.setVolume(volumen);
  }

  function alternarSilencio() {
    estado.silenciado = !estado.silenciado;
    sonido.setVolume(estado.silenciado ? 0 : volumen);
    return estado.silenciado;
  }

  /* ---------------------------------------------------------------- */
  /* 6. Lectura de los analizadores                                    */
  /* ---------------------------------------------------------------- */
  /**
   * Nivel 0..1 del sonido en la fuente, ponderando graves y medios
   * (lo que mejor se percibe como "latido").
   */
  function nivelFuente() {
    if (!estado.reproduciendo) return 0;
    analizadorFuente.getByteFrequencyData(datosFuente);
    let suma = 0;
    const n = Math.floor(datosFuente.length * 0.45);
    for (let i = 1; i < n; i++) suma += datosFuente[i] * (1.4 - i / n);
    return THREE.MathUtils.clamp(suma / (n * 255 * 0.9), 0, 1);
  }

  /**
   * Rellena `destino` (longitud BANDAS_ESPECTRO) con el espectro 0..1
   * que llega a los oidos de la camara.
   */
  function espectroOido(destino) {
    analizadorOido.getByteFrequencyData(datosOido);
    const paso = Math.floor(datosOido.length / destino.length) || 1;
    for (let b = 0; b < destino.length; b++) {
      let s = 0;
      for (let k = 0; k < paso; k++) s += datosOido[b * paso + k] ?? 0;
      destino[b] = s / (paso * 255);
    }
    return destino;
  }

  /**
   * Ganancia aproximada segun el modelo "inverse" del PannerNode.
   * Sirve para mostrar en el HUD como cae el volumen al alejarse.
   */
  function gananciaEstimada(distancia) {
    const { refDistance: ref, maxDistance: max, rolloffFactor: k } = AUDIO_3D;
    const d = THREE.MathUtils.clamp(distancia, ref, max);
    return ref / (ref + k * (d - ref));
  }

  /** Posicion de la transmision (segundos) para la linea de tiempo del HUD. */
  function progreso() {
    return { actual: video.currentTime || 0, total: video.duration || 0 };
  }

  return {
    video, texturaVideo, listener, sonido, estado,
    precargar, reproducir, pausar, alternar, reiniciar,
    setVolumen, alternarSilencio, nivelFuente, espectroOido,
    gananciaEstimada, progreso,
    get volumen() { return estado.silenciado ? 0 : volumen; },
  };
}
