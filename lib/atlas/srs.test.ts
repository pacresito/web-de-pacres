// Test de lógica pura: `npx tsx lib/atlas/srs.test.ts`. Fuera del build.
import assert from "assert";
import { calificar, cuenta, DATOS, dominioPais, huecos, MAX_EN_EL_AIRE, migrar, migrarDato, montar, nuevaVida, siguiente, sospecha, type Mazo } from "./srs";
import { PAISES } from "./paises";

const DIA = 86_400_000;
const AHORA = Date.parse("2026-08-21T12:00:00Z");
const haceDias = (n: number) => AHORA - n * DIA;
const vida = (v: number, dias: number) => ({ visto: haceDias(dias), vida: v });

// La vida de un dato
// La primera vez no hay transcurrido del que tirar, así que cada nota arranca en su valor fijo.
assert.strictEqual(nuevaVida(undefined, "bien", AHORA), 1);
assert.strictEqual(nuevaVida(undefined, "facil", AHORA), 4);
assert.strictEqual(nuevaVida(undefined, "fallo", AHORA), 0.01);

// Acertando a tiempo, la vida se multiplica por su nota.
assert.strictEqual(nuevaVida(vida(10, 10), "bien", AHORA), 20);
assert.strictEqual(nuevaVida(vida(10, 10), "facil", AHORA), 40);

// Y fallar la desploma, venga de donde venga: un año de vida no protege de haberlo olvidado.
assert.strictEqual(nuevaVida(vida(365, 400), "fallo", AHORA), 0.01);

// La ausencia como evidencia
// Un dato con vida de 3 días acertado el día 14 no vale 6: vale 28. Volver tarde no es daño,
// es la prueba de que aguantaba más de lo que el sistema creía, y el sistema lo cobra.
assert.strictEqual(nuevaVida(vida(3, 14), "bien", AHORA), 28);
// Pero llegar antes de tiempo no penaliza ni regala: se multiplica la vida que ya tenía.
assert.strictEqual(nuevaVida(vida(10, 2), "bien", AHORA), 20);

// La cola es un ranking de sospecha
// 1 es el punto en que un dato acaba de agotar su vida; por encima, se sospecha que se cayó.
assert.strictEqual(sospecha(vida(10, 10), AHORA), 1);
assert.strictEqual(sospecha(vida(10, 30), AHORA), 3);
// Un dato sin ver da el mínimo, así que nunca se tapa: se enseña en vez de preguntarse.
assert.ok(sospecha(undefined, AHORA) < sospecha(vida(1000, 0), AHORA));

// Cuántos huecos: los marca la madurez, no la sospecha
const conVidas = (vs: Partial<Record<(typeof DATOS)[number], number>>): Mazo => ({
  es: Object.fromEntries(Object.entries(vs).map(([d, v]) => [d, vida(v as number, 0)])),
});
// País flojo: un solo hueco y tres datos a la vista, que son el material de estudio.
assert.strictEqual(huecos(conVidas({}), "es"), 1);
assert.strictEqual(huecos(conVidas({ nombre: 100 }), "es"), 1);
// A medias, dos y dos.
assert.strictEqual(huecos(conVidas({ nombre: 100, capital: 100 }), "es"), 2);
// Aprendido, tres preguntas y una pista. La proporción estudio:examen se invierte sola.
assert.strictEqual(huecos(conVidas({ nombre: 100, capital: 100, bandera: 100, lugar: 100 }), "es"), 3);
// Y el umbral es la vida, no el número de aciertos: veinte días aún no es aprendido.
assert.strictEqual(huecos(conVidas({ nombre: 20, capital: 20, bandera: 20, lugar: 20 }), "es"), 1);

// El montaje de la tarjeta
const espana = PAISES.find((p) => p.id === "es")!;
// La primera vez no se tapa nada: se ve entera y se califica igual, que es el triaje de lo
// que ya se sabe.
assert.deepStrictEqual(montar({}, espana, AHORA).tapados, []);
assert.strictEqual(montar({}, espana, AHORA).primeraVez, true);

// Con todo aprendido y todo igual de olvidado, se tapan tres y queda una pista: nunca los cuatro.
const aprendido: Mazo = { es: { nombre: vida(100, 300), capital: vida(100, 200), bandera: vida(100, 100), lugar: vida(100, 50) } };
const t = montar(aprendido, espana, AHORA);
assert.strictEqual(t.tapados.length, 3);
assert.strictEqual(t.primeraVez, false);
// Se tapa lo más sospechoso y la pista es lo que mejor se tiene agarrado: aquí, el lugar.
assert.deepStrictEqual(t.tapados, ["nombre", "capital", "bandera"]);
assert.ok(!t.tapados.includes("lugar"));

// Calificar solo toca el dato calificado, no la tarjeta entera. Es la razón de que cada dato
// lleve su propio reloj: acertar la bandera no debe estirar la capital.
const tras = calificar(aprendido, "es", "nombre", "fallo", AHORA);
assert.strictEqual(tras.es.nombre!.vida, 0.01);
assert.strictEqual(tras.es.capital!.vida, 100);

// Qué país toca
const orden = PAISES.map((p) => p.id);
// Con el mazo vacío, el primero del barrido geográfico.
assert.strictEqual(siguiente({}, orden, AHORA)!.id, orden[0]);
// Con algo pasado de vida, ese país manda por encima de meter uno nuevo.
assert.strictEqual(siguiente({ pt: { capital: vida(1, 9) } }, orden, AHORA)!.id, "pt");
// Si nada ha superado su vida, entra uno nuevo en vez de adelantar trabajo.
assert.strictEqual(siguiente({ es: { nombre: vida(100, 1) } }, orden, AHORA)!.id, orden[0] === "es" ? orden[1] : orden[0]);

// El freno invisible: con demasiados países sin aprender, deja de entrar gente nueva aunque no
// haya nada vencido. Una tarde de entusiasmo no debe volverse una deuda de cuatrocientas.
const enElAire: Mazo = Object.fromEntries(PAISES.slice(0, 9).map((p) => [p.id, { nombre: vida(100, 1) }]));
assert.strictEqual(siguiente(enElAire, orden, AHORA)!.id, orden[9]); // nueve en el aire: aún entran
assert.ok(MAX_EN_EL_AIRE > 9, "el freno no debe saltar con los diez países de la fase 1");

{
  // La cuenta del prompt: visto es tener algún dato; aprendido, tenerlos los cuatro.
  const viejo = { visto: Date.now(), vida: 100 };
  const nuevo = { visto: Date.now(), vida: 2 };
  assert.deepEqual(cuenta({}), { vistos: 0, aprendidos: 0 });
  assert.deepEqual(cuenta({ es: { nombre: nuevo } }), { vistos: 1, aprendidos: 0 });
  assert.deepEqual(
    cuenta({ es: { nombre: viejo, capital: viejo, bandera: viejo, lugar: viejo }, fr: { nombre: viejo, capital: nuevo } }),
    { vistos: 2, aprendidos: 1 },
  );
  // Un país que no está en la lista no cuenta: el mazo puede traer restos de otra versión.
  assert.deepEqual(cuenta({ zz: { nombre: viejo } }), { vistos: 0, aprendidos: 0 });
}

// El dominio de un país entero, que es por lo que filtra explorar
{
  const viejo = vida(400, 1);   // aprendido de sobra
  const nuevo = vida(1, 0);     // empezado
  const cuatro = { nombre: viejo, capital: viejo, bandera: viejo, lugar: viejo };
  assert.strictEqual(dominioPais({ es: cuatro }, "es"), "aprendido");
  // Con tres de cuatro todavía no: es el mismo listón que usa `cuenta` para «aprendido».
  assert.strictEqual(dominioPais({ es: { ...cuatro, lugar: nuevo } }, "es"), "empezado");
  assert.strictEqual(dominioPais({ es: { nombre: nuevo } }, "es"), "empezado");
  assert.strictEqual(dominioPais({}, "es"), "sin ver");
}

// El nombre viejo del cuarto dato
{
  const e = vida(37, 4);
  // Lo guardado como `forma` sale como `lugar`, con su reloj intacto: es el mazo de verdad de
  // quien lleva meses jugando, y perderlo es empezar ese dato de cero sin que nada avise.
  const migrado = migrar({ es: { nombre: vida(9, 1), forma: e } });
  assert.deepStrictEqual(migrado.es.lugar, e);
  assert.ok(!("forma" in migrado.es));
  assert.deepStrictEqual(migrado.es.nombre, vida(9, 1));

  // Un mazo ya migrado se devuelve **tal cual, la misma referencia**: quien lo lee compara por
  // identidad, y una copia nueva por lectura sería un bucle de renders.
  const nuevo: Mazo = { es: { lugar: e } };
  assert.strictEqual(migrar(nuevo), nuevo);
  assert.strictEqual(migrar(migrado), migrado);
  assert.deepStrictEqual(migrar({}), {});

  // Conviviendo los dos manda el nuevo, que es el que se calificó después.
  const dos = migrar({ es: { forma: vida(1, 0), lugar: e } });
  assert.deepStrictEqual(dos.es.lugar, e);

  // Y un país sin el dato viejo no se toca, aunque otro del mismo mazo sí lo lleve.
  const mixto = migrar({ es: { forma: e }, fr: { capital: vida(5, 2) } });
  assert.deepStrictEqual(mixto.fr, { capital: vida(5, 2) });

  // La cola pendiente viaja con el nombre del dato dentro: un móvil sin cobertura desde antes
  // del cambio la sube con el viejo, y sin traducir se tiraría entera al validarla.
  assert.strictEqual(migrarDato("forma"), "lugar");
  assert.strictEqual(migrarDato("capital"), "capital");
  assert.ok((DATOS as readonly string[]).includes(migrarDato("forma")));
}

console.log("srs: ok");
