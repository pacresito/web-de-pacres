// Test de lógica pura: `npx tsx lib/atlas/srs.test.ts`. Fuera del build.
import assert from "assert";
import { ACIERTOS_APRENDIDO, calificar, cuenta, DATOS, DESCANSO, dominio, dominioPais, huecos, MAX_EN_EL_AIRE, montar, nuevaVida, nuevosAciertos, siguiente, sospecha, type Mazo } from "./srs";
import { PAISES } from "./paises";

const DIA = 86_400_000;
const AHORA = Date.parse("2026-08-21T12:00:00Z");
const haceDias = (n: number) => AHORA - n * DIA;
// Un dato con vida pero sin racha, que es lo normal mientras se aprende; y uno ya aprendido, con
// el contador lleno. Los dos ejes van aparte a propósito: la vida ordena la cola, el contador dice
// si está aprendido, y hace falta poder moverlos por separado para probar cualquiera de los dos.
const vida = (v: number, dias: number) => ({ visto: haceDias(dias), vida: v, aciertos: 0 });
const sabido = (v: number, dias: number) => ({ ...vida(v, dias), aciertos: ACIERTOS_APRENDIDO });
// Espejo de VIDA_INICIAL.fallo, que no se exporta. Vale escrito a mano: es la que gobierna cuánto
// insiste una sesión y la que el descanso no frena, así que moverla tiene que hacer fallar esto.
const VIDA_FALLO = 0.001;

// La vida de un dato
// La primera vez no hay transcurrido del que tirar, así que cada nota arranca en su valor fijo.
assert.strictEqual(nuevaVida(undefined, "bien", AHORA), 1);
assert.strictEqual(nuevaVida(undefined, "facil", AHORA), 4);
assert.strictEqual(nuevaVida(undefined, "fallo", AHORA), VIDA_FALLO);

// Acertando a tiempo, la vida se multiplica por su nota.
assert.strictEqual(nuevaVida(vida(10, 10), "bien", AHORA), 20);
assert.strictEqual(nuevaVida(vida(10, 10), "facil", AHORA), 40);

// Y fallar la desploma, venga de donde venga: un año de vida no protege de haberlo olvidado.
assert.strictEqual(nuevaVida(vida(365, 400), "fallo", AHORA), VIDA_FALLO);

// Solo el tiempo transcurrido suma
// Acertar sin que haya pasado nada no prueba nada y no paga nada: la vida se queda donde estaba.
assert.strictEqual(nuevaVida(vida(0.01, 0), "bien", AHORA), 0.01);
assert.strictEqual(nuevaVida(vida(10, 0), "facil", AHORA), 10);
// La cuenta que motivó la regla: un dato fallado y acertado siete veces en tres minutos se queda
// en minutos de vida. Multiplicando por la vida previa salían 1,28 días sin haber pasado ninguno.
{
  let e = { visto: AHORA, vida: VIDA_FALLO, aciertos: 0 };
  for (let i = 1; i <= 7; i++) {
    const ahora = AHORA + i * 25_000;
    e = { ...e, visto: ahora, vida: nuevaVida(e, "bien", ahora) };
  }
  assert.ok(e.vida < 0.02, `siete aciertos en tres minutos dejan ${e.vida} días de vida`);
}

// El contador de aciertos, que es lo que marca «aprendido»
// Sube con la nota —fácil vale por dos— y no pasa del listón: por encima nadie lo lee.
assert.strictEqual(nuevosAciertos(undefined, "bien"), 1);
assert.strictEqual(nuevosAciertos(undefined, "facil"), 2);
assert.strictEqual(nuevosAciertos(undefined, "fallo"), 0);
assert.strictEqual(nuevosAciertos(sabido(1, 0), "bien"), ACIERTOS_APRENDIDO);
// Fallar cuesta dos aciertos y no la racha entera, y con dos aciertos se vuelve donde se estaba.
const castigado = nuevosAciertos(sabido(1, 0), "fallo");
assert.strictEqual(castigado, ACIERTOS_APRENDIDO - 2);
assert.strictEqual(nuevosAciertos({ ...vida(1, 0), aciertos: castigado }, "facil"), ACIERTOS_APRENDIDO);
assert.strictEqual(nuevosAciertos(vida(1, 0), "fallo"), 0); // y no baja de cero

// Los cuatro estados de un dato, que son los que pinta la marca de explorar. Los dos listones son
// independientes: uno lo firma el trabajo hecho y el otro el calendario.
assert.strictEqual(dominio(undefined), "sin ver");
assert.strictEqual(dominio(vida(100, 0)), "empezado");   // aguanta, pero no se ha demostrado
assert.strictEqual(dominio(sabido(2, 0)), "aprendido");  // demostrado, pero aún no aguanta
assert.strictEqual(dominio(sabido(100, 0)), "dominado"); // las dos cosas

// La ausencia como evidencia
// Un dato con vida de 3 días acertado el día 14 no vale 6: vale 28. Volver tarde no es daño,
// es la prueba de que aguantaba más de lo que el sistema creía, y el sistema lo cobra.
assert.strictEqual(nuevaVida(vida(3, 14), "bien", AHORA), 28);
// Y llegar antes de tiempo no penaliza, pero tampoco multiplica: solo suma lo que se demostró.
assert.strictEqual(nuevaVida(vida(10, 2), "bien", AHORA), 12);
assert.strictEqual(nuevaVida(vida(10, 2), "facil", AHORA), 16);

// La cola es un ranking de sospecha
// 1 es el punto en que un dato acaba de agotar su vida; por encima, se sospecha que se cayó.
assert.strictEqual(sospecha(vida(10, 10), AHORA), 1);
assert.strictEqual(sospecha(vida(10, 30), AHORA), 3);
// Un dato sin ver da el mínimo, así que nunca se tapa: se enseña en vez de preguntarse.
assert.ok(sospecha(undefined, AHORA) < sospecha(vida(1000, 0), AHORA));

// Cuántos huecos: los marca el contador, no la vida ni la sospecha
const conAciertos = (as: Partial<Record<(typeof DATOS)[number], number>>): Mazo => ({
  es: Object.fromEntries(Object.entries(as).map(([d, a]) => [d, { ...vida(100, 0), aciertos: a as number }])),
});
const LLENO = ACIERTOS_APRENDIDO;
// País flojo: un solo hueco y tres datos a la vista, que son el material de estudio.
assert.strictEqual(huecos(conAciertos({}), "es"), 1);
assert.strictEqual(huecos(conAciertos({ nombre: LLENO }), "es"), 1);
// A medias, dos y dos.
assert.strictEqual(huecos(conAciertos({ nombre: LLENO, capital: LLENO }), "es"), 2);
// Aprendido, tres preguntas y una pista. La proporción estudio:examen se invierte sola.
assert.strictEqual(huecos(conAciertos({ nombre: LLENO, capital: LLENO, bandera: LLENO, lugar: LLENO }), "es"), 3);
// Y el umbral es el contador, no la vida: cien días de vida con un acierto de menos no cuenta.
assert.strictEqual(huecos(conAciertos({ nombre: LLENO - 1, capital: LLENO - 1, bandera: LLENO - 1, lugar: LLENO - 1 }), "es"), 1);

// El montaje de la tarjeta
const espana = PAISES.find((p) => p.id === "es")!;
// La primera vez no se tapa nada: se ve entera y se califica igual, que es el triaje de lo
// que ya se sabe.
assert.deepStrictEqual(montar({}, espana, AHORA).tapados, []);
assert.strictEqual(montar({}, espana, AHORA).primeraVez, true);

// Con todo aprendido y todo igual de olvidado, se tapan tres y queda una pista: nunca los cuatro.
const aprendido: Mazo = { es: { nombre: sabido(100, 300), capital: sabido(100, 200), bandera: sabido(100, 100), lugar: sabido(100, 50) } };
const t = montar(aprendido, espana, AHORA);
assert.strictEqual(t.tapados.length, 3);
assert.strictEqual(t.primeraVez, false);
// Se tapa lo más sospechoso y la pista es lo que mejor se tiene agarrado: aquí, el lugar.
assert.deepStrictEqual(t.tapados, ["nombre", "capital", "bandera"]);
assert.ok(!t.tapados.includes("lugar"));

// Calificar solo toca el dato calificado, no la tarjeta entera. Es la razón de que cada dato
// lleve su propio reloj: acertar la bandera no debe estirar la capital.
const tras = calificar(aprendido, "es", "nombre", "fallo", AHORA);
assert.strictEqual(tras.es.nombre!.vida, VIDA_FALLO);
assert.strictEqual(tras.es.capital!.vida, 100);
// Y mueve los dos relojes del dato: la vida y el contador.
assert.strictEqual(tras.es.nombre!.aciertos, ACIERTOS_APRENDIDO - 2);
assert.strictEqual(tras.es.capital!.aciertos, ACIERTOS_APRENDIDO);

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
const enElAire: Mazo = Object.fromEntries(PAISES.slice(0, 9).map((p) => [p.id, { nombre: vida(2, 1) }]));
assert.strictEqual(siguiente(enElAire, orden, AHORA)!.id, orden[9]); // nueve en el aire: aún entran
// El borde exacto del tope: con uno menos entra gente nueva, con el tope justo ya no.
{
  const alTope: Mazo = Object.fromEntries(PAISES.slice(0, MAX_EN_EL_AIRE).map((p) => [p.id, { nombre: vida(2, 1) }]));
  assert.ok(PAISES.slice(0, MAX_EN_EL_AIRE).some((p) => p.id === siguiente(alTope, orden, AHORA)!.id));
}

// Y lo que cuenta como "en el aire" es la vida, no el contador. Si contara el contador —o si el
// listón fuera el arranque de «fácil»— una tarde maratón marcando fácil abriría el mazo entero.
{
  const treinta = PAISES.slice(0, MAX_EN_EL_AIRE);
  const crudos: Mazo = Object.fromEntries(treinta.map((p) => [p.id, { nombre: vida(2, 0.5) }]));
  const asentados: Mazo = Object.fromEntries(treinta.map((p) => [p.id, { nombre: vida(8, 1) }]));
  assert.ok(treinta.some((p) => p.id === siguiente(crudos, orden, AHORA)!.id), "treinta crudos frenan");
  assert.strictEqual(siguiente(asentados, orden, AHORA)!.id, orden[MAX_EN_EL_AIRE]);
  // Y el contador lleno no libera el freno por sí solo: eso se gana esperando, no acertando.
  const sabidos: Mazo = Object.fromEntries(treinta.map((p) => [p.id, { nombre: sabido(2, 0.5) }]));
  assert.ok(treinta.some((p) => p.id === siguiente(sabidos, orden, AHORA)!.id));
  // Y un «fácil» de primera vez asienta en el acto, que nace justo en el listón: el freno
  // dosifica lo que hay que aprender, no lo que ya se sabe.
  const recienFaciles: Mazo = Object.fromEntries(treinta.map((p) => [p.id, { nombre: vida(4, 0) }]));
  assert.strictEqual(siguiente(recienFaciles, orden, AHORA)!.id, orden[MAX_EN_EL_AIRE]);
}

// El descanso: lo recién visto no repite habiendo otra cosa que preguntar
{
  const reciente = (ms: number, v: number) => ({ visto: AHORA - ms, vida: v, aciertos: 0 });
  // La sesión activa: treinta países en el aire —el freno puesto, no entran nuevos— y todos
  // repasados hace un rato, que es cuando la sospecha de todo el mazo se queda en milésimas.
  const base = PAISES.slice(0, MAX_EN_EL_AIRE);
  const enSesion: Mazo = Object.fromEntries(base.map((p) => [p.id, { nombre: reciente(20 * 60_000, 2) }]));
  const fallado = base[0].id;
  // Un dato que se acaba de ver: descansa aunque mande en la cola. Y le basta con mandar —no con
  // llegar a 1— porque el ranking es relativo: sin freno saldría en la tarjeta de al lado.
  const conVivo: Mazo = { ...enSesion, [fallado]: { nombre: reciente(20_000, VIDA_FALLO * 10) } };
  assert.ok(sospecha(conVivo[fallado]!.nombre, AHORA) > sospecha(enSesion[base[1].id]!.nombre, AHORA));
  assert.notStrictEqual(siguiente(conVivo, orden, AHORA)!.id, fallado);
  // Pasado el descanso vuelve a mandar: reaprender es volver a verlo pronto, no no verlo.
  assert.strictEqual(siguiente(conVivo, orden, AHORA + DESCANSO)!.id, fallado);
  // **Lo que descansa es `min(vida, DESCANSO)`**, así que el crudo espera lo suyo y no el tope: un
  // fallo vuelve a los minuto y medio de su vida —unas tarjetas después, no en la siguiente— y no
  // al cuarto de hora, que lo sacaría de la sesión en la que hay que volver a verlo.
  const conFallo: Mazo = { ...enSesion, [fallado]: { nombre: reciente(20_000, VIDA_FALLO) } };
  assert.notStrictEqual(siguiente(conFallo, orden, AHORA)!.id, fallado);
  assert.strictEqual(siguiente(conFallo, orden, AHORA + VIDA_FALLO * 86_400_000)!.id, fallado);
  assert.ok(VIDA_FALLO * 86_400_000 < DESCANSO, "el crudo espera su vida, que es menos que el tope");
  // Y si descansa el mazo entero, el descanso cede: repetir es mejor que colar un país nuevo
  // saltándose el freno.
  const todoReciente: Mazo = Object.fromEntries(base.map((p) => [p.id, { nombre: reciente(20_000, 2) }]));
  assert.ok(base.some((p) => p.id === siguiente(todoReciente, orden, AHORA)!.id));
}

{
  // La cuenta del prompt: visto es tener algún dato; aprendido, tenerlos los cuatro.
  const viejo = sabido(100, 0);
  const nuevo = vida(2, 0);
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
  const viejo = sabido(400, 1); // aprendido de sobra
  const nuevo = vida(1, 0);     // empezado
  const cuatro = { nombre: viejo, capital: viejo, bandera: viejo, lugar: viejo };
  assert.strictEqual(dominioPais({ es: cuatro }, "es"), "aprendido");
  // Con tres de cuatro todavía no: es el mismo listón que usa `cuenta` para «aprendido».
  assert.strictEqual(dominioPais({ es: { ...cuatro, lugar: nuevo } }, "es"), "empezado");
  assert.strictEqual(dominioPais({ es: { nombre: nuevo } }, "es"), "empezado");
  assert.strictEqual(dominioPais({}, "es"), "sin ver");
}

console.log("srs: ok");
