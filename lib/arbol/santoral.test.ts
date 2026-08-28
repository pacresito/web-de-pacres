// Test de lógica pura: `npx tsx lib/arbol/santoral.test.ts`. Fuera del build.
import assert from "assert";
import {
  normalizar,
  onomasticaDe,
  onomasticaDePersona,
  pascua,
  primerDomingoDeMayo,
  proximaVez,
  sabadoDeLaVirgenDelMar,
  viernesDeDolores,
} from "./santoral";

// La excepción por persona, que es para quien celebra un día que su nombre no da
// p19 se llama María José y celebra San José, no el 12 de septiembre de las Marías.
assert.strictEqual(onomasticaDe("María"), "09-12");
assert.strictEqual(onomasticaDePersona({ id: "p19", nombre: "María" }), "03-19");
// Al que no está apuntado le manda su nombre, como a todo el mundo.
assert.strictEqual(onomasticaDePersona({ id: "p318", nombre: "María" }), onomasticaDe("María"));
// Y quien lleva el suyo entero en el JSON no necesita excepción: el nombre ya lo sitúa.
assert.strictEqual(onomasticaDePersona({ id: "p443", nombre: "María de los Ángeles" }), "08-02");
assert.strictEqual(onomasticaDePersona({ id: "p29", nombre: "José Alberto" }), "03-19");
// Las Eva son del 19 de diciembre, y la de los Sola es la que va apuntada aparte.
assert.strictEqual(onomasticaDe("Eva"), "12-19");
assert.strictEqual(onomasticaDePersona({ id: "p8", nombre: "Eva" }), "06-25");

// El calendario móvil, contra años conocidos: el algoritmo no se lee, se comprueba
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

// El Mar es la patrona de Almería: el sábado anterior al último domingo de agosto, y de
// verdad sábado. Los años en que agosto acaba en sábado no es el último, que es el error
// que canta —2024 y 2030 son de esos—.
assert.strictEqual(sabadoDeLaVirgenDelMar(2026), "08-29");
assert.strictEqual(sabadoDeLaVirgenDelMar(2024), "08-24", "el último sábado de 2024 fue el 31");
assert.strictEqual(sabadoDeLaVirgenDelMar(2030), "08-24");
for (const año of [2026, 2027, 2028, 2029, 2030, 2031, 2032]) {
  const dia = Number(sabadoDeLaVirgenDelMar(año).slice(3));
  assert.strictEqual(new Date(Date.UTC(año, 7, dia)).getUTCDay(), 6, `${año}: no cae en sábado`);
  assert.ok(dia + 8 > 31, `${año}: el domingo de después no es el último de agosto`);
}
// Y las María del Mar celebran con ella, que el «María» de delante se cae como siempre.
assert.strictEqual(onomasticaDe("Mar"), onomasticaDe("María del Mar"));

assert.strictEqual(normalizar("  Ángel   María "), "angel maria");

// El nombre tal cual, con tilde o sin ella y escriba quien lo escriba.
assert.strictEqual(onomasticaDe("José"), "03-19");
assert.strictEqual(onomasticaDe("Jose"), "03-19");
assert.strictEqual(onomasticaDe("Carmen"), "07-16");

// Los Ángel, las Ángeles y las María Ángeles de esta familia celebran todos el mismo día.
for (const nombre of ["Ángel", "Ángeles", "María Ángeles"]) assert.strictEqual(onomasticaDe(nombre), "08-02", nombre);
// Pero Ángela no: es otro nombre y va por su cuenta.
assert.strictEqual(onomasticaDe("Ángela"), "01-27");

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
for (const nombre of ["Pilar", "Lucas", "Flora", "Ricardo", "Mercedes", "Montse", "Lola", "Mar"]) {
  const dia = onomasticaDe(nombre)!;
  const fijo = typeof dia === "function" ? dia(2026) : dia;
  assert.match(fijo, /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, `${nombre}: ${fijo}`);
}

// La cuenta atrás
assert.deepStrictEqual(proximaVez("2026-08-06", "08-06"), { fecha: "2026-08-06", faltan: 0 }, "hoy es hoy");
assert.deepStrictEqual(proximaVez("2026-08-06", "08-07"), { fecha: "2026-08-07", faltan: 1 });
// El que ya pasó este año cae en el siguiente, y el cambio de año no lo despista.
assert.deepStrictEqual(proximaVez("2026-08-06", "08-05"), { fecha: "2027-08-05", faltan: 364 });
assert.deepStrictEqual(proximaVez("2026-12-31", "01-01"), { fecha: "2027-01-01", faltan: 1 });
// El 29 de febrero se celebra el 1 de marzo mientras no exista, y en su día cuando existe.
assert.deepStrictEqual(proximaVez("2026-02-27", "02-29"), { fecha: "2026-03-01", faltan: 2 });
assert.deepStrictEqual(proximaVez("2028-02-27", "02-29"), { fecha: "2028-02-29", faltan: 2 });
// Y el 28 de febrero de un año no bisiesto no se lo lleva por delante.
assert.strictEqual(proximaVez("2026-02-28", "02-29").faltan, 1);
// Lo que se mueve se resuelve en el año en que cae, no en el de hoy: el día de la madre
// de 2026 es el 3 de mayo y el de 2027, el 2.
assert.deepStrictEqual(proximaVez("2026-04-01", primerDomingoDeMayo), { fecha: "2026-05-03", faltan: 32 });
assert.deepStrictEqual(proximaVez("2026-05-04", primerDomingoDeMayo), { fecha: "2027-05-02", faltan: 363 });

console.log("santoral: ok");
