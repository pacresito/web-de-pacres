// Test de lógica pura: `npx tsx lib/atlas/srs.test.ts`. Fuera del build.
import assert from "assert";
import { ACIERTOS_APRENDIDO, calificar, cuenta, DATOS, DESCANSO, dominio, dominioPais, HUECO, huecos, MAX_EN_EL_AIRE, montar, nuevaVida, nuevosAciertos, siguiente, sospecha, type Mazo } from "./srs";
import { PAISES } from "./paises";

const DIA = 86_400_000;
const AHORA = Date.parse("2026-08-21T12:00:00Z");
const haceDias = (n: number) => AHORA - n * DIA;
// Un dato con vida pero sin racha, que es lo normal mientras se aprende; y uno ya aprendido, con
// el contador lleno. Los dos ejes van aparte a propósito: la vida ordena la cola, el contador dice
// si está aprendido, y hace falta poder moverlos por separado para probar cualquiera de los dos.
const vida = (v: number, dias: number) => ({ visto: haceDias(dias), vida: v, aciertos: 0 });
const sabido = (v: number, dias: number) => ({ ...vida(v, dias), aciertos: ACIERTOS_APRENDIDO });
// Espejos de las dos vidas que deja un «no», que no se exportan. Valen escritas a mano: gobiernan
// cuánto insiste una sesión y cuánto dura una ronda de estrenos, así que moverlas debe romper esto.
const VIDA_ESTRENO = 0.01;  // el «no» de la primera vez
const VIDA_OLVIDO = 0.001;  // el «no» de algo que ya se conocía

// La vida de un dato
// La primera vez no hay transcurrido del que tirar, así que cada nota arranca en su valor fijo.
assert.strictEqual(nuevaVida(undefined, "bien", AHORA), 1);
assert.strictEqual(nuevaVida(undefined, "facil", AHORA), 4);
assert.strictEqual(nuevaVida(undefined, "fallo", AHORA), VIDA_ESTRENO);

// Acertando a tiempo, la vida se multiplica por su nota.
assert.strictEqual(nuevaVida(vida(10, 10), "bien", AHORA), 20);
assert.strictEqual(nuevaVida(vida(10, 10), "facil", AHORA), 40);

// Y fallar la desploma, venga de donde venga: un año de vida no protege de haberlo olvidado. Un
// olvido cae más abajo que un estreno, para volver dentro de la sesión en vez de dar paso a otros.
assert.strictEqual(nuevaVida(vida(365, 400), "fallo", AHORA), VIDA_OLVIDO);
assert.ok(VIDA_OLVIDO < VIDA_ESTRENO);

// Solo el tiempo transcurrido suma
// Acertar sin que haya pasado nada no prueba nada y no paga nada: la vida se queda donde estaba.
assert.strictEqual(nuevaVida(vida(0.01, 0), "bien", AHORA), 0.01);
assert.strictEqual(nuevaVida(vida(10, 0), "facil", AHORA), 10);
// La cuenta que motivó la regla: un dato fallado y acertado siete veces en tres minutos se queda
// en minutos de vida. Multiplicando por la vida previa salían 1,28 días sin haber pasado ninguno.
{
  let e = { visto: AHORA, vida: VIDA_OLVIDO, aciertos: 0 };
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
assert.strictEqual(dominio(vida(2, 0)), "empezado");     // ni una cosa ni la otra
assert.strictEqual(dominio(sabido(2, 0)), "aprendido");  // el contador, sin que el calendario corra
assert.strictEqual(dominio(vida(100, 0)), "dominado");   // el calendario basta solo, sin contador
assert.strictEqual(dominio(sabido(100, 0)), "dominado"); // las dos cosas
// Y aguantar tres semanas cuenta como aprendido, que es lo que hace que la marca solo se llene.
assert.strictEqual(dominioPais({ es: Object.fromEntries(DATOS.map((d) => [d, vida(100, 0)])) }, "es"), "aprendido");

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
// Vida corta a propósito, para que lo que se mida aquí sea el contador y no el calendario.
const conAciertos = (as: Partial<Record<(typeof DATOS)[number], number>>): Mazo => ({
  es: Object.fromEntries(Object.entries(as).map(([d, a]) => [d, { ...vida(2, 0), aciertos: a as number }])),
});
const LLENO = ACIERTOS_APRENDIDO;
// País flojo: un solo hueco y tres datos a la vista, que son el material de estudio.
assert.strictEqual(huecos(conAciertos({}), "es"), 1);
assert.strictEqual(huecos(conAciertos({ nombre: LLENO }), "es"), 1);
// A medias, dos y dos.
assert.strictEqual(huecos(conAciertos({ nombre: LLENO, capital: LLENO }), "es"), 2);
// Aprendido, tres preguntas y una pista. La proporción estudio:examen se invierte sola.
assert.strictEqual(huecos(conAciertos({ nombre: LLENO, capital: LLENO, bandera: LLENO, lugar: LLENO }), "es"), 3);
// Con el contador a medio llenar y sin calendario detrás, la tarjeta sigue enseñando.
assert.strictEqual(huecos(conAciertos({ nombre: LLENO - 1, capital: LLENO - 1, bandera: LLENO - 1, lugar: LLENO - 1 }), "es"), 1);
// **La madurez la firma cualquiera de los dos relojes**: aguantar tres semanas abre los huecos
// igual que llenar el contador, porque el calendario prueba lo mismo y además no se acelera.
assert.strictEqual(huecos({ es: Object.fromEntries(DATOS.map((d) => [d, vida(100, 0)])) }, "es"), 3);

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
assert.strictEqual(tras.es.nombre!.vida, VIDA_OLVIDO);
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
  const reciente = (ms: number, v: number, fallado = false) => ({ visto: AHORA - ms, vida: v, aciertos: 0, fallado });
  // La sesión activa: treinta países en el aire —el freno puesto, no entran nuevos— y todos
  // repasados hace un rato, que es cuando la sospecha de todo el mazo se queda en milésimas.
  const base = PAISES.slice(0, MAX_EN_EL_AIRE);
  const enSesion: Mazo = Object.fromEntries(base.map((p) => [p.id, { nombre: reciente(40 * 60_000, 2) }]));
  const fallado = base[0].id;
  // Un dato que se acaba de ver: descansa aunque mande en la cola. Y le basta con mandar —no con
  // llegar a 1— porque el ranking es relativo: sin freno saldría en la tarjeta de al lado.
  const conVivo: Mazo = { ...enSesion, [fallado]: { nombre: reciente(20_000, VIDA_OLVIDO * 10) } };
  assert.ok(sospecha(conVivo[fallado]!.nombre, AHORA) > sospecha(enSesion[base[1].id]!.nombre, AHORA));
  assert.notStrictEqual(siguiente(conVivo, orden, AHORA)!.id, fallado);
  // Pasado el descanso vuelve a mandar: reaprender es volver a verlo pronto, no no verlo.
  assert.strictEqual(siguiente(conVivo, orden, AHORA + DESCANSO)!.id, fallado);
  // **Lo que descansa lo decide la respuesta, no la vida**: el fallado espera lo que aguante, que
  // es volver a verlo dentro de la sesión, y no el tope, que lo sacaría de ella.
  const conFallo: Mazo = { ...enSesion, [fallado]: { nombre: reciente(20_000, VIDA_OLVIDO, true) } };
  assert.notStrictEqual(siguiente(conFallo, orden, AHORA)!.id, fallado);
  assert.strictEqual(siguiente(conFallo, orden, AHORA + VIDA_OLVIDO * 86_400_000)!.id, fallado);
  assert.ok(VIDA_OLVIDO * 86_400_000 < DESCANSO, "el fallado espera su vida, que es menos que el tope");
  // **Y el mismo dato acertado espera el tope, aunque su vida siga siendo de minutos.** Es el caso
  // que la vida no sabe contar: acertar lo que se acaba de fallar solo le suma segundos, así que
  // mirándola ese «sí» volvía enseguida, y cinco de esos llenan «aprendido» sin calendario detrás.
  const acertadoCorto: Mazo = { ...enSesion, [fallado]: { nombre: reciente(20_000, VIDA_OLVIDO) } };
  assert.notStrictEqual(siguiente(acertadoCorto, orden, AHORA + VIDA_OLVIDO * 86_400_000)!.id, fallado);
  assert.strictEqual(siguiente(acertadoCorto, orden, AHORA + DESCANSO)!.id, fallado);
  // Un mazo guardado antes de que el dato dijera su respuesta cuenta como acierto: espera de más.
  const sinFlag: Mazo = { ...enSesion, [fallado]: { nombre: { visto: AHORA - 20_000, vida: VIDA_OLVIDO, aciertos: 0 } } };
  assert.notStrictEqual(siguiente(sinFlag, orden, AHORA + VIDA_OLVIDO * 86_400_000)!.id, fallado);
  // **Los frenos se sueltan de uno en uno, y el hueco el último.** Con el mazo entero descansando
  // se pregunta por otro que también descansaba antes que repetir el que se acaba de servir: si no,
  // subir el descanso se pagaría con el mismo país tres veces seguidas.
  {
    const todos: Mazo = Object.fromEntries(base.map((p) => [p.id, { nombre: reciente(20_000, 2) }]));
    const servido = base[0].id;
    const toca = siguiente(todos, orden, AHORA, [servido])!.id;
    assert.notStrictEqual(toca, servido);
    assert.ok(base.some((p) => p.id === toca), "sale otro del mazo, no un país nuevo");
  }
  // Y si descansa el mazo entero, el descanso cede: repetir es mejor que colar un país nuevo
  // saltándose el freno.
  const todoReciente: Mazo = Object.fromEntries(base.map((p) => [p.id, { nombre: reciente(20_000, 2) }]));
  assert.ok(base.some((p) => p.id === siguiente(todoReciente, orden, AHORA)!.id));
}

// Estrenar lo decide el mazo entero: mientras algo haya pasado su vida no entra gente nueva, ni
// aunque los frenos lo tengan apartado y dejen a mano cosas que aún no tocan.
{
  const deudor = PAISES[0].id, aMano = PAISES[1].id;
  // Un dato fallado y ya vencido —lleva más de su minuto y medio— junto a otro que no toca.
  const mazo: Mazo = {
    [deudor]: { nombre: { visto: haceDias(1), vida: VIDA_OLVIDO, aciertos: 0 } },
    [aMano]: { nombre: vida(30, 1) },
  };
  assert.ok(sospecha(mazo[deudor]!.nombre, AHORA) >= 1 && sospecha(mazo[aMano]!.nombre, AHORA) < 1);
  assert.strictEqual(siguiente(mazo, orden, AHORA)!.id, deudor);
  // Y con el deudor apartado por el hueco se pregunta otra cosa, pero no se estrena nadie.
  assert.strictEqual(siguiente(mazo, orden, AHORA, [deudor])!.id, aMano);
  // Sin deuda vencida sí se estrena: lo que frena es lo que ya tocaba, no lo que se acaba de ver.
  const alDia: Mazo = { [aMano]: { nombre: vida(30, 1) } };
  const tras = siguiente(alDia, orden, AHORA)!.id;
  assert.ok(!DATOS.some((d) => alDia[tras]?.[d]), `estrena uno sin ver, y salió ${tras}`);
}

// El hueco: un país no repite hasta que han pasado otros, aunque le queden datos por preguntar.
{
  const dos = PAISES.slice(0, 2).map((p) => p.id);
  const mazo: Mazo = { [dos[0]]: { nombre: vida(1, 5), capital: vida(1, 4) }, [dos[1]]: { nombre: vida(1, 3) } };
  // Sin nadie reciente manda el más sospechoso, que tiene dos datos vencidos y volvería a salir.
  assert.strictEqual(siguiente(mazo, orden, AHORA)!.id, dos[0]);
  assert.strictEqual(siguiente(mazo, orden, AHORA, [dos[0]])!.id, dos[1]);
  // Y solo cuentan los últimos `HUECO`: lo de antes ya no aparta a nadie.
  const viejos = [dos[0], ...PAISES.slice(2, 2 + HUECO).map((p) => p.id)];
  assert.strictEqual(siguiente(mazo, orden, AHORA, viejos)!.id, dos[0]);
  // Si el hueco aparta a todo el mazo, manda el respaldo: es preferible repetir a no dar tarjeta.
  assert.ok(dos.includes(siguiente(mazo, orden, AHORA, dos)!.id));
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
