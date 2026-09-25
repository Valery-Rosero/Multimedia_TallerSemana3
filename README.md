# Eco de Vesperia — Holograma Alienígena

**Taller Semana 3 · Medios, Animación y Audio** — Escena interactiva en Three.js
con video proyectado como holograma, audio espacial y animación a 60 FPS.

Autora: **Valery Nickol Rosero Molina** · Repositorio: https://github.com/Valery-Rosero/Multimedia_TallerSemana3

---

## Concepto

*(Concepto sugerido: Holograma Alienígena, con universo propio)*

En **Vesperia**, un planeta violeta que orbita bajo un gigante gaseoso con anillos,
una civilización desaparecida dejó un **altar de proyección**. Lleva mil años
guardando una transmisión que nadie ha visto. A su lado yace una sonda humana
estrellada que apenas capta un eco de la señal.

Al pulsar **SINCRONIZAR**, el altar entra en resonancia: los glifos despiertan,
los anillos del giroscopio empiezan a girar, **el holograma se materializa desde
el ruido**, los monolitos responden uno a uno, la aurora se enciende y la antena
de la sonda gira hacia la luz. Todo late **al ritmo real del audio**.

---

## Cómo ejecutarlo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # compilación de producción en dist/
npm run preview  # previsualizar la compilación
```

Abre la URL que imprime Vite y pulsa **SINCRONIZAR EL ALTAR**
(mejor con auriculares, para notar el audio 3D).

---

## Cumplimiento de los requisitos

### 1. Entorno 3D completo (mínimo 3 objetos adicionales)

Todo está construido con geometría y texturas procedurales, sin modelos externos.

**El altar** (`src/escena/holograma.js`):

| Elemento | Detalle |
|---|---|
| Altar escalonado | Tres gradas de obsidiana con filos luminosos y un canto grabado con glifos |
| Corona ritual | Disco de glifos que gira sobre la grada superior |
| Pilones | Tres garras curvas (`TubeGeometry`) con vértebras luminosas y láseres hacia el holograma |
| Emisor | Cristal central que rota y del que nace el haz |
| Haz de luz | Cono semitransparente con shader propio (fresnel + franjas ascendentes) |
| **Holograma** | El video, con shader de señal alienígena y dos ecos desfasados |
| Giroscopio | Tres anillos **anidados**, cada uno sobre un eje distinto |
| Cristales en órbita | 16 fragmentos semitransparentes en órbitas inclinadas |
| Cinta de datos | Cilindro de glifos que rodea el holograma |
| Motas | Partículas que ascienden en espiral por el haz |

**El planeta** (`src/escena/planeta.js`):

| Elemento | Detalle |
|---|---|
| Terreno | Llanura facetada de 170×170 segmentos con ruido fractal y cordilleras |
| Círculo ritual | Disco de glifos en el suelo que se enciende con la sincronía |
| Cielo | Cúpula con shader (degradado + nebulosa animada) y 1600 estrellas |
| Gigante gaseoso | Esfera con bandas y anillos, además de dos lunas |
| Auroras | Cortinas ondulantes hechas con shader (el vértice se deforma en la GPU) |
| Monolitos | 7 bloques que levitan y cuyos glifos se encienden en cascada |
| Islas flotantes | 6 rocas coronadas de cristal que orbitan el altar |
| Cristales | 11 grupos de prismas semitransparentes |
| Flora | Hongos bioluminiscentes y plantas-tentáculo articuladas que se mecen |
| Rocas | 180 rocas instanciadas (una sola llamada de dibujo) |
| Sonda HELIOS-7 | Sonda humana estrellada; su antena se orienta hacia el holograma |
| Esporas | 320 partículas luminosas con shader propio |

`src/escena/glifos.js` genera la escritura alienígena (glifos aleatorios en `<canvas>`).

### 2. Animación fluida en el bucle a 60 FPS

`src/main.js` → función `animate()`. El bucle usa **paso fijo de 1/60 s** con
acumulador, así que la animación avanza siempre a 60 pasos por segundo:

```js
acumulador += delta;
while (acumulador >= PASO_FIJO && pasos < 5) {
  simular(PASO_FIJO);
  acumulador -= PASO_FIJO;
  pasos++;
}
```

Una sola variable, la **sincronía** (`energia`, de 0 a 1), dirige toda la
narrativa. Una segunda variable, `pulso`, llega del analizador de audio y hace
latir la escena al ritmo del sonido.

| Fase | Sincronía | Qué ocurre |
|---|---|---|
| SIN SEÑAL | < 5 % | Holograma casi invisible, reducido a estática; los anillos giran despacio |
| CAPTANDO | 5–35 % | Se encienden los glifos, la corona ritual y el canto del altar |
| MATERIALIZANDO | 35–70 % | Aparecen los láseres, responden los monolitos, los cristales se ordenan y la antena de la sonda se alinea |
| ESTABLE | > 70 % | Imagen nítida, aurora intensa y cristales en formación de corona |

### 3. Interacción de usuario (autoplay)

Nada suena ni se reproduce hasta que el usuario lo decide. La pantalla de
arranque obtiene el gesto obligatorio y reanuda el `AudioContext`
(`src/medios.js` → `reproducir()`).

| Control | Acción |
|---|---|
| Botón **SINCRONIZAR EL ALTAR** | Arranca la experiencia |
| Botón **SINCRONIZAR / CORTAR SEÑAL** · <kbd>Espacio</kbd> | Reproducir / pausar video y audio |
| **Clic sobre el holograma** | Reproducir / pausar (raycasting) |
| Botón **REINICIAR TRANSMISIÓN** | Rebobina el video y reinicia la sincronía |
| Botón **CAMBIAR VISTA** · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | Vistas con transición suave |
| Botón **ÓRBITA AUTOMÁTICA** · <kbd>C</kbd> | La cámara gira sola alrededor del altar |
| <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / flechas · <kbd>Q</kbd> <kbd>E</kbd> | Desplazar la cámara · bajar / subir |
| <kbd>Shift</kbd> | Moverse más rápido |
| <kbd>R</kbd> | Volver a la vista inicial |
| <kbd>M</kbd> | Silenciar |
| <kbd>H</kbd> | Ocultar / mostrar la interfaz |
| Deslizador **MAESTRO** | Volumen general |
| Arrastrar / rueda | Orbitar y acercar (`OrbitControls`) |

Una **bitácora** narra cada fase en pantalla. Al ocultar la pestaña, la reproducción se pausa sola.

### 4. Audio espacial funcional

`src/medios.js` y el panel **AUDIO ESPACIAL** del HUD.

- El `AudioListener` va unido a la **cámara**.
- El `PositionalAudio` va unido al **centro del holograma**. Como el holograma
  oscila, su **cono directivo** (`setDirectionalCone(110, 250, 0.22)`) también
  se mueve, así que el volumen cambia al acercarse y también al rodearlo.
- Modelo `inverse`, con `refDistance: 8`, `maxDistance: 60` y `rolloffFactor: 1.1`.
- **Dos analizadores de frecuencia** en la cadena de audio:

  ```
  fuente ─► [analizador FUENTE] ─► panner 3D ─► ganancia ─► altavoces
                                                   └─► [analizador OÍDO]
  ```

  El primero hace latir la escena al ritmo real del sonido. El segundo mide
  lo que llega a los oídos **después** de la espacialización: el espectro del
  HUD se encoge visiblemente al alejarse.

Medición real de la escena, con los datos que muestra el HUD:

| Posición | Distancia | Volumen |
|---|---|---|
| Vista 2 · frente al holograma | 7,4 u | 100 % |
| Vista 1 · inicial | 16,3 u | 47 % |
| Vista 3 · entre los monolitos | 26,0 u | 29 % |

---

## Estructura

```
codigo-fuente/
├─ index.html              Pantalla de arranque + HUD
├─ public/assets/
│  ├─ video.mp4            la transmisión de Vesperia
│  └─ audio.mp3            la señal del altar
└─ src/
   ├─ main.js              renderer, cámara, luces, bucle 60 FPS, HUD, teclado, raycasting
   ├─ medios.js            VideoTexture + PositionalAudio + analizadores + play/pausa
   ├─ style.css            interfaz de consola alienígena
   └─ escena/
      ├─ holograma.js      altar, holograma (shader), giroscopio, cristales, haz
      ├─ planeta.js        terreno, cielo, gigante gaseoso, monolitos, flora, sonda
      └─ glifos.js         generador de escritura alienígena procedural
```

---

## Detalles técnicos

- **Three.js r186** con `OrbitControls`.
- **Shaders propios**: holograma (materialización por ruido, aberración cromática,
  barrido, fallos de señal), haz (fresnel), cielo (nebulosa fBm), auroras
  (deformación de vértices) y esporas (parpadeo y deriva en la GPU).
- `ACESFilmicToneMapping` y sombras `PCFSoftShadowMap` de la luz principal.
  La luz del holograma no proyecta sombra a propósito: una luz puntual con sombra
  vuelve a renderizar la escena seis veces.
- El holograma es un plano unitario que **se escala al aspecto real del video**
  al cargar sus metadatos, para no deformar la imagen.
- El `<video>` se ancla fuera de pantalla dentro del documento: algunos navegadores
  (Safari) no actualizan los fotogramas de un elemento que no está en el DOM.
