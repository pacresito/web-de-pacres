"use client";

import { useEffect, useState } from "react";
import {
  C_BASAL, C_EMPUJE, C_VISION, CONFIG, EFICIENCIA, E_COMIDA, GIRO, RADIO_COMIDA, TICKS_BOCADO, URNA,
} from "./engine";

/**
 * Todas las reglas del mundo, de una vez. Es lo que la leyenda no contesta: allí está qué hace
 * cada gen y aquí, contra qué juegan los seis.
 *
 * **Ni una cifra escrita a mano.** Cada número de aquí sale de la constante que lo manda en el
 * motor, así que recalibrar un exponente cambia esta tabla sola. Escrita a mano mentiría en
 * silencio en cuanto alguien mueva un coste, que es la única forma de error que aquí no se ve
 * venir: una tabla de reglas equivocada parece una tabla de reglas.
 */

/** Un número para leer, no para calcular: coma decimal y, por debajo de la milésima, potencia. */
function num(x: number): string {
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1) return String(+x.toFixed(3)).replace(".", ",");
  if (a >= 1e-3) {
    // Los ceros de la cola se quitan **solo si hay coma**: en un entero se llevarían el número
    // (un 10 acabaría en 1), que es justo la clase de error que esta tabla está para no cometer.
    const s = x.toFixed(3 - Math.floor(Math.log10(a)));
    return s.replace(/0+$/, "").replace(".", ",");
  }
  const exp = Math.floor(Math.log10(a));
  const mant = +(x / 10 ** exp).toFixed(2);
  return `${String(mant).replace(".", ",")} · 10${sup(exp)}`;
}

const SUPS: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const sup = (n: number): string => String(n).split("").map((c) => SUPS[c] ?? c).join("");

/** Porcentaje entero, redondeado: multiplicar por cien en binario no siempre cae redondo. */
const pct = (x: number): string => `${Math.round(x * 100)}%`;

/** Cada cuánto se vuelve a mirar el clima, en ms. Solo cambia al sembrar: no hay prisa. */
const REFRESCO = 700;

type Fila = [que: string, cuanto: string, porque: string];
type Seccion = { titulo: string; filas: Fila[] };

/**
 * **Todo sale de `CONFIG` menos el clima**, que es el único campo que la semilla sortea: el mundo
 * se construye con `{...CONFIG}` y le cambia `comidas`. Pedirle el resto al mundo vivo obligaría a
 * leer su ref mientras se pinta, que es justo lo que React no quiere.
 */
function secciones(comidas: number): Seccion[] {
  const cfg = { ...CONFIG, comidas };
  return [
    {
      titulo: "el mundo",
      filas: [
        ["tamaño", `${cfg.ancho} × ${cfg.alto}`, "medido para que el suelo se barra: más grande, el centro no lo pisa nadie"],
        ["casa", `franja de ${cfg.casa}`, `todo el perímetro; pisarla ya es estar a salvo, y a ${num(cfg.casa / 2)} del borde se ha llegado del todo`],
        ["la jornada", `${cfg.ticksDia} ticks`, "se acaba cuando se acaba: el que sigue fuera hace noche donde le pilló"],
        ["la luz", "4·u·(1 − u)", "u es lo que lleva corrido el día: cero al alba y al ocaso, uno al mediodía"],
        ["el clima", `${cfg.comidas} bocados al día`, `lo sortea la semilla entre ${URNA.join(", ")} — es el techo de la población`],
        ["se empieza con", `${cfg.censoInicial}`, "y el mundo no recuerda con cuántas empezó: en diez días el clima manda"],
      ],
    },
    {
      titulo: "un cuerpo",
      filas: [
        ["radio", "talla", "y la masa, el cubo del radio: lo grande cuesta al cubo y alcanza en línea"],
        ["velocidad", "empuje / radio cargado", "cargado se va más lento, y lo que no cabe en la despensa también pesa"],
        ["giro máximo", `tangente ${GIRO} / masa cargada`, "el grande maniobra peor, y eso no lo decide ningún gen"],
        ["despensa", `${num(cfg.capReserva)} × masa`, "no es un techo: lo que la pasa espera a ser un hijo"],
        ["vejez", `${cfg.vida} días`, "desde el primero que sale al campo — es lo que le pone plazo a un genoma"],
      ],
    },
    {
      titulo: "lo que cuesta un tick",
      filas: [
        ["se paga", "masa cargada × (basal + ver + mover)", "se paga siempre, hasta dormido: quieto se ahorra el empuje y nada más"],
        ["basal", num(C_BASAL), "por unidad de masa: estar vivo"],
        ["ver", `${num(C_VISION)} × visión²`, "al cuadrado, que es lo que le pone precio a un ojo grande"],
        ["mover", `${num(C_EMPUJE)} × velocidad²`, "probado con el cubo y descartado: la talla perdía su óptimo"],
        ["quedarse a 0", "hambre", "se muere en el sitio, a media faena"],
      ],
    },
    {
      titulo: "comer",
      filas: [
        ["un bocado", `radio ${RADIO_COMIDA} · ${num(E_COMIDA)} de masa`, "se recoge al tocarlo y se lleva encima, sin canjear"],
        ["descargar", `un bocado cada ${TICKS_BOCADO} ticks`, `solo pasada la línea media, a ${num(cfg.casa / 2)} del borde: lo que se ve encima tarda en entrar lo que tarda en irse`],
        ["alcance del ojo", "visión × luz × radio de lo que mira", "por eso el crepúsculo no se cosecha y lo pequeño hay que tenerlo cerca"],
        ["dormir", "haber llegado del todo y no ver nada", "no hay hora de acostarse: sale del ojo de cada uno y de la luz que queda"],
      ],
    },
    {
      titulo: "cazar",
      filas: [
        ["hace falta ser", `${num(cfg.boca)} veces el radio del otro`, "y estar los dos fuera de la franja: en casa no se caza ni se es cazado"],
        ["la dentellada", `${cfg.ticksPresa} ticks`, "mordiendo no se anda ni se decide, ni el que muerde ni el mordido"],
        ["se aprovecha", pct(EFICIENCIA), "de la masa de la presa; su carga cambia de dueño entera"],
        ["de los tuyos no", "distancia genética", "por debajo de lo que la población se separa entre sí, sois la misma cosa"],
      ],
    },
    {
      titulo: "criar y heredar",
      filas: [
        ["se cría", "de noche y llegando del todo", "el que hace noche fuera no cría, y no por eso se muere"],
        ["un hijo cuesta", `${num(cfg.capReserva)} × su masa`, "se muta primero y se mira si cabe: por eso la talla se paga al criar"],
        ["mutación", `× o ÷ (1 + azar · ${num(cfg.tasa)})`, "multiplicativa en los cinco genes que no bajan de cero, y sin techo ninguno"],
        ["sociabilidad", `± azar · ${num(cfg.paso)}`, "el único con signo: sumando, porque lo suyo es querer estar lejos o cerca"],
      ],
    },
  ];
}

export default function Reglas({ clima, cerrar }: { clima: () => number; cerrar: () => void }) {
  // El de fábrica hasta que conteste el mundo, que es el mismo fotograma. Y se sigue mirando:
  // sembrar con esto abierto cambia el clima, y unas reglas del mundo anterior no se ven mal.
  const [comidas, setComidas] = useState(CONFIG.comidas);
  useEffect(() => {
    const leer = () => setComidas(clima() || CONFIG.comidas);
    leer();
    const id = window.setInterval(leer, REFRESCO);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    return () => { window.clearInterval(id); window.removeEventListener("keydown", esc); };
  }, [clima, cerrar]);

  return (
    <div className="rg-panel">
      <div className="rg-cabecera">
        <b>las reglas</b>
        <span className="rg-nota">las de este mundo, sacadas del motor</span>
        <button className="ev-btn muted" onClick={cerrar}>cerrar</button>
      </div>
      <p className="rg-intro">
        Esto es contra lo que juegan los seis genes. Qué hace cada uno lo cuenta la leyenda; aquí
        está el mundo en el que sale más a cuenta uno u otro, que es lo único que decide.
      </p>
      {secciones(comidas).map((s) => (
        <section key={s.titulo} className="rg-seccion">
          <h3 className="rg-titulo">{s.titulo}</h3>
          {s.filas.map(([que, cuanto, porque], i) => (
            <div key={i} className="rg-fila">
              <b className="rg-que">{que}</b>
              <span className="rg-cuanto">{cuanto}</span>
              <span className="rg-porque">{porque}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
