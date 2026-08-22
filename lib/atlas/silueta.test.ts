// npx tsx lib/atlas/silueta.test.ts
import assert from "node:assert";
import { marcoDeTinta } from "./silueta";

// El que llena el lienzo a lo ancho se queda como está.
assert.equal(marcoDeTinta("M0.0,0.0L1000.0,500.0L0.0,1000.0Z"), "0.0 0 1000.0 1000");

// El estrecho se ciñe por los lados y conserva el alto: es lo que lo deja pegado al margen sin
// cambiar de tamaño.
assert.equal(marcoDeTinta("M400.0,0.0L600.0,500.0L400.0,1000.0Z"), "400.0 0 200.0 1000");

// Sin dibujo, el lienzo entero: un viewBox vacío no pinta nada y el fallo saldría como una ficha
// en blanco, sin error que lo delate.
assert.equal(marcoDeTinta(""), "0 0 1000 1000");

console.log("silueta ok");
