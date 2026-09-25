/**
 * GLIFOS DE VESPERIA
 * -------------------------------------------------------------
 * Escritura alienigena generada por codigo: cada glifo combina
 * trazos, arcos y puntos al azar dentro de una celda. Se dibujan en
 * blanco sobre transparente, asi sirven como `map`, `alphaMap` o
 * `emissiveMap` y el color lo pone el material.
 */
import * as THREE from 'three';

/** Dibuja un glifo aleatorio centrado en (cx, cy) con tamaño `t`. */
function dibujarGlifo(ctx, cx, cy, t) {
  const trazos = 2 + Math.floor(Math.random() * 3);
  const p = () => (Math.floor(Math.random() * 3) - 1) * t * 0.36; // rejilla 3x3
  ctx.beginPath();
  for (let i = 0; i < trazos; i++) {
    const tipo = Math.random();
    const x = cx + p();
    const y = cy + p();
    if (tipo < 0.55) {
      ctx.moveTo(x, y);
      ctx.lineTo(cx + p(), cy + p());
    } else if (tipo < 0.85) {
      const r = t * (0.14 + Math.random() * 0.22);
      const a = Math.random() * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.arc(x, y, r, a, a + Math.PI * (0.8 + Math.random() * 1.2));
    } else {
      ctx.moveTo(x + t * 0.06, y);
      ctx.arc(x, y, t * 0.06, 0, Math.PI * 2);
    }
  }
  ctx.stroke();
}

/**
 * Textura con una tira de glifos.
 * @param {number} columnas glifos en horizontal
 * @param {number} filas    glifos en vertical
 * @param {number} celda    tamaño de cada celda en pixeles
 */
export function texturaGlifos(columnas, filas, celda = 64, { grosor = 0.07, marco = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = columnas * celda;
  canvas.height = filas * celda;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineWidth = celda * grosor;
  for (let c = 0; c < columnas; c++) {
    for (let f = 0; f < filas; f++) {
      if (Math.random() < 0.12) continue; // silencios entre palabras
      dibujarGlifo(ctx, c * celda + celda / 2, f * celda + celda / 2, celda * 0.8);
    }
  }
  if (marco) {
    ctx.fillRect(0, 0, canvas.width, celda * 0.06);
    ctx.fillRect(0, canvas.height - celda * 0.06, canvas.width, celda * 0.06);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Anillo ritual: circulos concentricos, radios y glifos en corona,
 * pensado para el mapeo plano de RingGeometry / CircleGeometry.
 */
export function texturaCirculoRitual(tam = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tam;
  const ctx = canvas.getContext('2d');
  const c = tam / 2;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';

  const circulo = (r, ancho, trazo = []) => {
    ctx.setLineDash(trazo);
    ctx.lineWidth = ancho;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  circulo(c * 0.98, 4);
  circulo(c * 0.93, 1.5, [14, 10]);
  circulo(c * 0.72, 3);
  circulo(c * 0.66, 1.5, [4, 12]);
  circulo(c * 0.56, 2);

  // Corona de glifos entre los radios 0.74 y 0.91
  const n = 36;
  ctx.lineWidth = 3.2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.save();
    ctx.translate(c + Math.cos(a) * c * 0.825, c + Math.sin(a) * c * 0.825);
    ctx.rotate(a + Math.PI / 2);
    dibujarGlifo(ctx, 0, 0, c * 0.11);
    ctx.restore();
  }
  // Radios que unen los circulos interiores
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * c * 0.56, c + Math.sin(a) * c * 0.56);
    ctx.lineTo(c + Math.cos(a) * c * 0.72, c + Math.sin(a) * c * 0.72);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * c * 0.64, c + Math.sin(a) * c * 0.64, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}
