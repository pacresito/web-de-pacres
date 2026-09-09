// Deja las fotos de `public/` en 1600px de ancho y mozjpeg, sobrescribiéndolas.
// Reemplaza a `sips -Z 1600` + `formatOptions 70`, que las dejaba al doble de peso:
// ese peso se paga en cada deployment, porque Vercel guarda el output entero de
// todos los que retiene. Normaliza además la orientación EXIF rotando los píxeles,
// que es el gotcha que dejó dos fotos publicadas boca abajo.
// Salta la foto cuya recompresión no gane al menos un 10%, así volver a pasarlo
// sobre una carpeta entera no degrada lo que ya está optimizado.
// sharp llega instalado con Next; no es dependencia declarada del proyecto.
//
// Uso: node scripts/optimizar-fotos.mjs public/fuera-de-ruta/img [más rutas...]

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ANCHO = 1600;
const CALIDAD = 70;
const GANANCIA_MINIMA = 0.1;

const rutas = process.argv.slice(2);
if (rutas.length === 0) {
  console.error("Uso: node scripts/optimizar-fotos.mjs <archivo|directorio>...");
  process.exit(1);
}

const jpgs = (ruta) =>
  statSync(ruta).isDirectory()
    ? readdirSync(ruta)
        .filter((f) => /\.jpe?g$/i.test(f))
        .sort()
        .map((f) => join(ruta, f))
    : [ruta];

let antes = 0;
let despues = 0;
let saltadas = 0;

for (const archivo of rutas.flatMap(jpgs)) {
  const original = readFileSync(archivo);
  const optimizada = await sharp(original)
    .rotate()
    .resize({ width: ANCHO, withoutEnlargement: true })
    .jpeg({ quality: CALIDAD, mozjpeg: true })
    .keepIccProfile()
    .toBuffer();

  antes += original.length;
  if (optimizada.length > original.length * (1 - GANANCIA_MINIMA)) {
    despues += original.length;
    saltadas++;
    continue;
  }
  writeFileSync(archivo, optimizada);
  despues += optimizada.length;
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`${archivo}  ${kb(original.length)} → ${kb(optimizada.length)}`);
}

const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;
console.log(
  `\n${mb(antes)} → ${mb(despues)} (${Math.round((1 - despues / antes) * 100)}% menos)` +
    (saltadas ? `, ${saltadas} ya optimizada(s)` : ""),
);
