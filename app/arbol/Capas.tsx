"use client";

// Qué se ve del árbol: una hoja con todo lo que el lienzo deja elegir, en dos mitades que no
// son la misma pregunta. Arriba, **cómo** se ve cada uno —qué le cabe al nodo detrás del
// nombre—; debajo del filete, **quién** sale, que es la que esconde gente y por eso deja
// aviso fuera. Al final, lo que devuelve el árbol a un estado conocido.

import type { ModoFechas } from "@/lib/arbol/fechas";
import type { ModoApellidos } from "@/lib/arbol/personas";
import LogoutButton from "./LogoutButton";
import TemaBoton from "./TemaBoton";

/**
 * La fila de la hoja: todo lo que se pulsa aquí mide y se pinta igual. El color va aparte
 * porque la que se queda pulsada lo invierte, y **dos fondos en la misma clase no se pisan por
 * orden de escritura sino por el de la hoja de estilos**: el que gana no es el que se añade.
 */
const FILA = "flex min-h-11 items-center rounded-lg px-3 text-left text-[13px]";
const APAGADA = `${FILA} bg-[var(--soft)] text-[var(--ink)]`;
const PULSADA = `${FILA} bg-[var(--ink)] text-[var(--paper)]`;

export default function Capas({
  fechas,
  setFechas,
  apellidos,
  setApellidos,
  ocultar,
  setOcultar,
  escondidos,
  repaso,
  setRepaso,
  incompletos,
  todoDesplegado,
  onDesplegarTodo,
  onReiniciar,
  inicial,
}: {
  fechas: ModoFechas;
  setFechas: (f: ModoFechas) => void;
  apellidos: ModoApellidos;
  setApellidos: (a: ModoApellidos) => void;
  ocultar: boolean;
  setOcultar: (v: boolean) => void;
  /** Cuánta gente esconde el filtro de consanguinidad: el precio de tenerlo puesto. */
  escondidos: number;
  repaso: boolean;
  setRepaso: (v: boolean) => void;
  /** A cuántos de los que están puestos les queda algún dato por preguntar. */
  incompletos: number;
  todoDesplegado: boolean;
  onDesplegarTodo: () => void;
  onReiniciar: () => void;
  /** Cómo se llama el punto de vista de entrada, que es al que devuelve reiniciar. */
  inicial: string;
}) {
  return (
    <div className="flex flex-col">
      <h2 className="font-[family-name:var(--serif)] text-[24px] leading-[1.15]">Qué se ve</h2>

      {/* Durante el repaso las dos preguntas de aquí ya están contestadas —enseñarlo todo es
          de lo que va— así que se quedan puestas y sin tocar, en vez de desaparecer: lo que
          hay que entender es que el interruptor de abajo manda, no que se han perdido. */}
      <Tramo titulo="En cada nodo">
        {/* «Nuevos» solo los enseña quien los estrena en su línea; 1 y 2, todo el mundo. */}
        <Eleccion
          titulo="Apellidos"
          opciones={["nuevos", 0, 1, 2] as const}
          actual={repaso ? 1 : apellidos}
          onElegir={setApellidos}
          nombrar={String}
          bloqueada={repaso}
        />
        {/* Los cuatro ocupan el mismo hueco detrás del nombre, así que son excluyentes. La
            fecha entera solo la tienen los del calendario de cumpleaños; para el resto,
            «completa» sigue enseñando el año a secas. */}
        <Eleccion
          titulo="Fechas"
          opciones={["ocultar", "año", "edad", "completa"] as const}
          actual={repaso ? "completa" : fechas}
          onElegir={setFechas}
          nombrar={(f) => (f === "ocultar" ? "no" : f)}
          bloqueada={repaso}
        />
      </Tramo>

      <Tramo titulo="El árbol">
        {/* Se enuncia por lo que añade, no por lo que quita: apagado es el estado de
            entrada, y un interruptor que arranca encendido para esconder gente se lee
            como si alguien hubiera tocado algo. */}
        <Interruptor
          titulo="Mostrar no conectadas"
          nota={`${escondidos} persona${escondidos === 1 ? "" : "s"} de la familia política`}
          activo={!ocultar}
          onPulsar={() => setOcultar(!ocultar)}
        />
        <Interruptor titulo="Desplegar todo" activo={todoDesplegado} onPulsar={onDesplegarTodo} />
        {/* El repaso: se enseña todo lo que consta y se apaga a quien ya está entero, que es
            al revés que los otros señalamientos —son 381 de 466 y encenderlos era encender el
            árbol—. Cada nodo escribe entonces el hueco con la forma que tendría la respuesta.
            **La cuenta es de los que hay puestos**, no la del árbol entero: el total no cabe en
            ninguna pantalla y leer «381» antes de empezar es para cerrar la hoja.
            **Va en fila de una línea y no en interruptor**: se toca una vez cada mucho, y una
            pista con su bolita lo hacía el mando más gordo de la hoja sin ser el más usado. */}
        <button
          type="button"
          onClick={() => setRepaso(!repaso)}
          aria-pressed={repaso}
          className={repaso ? PULSADA : APAGADA}
        >
          Resaltar incompletos
          <span className={`ml-auto text-[11.5px] tabular-nums ${repaso ? "opacity-70" : "text-[var(--mut)]"}`}>
            {incompletos} visibles
          </span>
        </button>
        <button type="button" onClick={onReiniciar} className={APAGADA}>
          Reiniciar
          <span className="ml-auto text-[11.5px] text-[var(--mut)]">vuelve al punto de vista de {inicial}</span>
        </button>
      </Tramo>

      {/* Los dos botones que no son del árbol sino de la sesión. Viven aquí y no en una
          barra de arriba: el borde de la pantalla es del lienzo, y esto se toca dos veces
          al año. */}
      <Tramo titulo="La sesión">
        <TemaBoton className={APAGADA} conTexto />
        <LogoutButton className={APAGADA} />
      </Tramo>
    </div>
  );
}

/** Un grupo de opciones con su rótulo, que es lo que separa una pregunta de la siguiente. */
function Tramo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      <p className="px-1 font-[family-name:var(--mono)] text-[9.5px] font-medium tracking-[0.12em] text-[var(--mut)] uppercase">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function Interruptor({
  titulo,
  nota,
  activo,
  onPulsar,
}: {
  titulo: string;
  /** Solo la lleva el interruptor que tiene un dato que dar; explicarse no es un dato. */
  nota?: string;
  activo: boolean;
  onPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPulsar}
      aria-pressed={activo}
      className={`flex items-center gap-3 rounded-lg px-3 text-left ${nota ? "min-h-13" : "min-h-11"} ${
        activo ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--soft)] text-[var(--ink)]"
      }`}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[13px]">{titulo}</span>
        {nota && <span className={`text-[11.5px] ${activo ? "opacity-70" : "text-[var(--mut)]"}`}>{nota}</span>}
      </span>
      {/* La pista y su bolita: 44 × 26, que es lo que se toca sin apuntar. */}
      <span
        className={`ml-auto flex h-[26px] w-11 shrink-0 items-center rounded-full px-[3px] ${
          activo ? "justify-end bg-[var(--acc)]" : "bg-[var(--soft2)]"
        }`}
      >
        <span className="block h-5 w-5 rounded-full bg-[var(--paper)]" />
      </span>
    </button>
  );
}

/** Una fila de opciones excluyentes, para lo que no es un sí o un no. */
function Eleccion<T extends string | number>({
  titulo,
  opciones,
  actual,
  onElegir,
  nombrar,
  bloqueada,
}: {
  titulo: string;
  opciones: readonly T[];
  actual: T;
  onElegir: (v: T) => void;
  nombrar: (v: T) => string;
  /** La contesta otro interruptor: se lee, no se toca. */
  bloqueada?: boolean;
}) {
  return (
    <div className={`flex min-h-11 items-center gap-1 rounded-lg bg-[var(--soft)] px-3 ${bloqueada ? "opacity-50" : ""}`}>
      <span className="flex-1 text-[13px] text-[var(--ink)]">{titulo}</span>
      {opciones.map((opcion) => (
        <button
          key={String(opcion)}
          type="button"
          onClick={() => onElegir(opcion)}
          disabled={bloqueada}
          className={`h-8 rounded-md px-2.5 text-[12px] ${
            actual === opcion ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--mut)]"
          }`}
        >
          {nombrar(opcion)}
        </button>
      ))}
    </div>
  );
}
