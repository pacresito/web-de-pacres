// Test de lógica pura: `npx tsx lib/farma/buscar.test.ts`. Fuera del build.
import assert from "assert";
import { sinAcentos, coincide, contiene, filtrarFallback } from "./buscar";

// La consulta llega normalizada (como la preparan los buscadores); el texto no.
const busca = (texto: string, q: string) => coincide(texto, sinAcentos(q));

// --- Substring: sigue funcionando como antes (acentos, mayúsculas, fragmentos) ---
assert.ok(busca("PARACETAMOL CINFA 1G", "paracetamol"), "cadena exacta");
assert.ok(busca("PARACETAMOL CINFA 1G", "parace"), "prefijo/fragmento");
assert.ok(busca("PARACETAMOL CINFA 1G", "cinfa"), "palabra interior");
assert.ok(busca("Ibuprofeno Kern", "IBUPROFENO"), "insensible a mayúsculas");
assert.ok(busca("Ácido acetilsalicílico", "acido acetil"), "insensible a acentos");
assert.ok(!busca("Paracetamol", "omeprazol"), "sin relación no coincide");

// --- Typos: una edición en consultas medias, dos en largas ---
assert.ok(busca("PARACETAMOL CINFA", "paracetmol"), "falta una letra (dist 1)");
assert.ok(busca("PARACETAMOL CINFA", "paracetammol"), "letra de más (dist 1)");
assert.ok(busca("Ibuprofeno Kern", "ibuprofeno kenr"), "typo en palabra distinta a la 1ª");
assert.ok(busca("Omeprazol Normon", "omeprasol"), "sustitución (s por z)");
assert.ok(busca("Amoxicilina Sandoz", "amoxicillina"), "consulta larga, dist 1");

// --- Orden de palabras indiferente (cada palabra casa donde sea) ---
assert.ok(busca("AMLODIPINO CINFA 5MG", "cinfa amlodipino"), "orden invertido");
assert.ok(busca("AMLODIPINO CINFA 5MG", "amlodipino cinfa"), "orden natural");
assert.ok(busca("AMLODIPINO CINFA 5MG", "cinfa anlodipi"), "orden invertido + typo + prefijo");
assert.ok(!busca("AMLODIPINO CINFA 5MG", "cinfa omeprazol"), "una palabra sin casar → no sale");

// --- Typo en un nombre a medio teclear (prefijo con 1 error) ---
assert.ok(busca("AMLODIPINO NORMON 5MG", "anlodipi"), "prefijo con typo (n por m)");
assert.ok(busca("AMLODIPINO NORMON 5MG", "anlodipin"), "prefijo con typo, más largo");
assert.ok(busca("Simvastatina Cinfa", "sinvastati"), "prefijo con typo (n por m)");

// --- Límites: no relajar de más ---
assert.ok(!busca("Paracetamol", "aax"), "consulta corta (<4): sin tolerancia");
assert.ok(!busca("Paracetamol", "xxxxcetamol"), "demasiadas ediciones para el umbral");
assert.ok(!busca("Ibuprofeno", "omeprazol"), "dos palabras dispares no coinciden");

// --- Fallback global: el fuzzy solo entra si la estricta se queda sin resultados ---
// "amlo" case exacto con AMLODIPINO, así que ALMOTRIPTAN (transposición amlo/almo) no debe salir.
assert.ok(contiene("AMLODIPINO CINFA", sinAcentos("amlo")), "estricta: substring");
assert.ok(!contiene("ALMOTRIPTAN NORMON", sinAcentos("amlo")), "estricta: la transposición NO cuela");

const universo = ["AMLODIPINO CINFA 5MG", "ALMOTRIPTAN NORMON 12,5MG"];
const buscarFallback = (q: string) =>
  filtrarFallback(universo, (x) => contiene(x, sinAcentos(q)), (x) => coincide(x, sinAcentos(q)));
assert.deepStrictEqual(buscarFallback("amlo"), ["AMLODIPINO CINFA 5MG"], "amlo: solo el exacto, sin almotriptan");
assert.deepStrictEqual(buscarFallback("anlodipino"), ["AMLODIPINO CINFA 5MG"], "typo total: el fuzzy rescata amlodipino");

console.log("OK buscar.test.ts");
