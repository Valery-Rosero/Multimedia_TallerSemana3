#!/usr/bin/env sh
# ============================================================
#  ECO DE VESPERIA - arranque en un paso (macOS / Linux)
#  Instala las dependencias si faltan, levanta el servidor y
#  abre la escena en el navegador.
# ============================================================
cd "$(dirname "$0")" || exit 1

if ! command -v npm >/dev/null 2>&1; then
  echo "No se encontro Node.js. Descargalo de https://nodejs.org (version LTS)."
  exit 1
fi

echo "Preparando Eco de Vesperia... (la primera vez tarda un poco)"
echo "Para detener el servidor, pulsa Ctrl + C."
npm start
