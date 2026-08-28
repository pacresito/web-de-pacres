// Las cifras que justifican las constantes del motor — `npx tsx app/apps/evolution/costes.medir.ts`.
// Con argumentos corre solo esas secciones: `… costes.medir.ts mundo cien`.
//
// **No es un test: no falla, mide.** Y va antes que el canvas a propósito. Construir la pantalla
// primero es la forma garantizada de calibrar el mundo a ojo hasta que "quede bonito", y entonces
// lo que se ve en el panel es obra mía y no de la selección. Aquí no se elige: se corre el motor
// sin pintar y se lee dónde se asienta cada gen.
//
// Los números que citan los comentarios de `engine.ts` salen de correr esto, y **se vuelven a
// sacar cada vez que se mueva una constante**: escritos a mano se quedan viejos sin que nada falle.
import {
  crearMundo, avanzar, resumen, mediana, velocidadAdulta, balance,
  CONFIG, FUNDADOR, RADIO_COMIDA, CELDA,
  type Config, type Exponente, type Genoma, type Mundo,
} from "./engine";

const SEMILLAS = ["hola", "pablo", "claudio", "mar", "brizna", "raiz", "sexta", "septima"];
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(p * (xs.length - 1))] : NaN);
const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const fila = (cols: (string | number)[]) => console.log(cols.map((c) => String(c).padStart(8)).join(" "));

/** Corre `n` semillas de un mundo y devuelve lo que cada una acabó siendo. */
function correr(cfg: Partial<Config>, ticks: number, semillas = SEMILLAS) {
  return semillas.map((s) => {
    const m = crearMundo(s, cfg);
    avanzar(m, ticks);
    return m;
  });
}

/**
 * Lo mismo, pero leyendo por el camino: para saber si un gen se ha asentado hay que verlo dos
 * veces, y correr el mundo dos veces desde cero para eso cuesta el doble sin decir nada más.
 */
function correrConParadas(cfg: Partial<Config>, paradas: number[], semillas = SEMILLAS) {
  const mundos = semillas.map((s) => crearMundo(s, cfg));
  const fotos: Mundo[][] = [];
  let hecho = 0;
  for (const parada of paradas) {
    for (const m of mundos) avanzar(m, parada - hecho);
    hecho = parada;
    // Una foto es una copia superficial: `lectura` solo mira censo, cuenta y genomas, y ninguno
    // de los tres se reescribe en sitio (los genes se copian al mutar).
    fotos.push(mundos.map((m) => ({ ...m, bichos: [...m.bichos] })));
  }
  return fotos;
}

/** Lo que se lee de un puñado de mundos: solo votan los que siguen vivos. */
function lectura(ms: Mundo[]) {
  const v = ms.filter((m) => !m.extinto && m.bichos.length >= 5);
  const r = v.map(resumen);
  const gen = (k: keyof Genoma) => media(r.map((x) => x.medianas[k]));
  return {
    vivas: v.length, de: ms.length,
    censo: media(r.map((x) => x.censo)),
    comida: media(r.map((x) => x.comida)),
    generacion: media(r.map((x) => x.gen)),
    velocidad: media(r.map((x) => x.velocidad)),
    comidos: media(v.map((m) => m.cuenta.comidos)),
    nacidos: media(v.map((m) => m.cuenta.nacidos)),
    hambre: media(v.map((m) => m.cuenta.hambre)),
    viejos: media(v.map((m) => m.cuenta.viejos)),
    // Desvío de cada gen respecto al fundador de su propio mundo, que es lo que dice si el gen se
    // asienta o se va. Compararlo contra el fundador de la tabla mentiría: la semilla lo jitterea.
    desvio: (k: keyof Genoma) => media(v.map((m, i) => r[i].medianas[k] / m.eva[k] - 1)),
    gen,
  };
}

const secciones: Record<string, () => void> = {

  // ── La escala del mundo ─────────────────────────────────────────────────────
  // No es una constante suelta, es una relación: si un bicho ve el mundo entero, la visión es un
  // adorno y moverse no es una decisión; si no ve nada, todo es paseo aleatorio.
  escala() {
    console.log("\n## Escala del mundo\n");
    const c = CONFIG;
    const alcance = c.fundador.vision * RADIO_COMIDA;
    console.log(`ancho ${c.ancho} · alcance de visión de comida ${alcance.toFixed(0)} px = 1/${(c.ancho / alcance).toFixed(1)} del ancho`);
    console.log(`alcance sobre un adulto ${(c.fundador.vision * c.fundador.talla).toFixed(0)} px · radio de parche ${c.radioParche} px`);
    console.log(`velocidad del fundador ${velocidadAdulta(c.fundador).toFixed(2)} px/tick · celda de rejilla ${CELDA} px\n`);

    fila(["ticks", "censo", "comida", "gen", "ven%", "dParche", "mastic%"]);
    const ms = correr({}, 12000);
    for (const t of [3000, 12000]) {
      const sub = t === 12000 ? ms : correr({}, t);
      const vivos = sub.filter((m) => !m.extinto);
      const ven: number[] = [], mast: number[] = [], dParche: number[] = [];
      for (const m of vivos) {
        let conVista = 0, masticando = 0;
        for (const b of m.bichos) {
          let d2 = Infinity;
          for (const bo of m.comida) { const dx = bo.x - b.x, dy = bo.y - b.y; const d = dx * dx + dy * dy; if (d < d2) d2 = d; }
          const al = b.g.vision * RADIO_COMIDA;
          if (d2 <= al * al) conVista++;
          if (b.mastica > 0) masticando++;
        }
        ven.push(m.bichos.length ? (100 * conVista) / m.bichos.length : 0);
        mast.push(m.bichos.length ? (100 * masticando) / m.bichos.length : 0);
        // Separación típica entre parches, que es lo que decide si moverse es una decisión.
        for (const p of m.parches) {
          let mejor = Infinity;
          for (const q of m.parches) if (q !== p) mejor = Math.min(mejor, Math.hypot(q.x - p.x, q.y - p.y));
          if (Number.isFinite(mejor)) dParche.push(mejor);
        }
      }
      const l = lectura(sub);
      fila([t, fmt(l.censo, 0), fmt(l.comida, 0), fmt(l.generacion, 0), fmt(media(ven), 0), fmt(media(dParche), 0), fmt(media(mast), 0)]);
    }
    console.log("\nA leer: 'ven%' cerca de 100 con parches a un solo alcance de distancia es un mundo sin decisión que tomar.");
  },

  // ── El mundo: los tres umbrales que no salen de ninguna física ──────────────
  // `boca` (a partir de qué diferencia de tamaño te comes a otro), `masticar` (lo que tarda) y la
  // producción de comida. Todo lo demás sale de una magnitud ya contada; estos tres, no.
  mundo() {
    console.log("\n## Boca, masticar y producción\n");
    fila(["boca", "mastic", "parch", "brote", "vivas", "censo", "comida", "gen", "comidos", "%muert", "talla", "vision"]);
    for (const boca of [0.5, 0.6, 0.7]) {
      for (const masticar of [0.5, 1]) {
        for (const [parches, brote] of [[12, 0.25], [20, 0.15]] as const) {
          const l = lectura(correr({ boca, masticar, parches, brote }, 12000));
          const muertes = l.hambre + l.viejos + l.comidos;
          fila([boca, masticar, parches, brote, `${l.vivas}/${l.de}`, fmt(l.censo, 0), fmt(l.comida, 0),
            fmt(l.generacion, 0), fmt(l.comidos, 0), fmt((100 * l.comidos) / muertes, 0), fmt(l.gen("talla")), fmt(l.gen("vision"), 1)]);
        }
      }
    }
    console.log("\nA leer: '%muert' es qué porcentaje de las muertes las causa otro bicho. En 0, media mitad del");
    console.log("modelo (fiereza, audacia, persecución) está apagada y ningún genoma la nota.");
  },

  // ── Los exponentes de coste ─────────────────────────────────────────────────
  // El hueco más grave del diseño: si los costes no son convexos no hay trade-off, hay una
  // pendiente, y una pendiente clava el gen en su tope en tres generaciones — con la gráfica
  // quieta pareciendo desde fuera que la simulación funciona.
  exponentes() {
    console.log("\n## Exponentes de coste: dónde se asienta cada gen\n");
    console.log("Desvío de la mediana respecto al fundador de cada mundo, a la mitad y al final.");
    console.log("Un gen que sigue subiendo lo mismo en la segunda mitad no se ha asentado: se está clavando.\n");
    fila(["masa", "vision", "vivas", "censo", "empuje", "talla", "vision", "umbral", "aguante"]);
    for (const expMasa of [0.75, 1, 1.5] as Exponente[]) {
      for (const expVision of [1.5, 2, 2.5] as Exponente[]) {
        const [a, b] = correrConParadas({ expMasa, expVision }, [6000, 12000], SEMILLAS.slice(0, 5));
        const mitad = lectura(a), fin = lectura(b);
        const par = (k: keyof Genoma) => `${fmt(100 * mitad.desvio(k), 0)}/${fmt(100 * fin.desvio(k), 0)}%`;
        fila([expMasa, expVision, `${fin.vivas}/${fin.de}`, fmt(fin.censo, 0),
          par("empuje"), par("talla"), par("vision"), par("umbral"), par("aguante")]);
      }
    }
  },

  // ── La tasa de mutación, calibrada contra el reloj humano ───────────────────
  // Con población de clones el ritmo de todo lo marca la mutación: es lo que decide si Pablo ve
  // divergir algo en un minuto o en media hora.
  mutacion() {
    console.log("\n## Tasa de mutación: generaciones hasta que la varianza se ve\n");
    console.log("'ve' = generación en la que el rango intercuartílico de la talla pasa del 10% de su mediana.\n");
    fila(["tasa", "vivas", "gen", "ve", "IQRtalla", "IQRvis", "censo"]);
    for (const tasa of [0.03, 0.05, 0.08, 0.12, 0.2]) {
      const ve: number[] = [], iqrT: number[] = [], iqrV: number[] = [];
      const ms: Mundo[] = [];
      for (const s of SEMILLAS) {
        const m = crearMundo(s, { tasa });
        let visto = 0;
        for (let t = 0; t < 12000 && !m.extinto; t += 250) {
          avanzar(m, 250);
          if (!visto && m.bichos.length > 5) {
            const xs = m.bichos.map((b) => b.g.talla);
            const iqr = pct(xs, 0.75) - pct(xs, 0.25);
            if (iqr / mediana(xs) > 0.1) visto = resumen(m).gen;
          }
        }
        ms.push(m);
        if (!m.extinto && m.bichos.length > 5) {
          if (visto) ve.push(visto);
          const t = m.bichos.map((b) => b.g.talla), v = m.bichos.map((b) => b.g.vision);
          iqrT.push((pct(t, 0.75) - pct(t, 0.25)) / mediana(t));
          iqrV.push((pct(v, 0.75) - pct(v, 0.25)) / mediana(v));
        }
      }
      const l = lectura(ms);
      fila([tasa, `${l.vivas}/${l.de}`, fmt(l.generacion, 0), ve.length ? fmt(media(ve), 0) : "nunca",
        fmt(media(iqrT)), fmt(media(iqrV)), fmt(l.censo, 0)]);
    }
  },

  // ── La regla que decide si un gen está bien modelado ────────────────────────
  // **Ninguno puede ser mejor cuanto más alto en todo su rango.** Un gen sin óptimo interior se
  // clava en el tope en tres generaciones y la gráfica se queda quieta pareciendo que funciona.
  // La comprobación es soltar el mismo mundo con el gen muy bajo y muy alto: si vuelve al mismo
  // sitio desde los dos lados, hay óptimo; si acaba donde lo dejaste, el gen no está seleccionado;
  // y si sube desde arriba, está mal modelado.
  regla1() {
    console.log("\n## Ningún gen puede ser mejor cuanto más alto\n");
    fila(["gen", "×0.3", "×1", "×3", "×8", "veredicto"]);
    const base: [keyof Genoma, number][] = [
      ["empuje", FUNDADOR.empuje], ["talla", FUNDADOR.talla], ["vision", FUNDADOR.vision],
      ["aguante", FUNDADOR.aguante], ["umbral", FUNDADOR.umbral],
    ];
    const FACTORES = [0.3, 1, 3, 8];
    for (const [rasgo, v0] of base) {
      const fin: string[] = [];
      const util: { factor: number; donde: number }[] = [];
      for (const factor of FACTORES) {
        const l = lectura(correr({ fundador: { ...FUNDADOR, [rasgo]: v0 * factor } }, 15000, SEMILLAS.slice(0, 5)));
        const donde = l.gen(rasgo);
        const pocas = l.vivas < 3;
        fin.push(pocas || !Number.isFinite(donde) ? `${fmt(donde)}!` : fmt(donde));
        if (!pocas && Number.isFinite(donde)) util.push({ factor, donde });
      }
      // El veredicto se lee **solo** de las casillas con semillas vivas: con una extinta el ratio
      // sale NaN, y toda comparación con NaN es falsa, así que un veredicto ingenuo aprobaría
      // cualquier cosa. Que un mundo se extinga por llevar el gen al extremo no es un dato menos
      // valioso, pero es otro dato: se cuenta aparte.
      let veredicto: string;
      if (util.length < 2) veredicto = `sin datos (${FACTORES.length - util.length} extintas)`;
      else {
        const a = util[0], b = util[util.length - 1];
        const partida = b.factor / a.factor, llegada = b.donde / a.donde;
        veredicto = llegada > partida * 1.05 ? "SIN ÓPTIMO"
          : llegada > partida * 0.8 ? "NADIE LO SELECCIONA"
          : llegada > partida * 0.4 ? "flojo" : "converge";
        veredicto += ` ×${fmt(partida, 1)}→×${fmt(llegada, 1)}`;
      }
      fila([rasgo, ...fin, veredicto]);
    }
    console.log("\n'!' = menos de tres semillas vivas: esa casilla no vota, y que se extinga por");
    console.log("llevar el gen ahí ya es media respuesta. El veredicto compara cuánto se ha cerrado el");
    console.log("abanico de partida: '×10→×1.6' es un gen que vuelve al mismo sitio desde los dos lados,");
    console.log("y '×10→×8.3' uno que se queda donde lo dejes: no es que la evolución lo prefiera alto,");
    console.log("es que no lo mira nadie, y en el panel sería una banda que se abre sin querer decir nada.");
  },

  // ── El genoma fundador ──────────────────────────────────────────────────────
  // Con población de clones, un fundador no viable extingue **todas** las semillas, y la app
  // parecería rota sin estarlo. Sale de la región que el medidor ha visto sobrevivir, no de la
  // intuición.
  fundador() {
    console.log("\n## Genoma fundador: qué combinaciones sobreviven\n");
    fila(["empuje", "talla", "vision", "vivas", "censo", "gen", "→empuje", "→talla", "→vision"]);
    for (const empuje of [1.2, 1.8, 2.6]) {
      for (const talla of [3, 4, 5]) {
        for (const vision of [20, 30, 45]) {
          const l = lectura(correr({ fundador: { ...FUNDADOR, empuje, talla, vision } }, 9000, SEMILLAS.slice(0, 5)));
          fila([empuje, talla, vision, `${l.vivas}/${l.de}`, fmt(l.censo, 0), fmt(l.generacion, 0),
            fmt(l.gen("empuje")), fmt(l.gen("talla")), fmt(l.gen("vision"), 1)]);
        }
      }
    }
    console.log("\nA leer: la columna '→' es dónde acaba el gen. Si acaba lejos del fundador en todas las filas,");
    console.log("el fundador está mal puesto; si vuelve al mismo sitio desde tres sitios distintos, ahí está el óptimo.");
  },

  // ── Cien semillas a la generación 100 ───────────────────────────────────────
  // El riesgo real del proyecto: que casi todas mueran en la generación cinco. La app estaría
  // muerta y parecería un bug aunque no lo hubiera. Nunca se impide la extinción — solo se
  // comprueba que no es el destino de casi todas.
  cien() {
    console.log("\n## Cien semillas hasta la generación 100\n");
    const META = 100, TOPE = 40000;
    let vivas = 0, extintas = 0, lentas = 0;
    const genes: number[] = [], censos: number[] = [], ticks: number[] = [], muerte: number[] = [];
    for (let i = 0; i < 100; i++) {
      const m = crearMundo(`semilla-${i}`);
      while (!m.extinto && m.t < TOPE && resumen(m).gen < META) avanzar(m, 500);
      const r = resumen(m);
      if (m.extinto) { extintas++; muerte.push(r.gen); }
      else if (r.gen >= META) { vivas++; genes.push(r.gen); censos.push(r.censo); ticks.push(m.t); }
      else lentas++;
      if ((i + 1) % 25 === 0) console.log(`  …${i + 1} semillas`);
    }
    console.log(`\nvivas en la generación ${META}: ${vivas}/100 · extintas: ${extintas} · demasiado lentas (tope ${TOPE} ticks): ${lentas}`);
    if (muerte.length) console.log(`las extintas duraron hasta la generación: mediana ${fmt(mediana(muerte), 0)}, p90 ${fmt(pct(muerte, 0.9), 0)}`);
    if (ticks.length) console.log(`ticks hasta la generación ${META}: mediana ${fmt(mediana(ticks), 0)} (${fmt(mediana(ticks) / META, 0)} por generación) · censo mediano ${fmt(mediana(censos), 0)}`);
  },

  // ── Coste de correr ─────────────────────────────────────────────────────────
  // Cuánto cuesta un tick decide si el botón de x64 y el de adelantar 100 generaciones existen.
  coste() {
    console.log("\n## Coste de correr\n");
    fila(["censo", "comida", "µs/tick", "ticks/s", "x64 fps"]);
    const m = crearMundo("coste");
    for (const hasta of [2000, 8000, 20000]) {
      avanzar(m, hasta - m.t);
      const t0 = process.hrtime.bigint();
      avanzar(m, 500);
      const us = Number(process.hrtime.bigint() - t0) / 1000 / 500;
      fila([m.bichos.length, m.comida.length, fmt(us), fmt(1e6 / us, 0), fmt(1e6 / us / 64, 0)]);
    }
    console.log(`\nbalance ${balance(m).toFixed(6)} (tiene que ser exactamente ${CONFIG.energia})`);
  },
};

const pedidas = process.argv.slice(2).filter((a) => a in secciones);
for (const nombre of pedidas.length ? pedidas : Object.keys(secciones)) secciones[nombre]();
console.log("");
