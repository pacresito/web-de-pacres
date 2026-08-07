// Test de lógica pura: `npx tsx lib/arbol/santoral.test.ts`. Fuera del build.
import assert from "assert";
import { normalizar, onomasticaDe, pascua, primerDomingoDeMayo, viernesDeDolores } from "./santoral";

// --- El calendario móvil, contra años conocidos: el algoritmo no se lee, se comprueba ---
const escribir = (ms: number) => new Date(ms).toISOString().slice(0, 10);
assert.strictEqual(escribir(pascua(2026)), "2026-04-05");
assert.strictEqual(escribir(pascua(2027)), "2027-03-28");
assert.strictEqual(escribir(pascua(2024)), "2024-03-31");
assert.strictEqual(escribir(pascua(2038)), "2038-04-25", "la Pascua más tardía posible");
assert.strictEqual(viernesDeDolores(2026), "03-27", "el viernes antes del Domingo de Ramos");
assert.strictEqual(viernesDeDolores(2027), "03-19");
// El primer domingo de mayo, y de verdad domingo, caiga el 1 o caiga el 7.
for (const año of [2026, 2027, 2028, 2029, 2030, 2031, 2032]) {
  const dia = Number(primerDomingoDeMayo(año).slice(3));
  assert.ok(dia >= 1 && dia <= 7, `${año}: el día de la madre se ha ido al ${dia} de mayo`);
  assert.strictEqual(new Date(Date.UTC(año, 4, dia)).getUTCDay(), 0, `${año}: no cae en domingo`);
}

assert.strictEqual(normalizar("  Ángel   María "), "angel maria");

// El nombre tal cual, con tilde o sin ella y escriba quien lo escriba.
assert.strictEqual(onomasticaDe("José"), "03-19");
assert.strictEqual(onomasticaDe("Jose"), "03-19");
assert.strictEqual(onomasticaDe("Ángel"), "10-02");
assert.strictEqual(onomasticaDe("Carmen"), "07-16");

// Los apodos con los que aparece media familia en los documentos.
assert.strictEqual(onomasticaDe("Pepe"), onomasticaDe("José"));
assert.strictEqual(onomasticaDe("Yago"), onomasticaDe("Santiago"));
assert.strictEqual(onomasticaDe("Javi"), "12-03");

// En el compuesto manda el segundo, y el «María» de delante se cae con sus acompañantes.
assert.strictEqual(onomasticaDe("María Teresa"), onomasticaDe("Teresa"));
assert.strictEqual(onomasticaDe("María José"), onomasticaDe("José"));
assert.strictEqual(onomasticaDe("Mari Carmen"), onomasticaDe("Carmen"));
assert.strictEqual(onomasticaDe("María del Carmen"), onomasticaDe("Carmen"));
assert.strictEqual(onomasticaDe("Juan Carlos"), onomasticaDe("Juan"), "sin María delante manda el primero");
assert.strictEqual(onomasticaDe("Miguel Ángel"), onomasticaDe("Miguel"));
// Pero María a secas sí es la suya: no queda nada detrás a lo que cederle el santo.
assert.strictEqual(onomasticaDe("María"), "09-12");
// Y el nombre entero gana a sus partes cuando él mismo es un santo.
assert.strictEqual(onomasticaDe("Juan de Dios"), "03-08");

// Quien no tiene santo no lo tiene: es la mitad de la gracia de la tabla.
for (const sin of ["Jara", "Nora", "Horacio", "Sin nombre", "Yodelina", "Marido"]) {
  assert.strictEqual(onomasticaDe(sin), null, `${sin} no debería tener onomástica`);
}

// Lola es del Viernes de Dolores, que se mueve con la Semana Santa y no es una fecha fija.
assert.strictEqual(typeof onomasticaDe("Lola"), "function");
assert.strictEqual((onomasticaDe("Lola") as (a: number) => string)(2026), "03-27");
assert.strictEqual(onomasticaDe("Lola"), onomasticaDe("María Dolores"));

// Ninguna fecha inventada: todas son un día que existe en el calendario.
for (const nombre of ["Pilar", "Lucas", "Flora", "Ricardo", "Mercedes", "Montse", "Lola"]) {
  const dia = onomasticaDe(nombre)!;
  const fijo = typeof dia === "function" ? dia(2026) : dia;
  assert.match(fijo, /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, `${nombre}: ${fijo}`);
}

console.log("santoral: ok");
