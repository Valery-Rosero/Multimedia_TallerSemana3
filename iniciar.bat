@echo off
rem ============================================================
rem  ECO DE VESPERIA - arranque con doble clic (Windows)
rem  Instala las dependencias si faltan, levanta el servidor y
rem  abre la escena en el navegador.
rem ============================================================
title Eco de Vesperia
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No se encontro Node.js en este equipo.
  echo  Descargalo de https://nodejs.org ^(version LTS^) y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

echo.
echo  Preparando Eco de Vesperia... ^(la primera vez tarda un poco^)
echo  Para detener el servidor, cierra esta ventana.
echo.
call npm start
pause
