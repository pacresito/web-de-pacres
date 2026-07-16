// Test de lógica pura: `npx tsx lib/fuera-de-ruta/datos.test.ts`. Fuera del build.
// Cuida los dos contratos entre datos y URL que rompen en silencio: un slug que
// choca con una ruta estática, y una zona del JSON que no existe en el mapa.
import assert from "assert";
import { datosDe, matrizDe, PROVINCIAS_CON_DATOS } from "./datos";
import { PROVINCIAS, RUTAS_RESERVADAS, provinciaDeSlug, slugProvincia } from "./provincias";
import { ZONAS_MAPA } from "@/data/fuera-de-ruta/zonas-mapa";

// --- Toda provincia con datos existe en el mapa, y su JSON dice ser ella ---
for (const slug of PROVINCIAS_CON_DATOS) {
  const nombre = provinciaDeSlug(slug);
  assert.ok(nombre, `la provincia con datos "${slug}" existe en el mapa de zonas`);
  assert.strictEqual(datosDe(slug)!.comunidad, nombre, `el JSON de "${slug}" declara comunidad "${nombre}"`);
}

// --- Ningún destino se llama como una ruta estática (quedaría inaccesible) ---
for (const slug of PROVINCIAS_CON_DATOS) {
  for (const d of datosDe(slug)!.destinos) {
    assert.ok(!RUTAS_RESERVADAS.includes(d.slug), `el destino "${d.slug}" choca con una ruta reservada`);
  }
}

// --- Ningún destino se llama como una provincia (mismo choque, un nivel arriba) ---
const slugsProvincia = PROVINCIAS.map(slugProvincia);
for (const slug of PROVINCIAS_CON_DATOS) {
  for (const d of datosDe(slug)!.destinos) {
    assert.ok(!slugsProvincia.includes(d.slug), `el destino "${d.slug}" choca con una provincia`);
  }
}

// --- Las zonas del JSON son las del mapa: si no, el paso de zonas filtra a 0 ---
for (const slug of PROVINCIAS_CON_DATOS) {
  const delMapa = new Set(ZONAS_MAPA[provinciaDeSlug(slug)!].zonas.map((z) => z.id));
  for (const z of datosDe(slug)!.zonas) {
    assert.ok(delMapa.has(z.id), `la zona "${z.id}" de ${slug} existe en el mapa generado`);
  }
  for (const d of datosDe(slug)!.destinos) {
    assert.ok(delMapa.has(d.zona), `la zona "${d.zona}" del destino "${d.slug}" existe en el mapa`);
  }
}

// --- La matriz acompaña a los datos (el planificador la da por hecha) ---
for (const slug of PROVINCIAS_CON_DATOS) {
  assert.ok(matrizDe(slug), `la provincia "${slug}" tiene matriz de tiempos`);
}

// --- Una provincia de escaparate no tiene datos, pero no revienta ---
assert.strictEqual(datosDe("murcia"), undefined, "provincia sin datos → undefined");
assert.strictEqual(datosDe("no-existe"), undefined, "provincia inexistente → undefined");

console.log("OK datos.test.ts");
