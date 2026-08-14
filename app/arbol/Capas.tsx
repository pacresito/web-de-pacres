"use client";

// Qué se ve del árbol: una hoja con todo lo que el lienzo deja elegir, en dos mitades que no
// son la misma pregunta. Arriba, **cómo** se ve cada uno —qué le cabe al nodo detrás del
// nombre—; debajo del filete, **quién** sale, que es la que esconde gente y por eso deja
// aviso fuera. Al final, lo que devuelve el árbol a un estado conocido.

import type { ModoFechas } from "@/lib/arbol/fechas";
import type { ModoApellidos } from "@/lib/arbol/personas";

export default function Capas({
  fechas,
  setFechas,
  apellidos,
  setApellidos,
  ocultar,
  setOcultar,
  escondidos,
  todoDesplegado,
  onDesplegarTodo,
  onReiniciar,
  leyenda,
}: {
  fechas: ModoFechas;
  setFechas: (f: ModoFechas) => void;
  apellidos: ModoApellidos;
  setApellidos: (a: ModoApellidos) => void;
  ocultar: boolean;
  setOcultar: (v: boolean) => void;
  /** Cuánta gente esconde el filtro de consanguinidad: el precio de tenerlo puesto. */
  escondidos: number;
  todoDesplegado: boolean;
  onDesplegarTodo: () => void;
  onReiniciar: () => void;
  /** Los cuatro trazos tal cual salen en el lienzo; los dibuja quien los dibuja allí. */
  leyenda: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <h2 className="font-[family-name:var(--serif)] text-[24px] leading-[1.15]">Qué se ve</h2>

      <Tramo titulo="En cada nodo">
        {/* «Nuevos» solo los enseña quien los estrena en su línea; 1 y 2, todo el mundo. */}
        <Eleccion titulo="Apellidos" opciones={["nuevos", 0, 1, 2] as const} actual={apellidos} onElegir={setApellidos} nombrar={String} />
        {/* Los cuatro ocupan el mismo hueco detrás del nombre, así que son excluyentes. La
            fecha entera solo la tienen los del calendario de cumpleaños; para el resto,
            «completa» sigue enseñando el año a secas. */}
        <Eleccion
          titulo="Fechas"
          opciones={["ocultar", "año", "edad", "completa"] as const}
          actual={fechas}
          onElegir={setFechas}
          nombrar={(f) => (f === "ocultar" ? "no" : f)}
        />
      </Tramo>

      <Tramo titulo="Quién sale">
        {/* Se enuncia por lo que añade, no por lo que quita: apagado es el estado de
            entrada, y un interruptor que arranca encendido para esconder gente se lee
            como si alguien hubiera tocado algo. */}
        <Interruptor
          titulo="Mostrar no conectadas"
          nota={`${escondidos} personas de la familia política`}
          activo={!ocultar}
          onPulsar={() => setOcultar(!ocultar)}
        />
      </Tramo>

      <Tramo titulo="El árbol">
        <Interruptor
          titulo="Desplegar todo"
          nota="trae de golpe a toda la familia alcanzable"
          activo={todoDesplegado}
          onPulsar={onDesplegarTodo}
        />
        <button
          type="button"
          onClick={onReiniciar}
          className="flex min-h-11 items-center rounded-lg bg-[var(--soft)] px-3 text-left text-[13px] text-[var(--ink)]"
        >
          Reiniciar
          <span className="ml-auto text-[11.5px] text-[var(--mut)]">vuelve al punto de vista de entrada</span>
        </button>
      </Tramo>

      <Tramo titulo="Uniones">{leyenda}</Tramo>
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
  nota: string;
  activo: boolean;
  onPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPulsar}
      aria-pressed={activo}
      className={`flex min-h-13 items-center gap-3 rounded-lg px-3 text-left ${
        activo ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--soft)] text-[var(--ink)]"
      }`}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[13px]">{titulo}</span>
        <span className={`text-[11.5px] ${activo ? "opacity-70" : "text-[var(--mut)]"}`}>{nota}</span>
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
}: {
  titulo: string;
  opciones: readonly T[];
  actual: T;
  onElegir: (v: T) => void;
  nombrar: (v: T) => string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-1 rounded-lg bg-[var(--soft)] px-3">
      <span className="flex-1 text-[13px] text-[var(--ink)]">{titulo}</span>
      {opciones.map((opcion) => (
        <button
          key={String(opcion)}
          type="button"
          onClick={() => onElegir(opcion)}
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
