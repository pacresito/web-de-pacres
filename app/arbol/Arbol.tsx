"use client";

// El lienzo: un solo árbol en SVG con pan y zoom, reanclado al punto de vista.
// Toda la lógica (quién sale, en qué columna y a qué altura) vive en lib/arbol; aquí
// solo se pinta y se recogen los gestos. El estilo es sobrio a propósito: la estructura
// está cerrada, el diseño llega después.

import { useEffect, useMemo, useRef, useState } from "react";
import { construirGrafo } from "@/lib/arbol/grafo";
import { CAMPOS_COMPLETOS, detalleDe, nombreIncierto, partirNombre, type Campos } from "@/lib/arbol/etiquetas";
import { apellidosNuevos, etiquetaDe, type Apellidos } from "@/lib/arbol/personas";
import {
  ALTO_CONTADOR,
  ALTO_NODO,
  ANCHO_COLUMNA,
  ANCHO_CONTADOR,
  ANCHO_NODO,
  calcularLayout,
  type Contador,
  type NodoLayout,
} from "@/lib/arbol/layout";
import type { ArbolData, Persona } from "@/lib/arbol/tree";

const POR_DEFECTO = "p25";
const ESCALA_MIN = 0.12;
const ESCALA_MAX = 2.2;
const ARRASTRE_MINIMO = 8; // px: por debajo de esto el gesto es un toque, no un arrastre
const INCIERTO = "#c2410c"; // el dato que el documento no daba por seguro

/** La cámara se guarda relativa al punto de vista: así lo persigue sin efectos ni saltos. */
interface Vista {
  dx: number;
  dy: number;
  escala: number;
}

const CENTRADA: Vista = { dx: 0, dy: 0, escala: 0.85 };

/** Acerca o aleja dejando quieto el punto que hay bajo los dedos (o bajo el cursor). */
function conZoom(v: Vista, factor: number, px: number, py: number, caja: DOMRect): Vista {
  const escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v.escala * factor));
  if (escala === v.escala) return v;
  const desfase = 1 / v.escala - 1 / escala;
  return {
    escala,
    dx: v.dx + (px - caja.left - caja.width / 2) * desfase,
    dy: v.dy + (py - caja.top - caja.height / 2) * desfase,
  };
}

export default function Arbol({ data }: { data: ArbolData }) {
  const grafo = useMemo(() => construirGrafo(data), [data]);
  const personaPorId = grafo.personaPorId;

  const inicial = grafo.personaPorId.has(POR_DEFECTO) ? POR_DEFECTO : (data.people[0]?.id ?? POR_DEFECTO);
  const [puntoDeVista, setPuntoDeVista] = useState(inicial);
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  const [todoDesplegado, setTodoDesplegado] = useState(false);
  const [ocultarNoConectados, setOcultarNoConectados] = useState(false);
  const [campos, setCampos] = useState<Campos>(CAMPOS_COMPLETOS);
  const [apellidos, setApellidos] = useState<Apellidos>("nuevos");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>(CENTRADA);
  const [tamano, setTamano] = useState({ w: 0, h: 0 });

  const contenedor = useRef<HTMLDivElement>(null);

  // «Desplegar todo» es un interruptor y manda sobre lo abierto a mano; ninguno de los
  // dos se pierde al cambiar de punto de vista.
  const expandidas = useMemo(
    () => (todoDesplegado ? new Set(grafo.unionPorId.keys()) : abiertas),
    [todoDesplegado, abiertas, grafo],
  );
  const nuevos = useMemo(() => apellidosNuevos(grafo), [grafo]);

  const layout = useMemo(
    () => calcularLayout(grafo, { puntoDeVista, expandidas, ocultarNoConectados }),
    [grafo, puntoDeVista, expandidas, ocultarNoConectados],
  );

  // El hueco disponible manda el tamaño del lienzo. La primera medida se toma a mano
  // en el siguiente frame: el observador no siempre entrega la de la carga inicial.
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const medir = () => {
      const { width, height } = nodo.getBoundingClientRect();
      setTamano({ w: width, h: height });
    };
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    window.addEventListener("resize", medir);
    const frame = requestAnimationFrame(medir);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", medir);
      observador.disconnect();
    };
  }, []);

  const anclaje = layout.nodos.find((n) => n.esPuntoDeVista);
  const centro = { x: (anclaje?.x ?? 0) + vista.dx, y: (anclaje?.y ?? 0) + vista.dy };

  function elegirPuntoDeVista(id: string) {
    if (id === puntoDeVista) {
      // Volver a tocar al que ya lo es es la forma de replegarlo todo.
      setAbiertas(new Set());
      setTodoDesplegado(false);
      return;
    }
    setPuntoDeVista(id);
    // La cámara no se mueve: quien has tocado se queda donde estaba en pantalla, aunque
    // el árbol entero se recoloque a su alrededor.
    const anterior = layout.nodos.find((n) => n.esPuntoDeVista);
    const tocado = layout.nodos.find((n) => n.id === id);
    if (anterior && tocado) {
      setVista((v) => ({ ...v, dx: v.dx + anterior.x - tocado.x, dy: v.dy + anterior.y - tocado.y }));
    }
  }

  /** Abrir y cerrar son la misma acción sobre la misma unión: el contador y la pareja. */
  function alternarRama(unionId: string) {
    setAbiertas((previas) => {
      const siguientes = new Set(todoDesplegado ? expandidas : previas);
      if (!siguientes.delete(unionId)) siguientes.add(unionId);
      return siguientes;
    });
    setTodoDesplegado(false); // a partir de aquí manda lo que se abra a mano
  }

  function reiniciar() {
    setPuntoDeVista(inicial);
    setAbiertas(new Set());
    setTodoDesplegado(false);
    setOcultarNoConectados(false);
    setCampos(CAMPOS_COMPLETOS);
    setApellidos("nuevos");
    setVista(CENTRADA);
  }

  // --- Gestos: un puntero arrastra, dos pellizcan (vale igual para ratón y dedo) ---
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<{ distancia: number; centro: { x: number; y: number } } | null>(null);
  const arrastre = useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 1) arrastre.current = 0;
    pellizco.current = null;
  }

  function onPointerMove(e: React.PointerEvent) {
    const previo = punteros.current.get(e.pointerId);
    if (!previo) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const puntos = [...punteros.current.values()];

    if (puntos.length === 1) {
      const dx = e.clientX - previo.x;
      const dy = e.clientY - previo.y;
      arrastre.current += Math.abs(dx) + Math.abs(dy);
      // Hasta que el gesto no es un arrastre de verdad no se mueve nada: un clic con
      // ratón trae siempre uno o dos píxeles de temblor, y pinchar y pinchar movía la
      // vista sin que nadie la arrastrase.
      if (arrastre.current > ARRASTRE_MINIMO) {
        setVista((v) => ({ ...v, dx: v.dx - dx / v.escala, dy: v.dy - dy / v.escala }));
      }
      return;
    }
    if (puntos.length < 2) return;

    arrastre.current = ARRASTRE_MINIMO + 1;
    const [a, b] = puntos;
    const distancia = Math.hypot(a.x - b.x, a.y - b.y);
    const centro = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const anteriorPellizco = pellizco.current;
    pellizco.current = { distancia, centro };
    if (!anteriorPellizco || anteriorPellizco.distancia === 0) return;
    ajustarZoom(distancia / anteriorPellizco.distancia, centro.x, centro.y);
  }

  function onPointerUp(e: React.PointerEvent) {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pellizco.current = null;
  }

  function ajustarZoom(factor: number, px: number, py: number) {
    const caja = contenedor.current?.getBoundingClientRect();
    if (caja) setVista((v) => conZoom(v, factor, px, py, caja));
  }

  // La rueda con preventDefault necesita un listener no pasivo.
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const alGirar = (e: WheelEvent) => {
      e.preventDefault();
      setVista((v) => conZoom(v, Math.exp(-e.deltaY / 400), e.clientX, e.clientY, nodo.getBoundingClientRect()));
    };
    nodo.addEventListener("wheel", alGirar, { passive: false });
    return () => nodo.removeEventListener("wheel", alGirar);
  }, []);

  const transformacion = `translate(${tamano.w / 2} ${tamano.h / 2}) scale(${vista.escala}) translate(${-centro.x} ${-centro.y})`;
  const niveles = useMemo(() => [...new Set(layout.nodos.map((n) => n.nivel))].sort((a, b) => a - b), [layout]);
  const generacionPov = grafo.generacion.get(puntoDeVista) ?? 0;
  const { minY, maxY } = layout.limites;

  return (
    <div ref={contenedor} className="relative h-full w-full touch-none overflow-hidden bg-neutral-50">
      <svg
        width={tamano.w}
        height={tamano.h}
        className="block cursor-grab select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Hasta medir el hueco no se pinta nada: el servidor no sabe ni el tamaño ni
            el punto de vista guardado, así que la hidratación cuadra con el lienzo vacío. */}
        {tamano.w > 0 && (
        <g transform={transformacion}>
          {/* Banda por generación: todos los de una columna comparten tratamiento. El
              claroscuro va por la generación absoluta, no por la relativa: si no, cambiar
              de punto de vista invierte el fondo entero y parece otra pantalla. */}
          {niveles.map((nivel) => (
            <rect
              key={nivel}
              x={-nivel * ANCHO_COLUMNA - ANCHO_COLUMNA / 2}
              y={minY - 600}
              width={ANCHO_COLUMNA}
              height={maxY - minY + 1200}
              fill={(generacionPov - nivel) % 2 === 0 ? "#ffffff" : "#f4f4f3"}
            />
          ))}

          {layout.vinculos.map((v) => (
            <g key={v.unionId} stroke="#c4c4c2" strokeWidth={1.5} fill="none">
              {/* El trazo de la pareja va más marcado: en una columna apretada es lo
                  único que distingue a un matrimonio de dos vecinos cualesquiera. */}
              {v.pareja && <line x1={v.x} y1={v.pareja[0]} x2={v.x} y2={v.pareja[1]} stroke="#8a8a87" strokeWidth={2.5} />}
              {v.hijos.map((h, i) => (
                <path
                  key={i}
                  d={`M ${v.x + ANCHO_NODO / 2} ${v.y} H ${(v.x + h.x) / 2} V ${h.y} H ${h.x - ANCHO_NODO / 2}`}
                />
              ))}
            </g>
          ))}

          {layout.contadores.map((c) => (
            <ContadorRama
              key={`${c.sentido}:${c.unionId}`}
              contador={c}
              onAbrir={() => arrastre.current <= ARRASTRE_MINIMO && alternarRama(c.unionId)}
            />
          ))}

          {layout.nodos.map((n) => {
            const persona = personaPorId.get(n.id);
            if (!persona) return null;
            return (
              <Nodo
                key={n.id}
                nodo={n}
                persona={persona}
                campos={campos}
                etiqueta={etiquetaDe(persona, apellidos, nuevos.get(n.id) ?? [])}
                onElegir={() => arrastre.current <= ARRASTRE_MINIMO && elegirPuntoDeVista(n.id)}
              />
            );
          })}

          {/* Lo que se abrió a mano se cierra por donde se abrió: en su propia unión.
              Va después de los nodos para quedar por encima y poder pulsarse. */}
          {layout.vinculos
            .filter((v) => v.colapsable)
            .map((v) => (
              <Manija
                key={`x:${v.unionId}`}
                x={v.x + ANCHO_NODO / 2 + 14}
                y={v.y}
                onPulsar={() => arrastre.current <= ARRASTRE_MINIMO && alternarRama(v.unionId)}
              />
            ))}
        </g>
        )}
      </svg>

      <Controles
        campos={campos}
        setCampos={setCampos}
        apellidos={apellidos}
        setApellidos={setApellidos}
        ocultar={ocultarNoConectados}
        setOcultar={setOcultarNoConectados}
        abierto={panelAbierto}
        setAbierto={setPanelAbierto}
        onCentrar={() => setVista(CENTRADA)}
        todoDesplegado={todoDesplegado}
        onDesplegarTodo={() => {
          setTodoDesplegado(!todoDesplegado);
          setAbiertas(new Set());
        }}
        onReiniciar={reiniciar}
      />
    </div>
  );
}

// El nodo se dimensionó para que quepan enteros el nombre más largo del árbol (28
// caracteres) y la nota más larga (36): medido en el navegador, 6,6px por carácter a
// 13px. El recorte de aquí es la red por si entran datos nuevos, no el caso normal.
const CARACTERES_POR_LINEA = 30;

function Nodo({
  nodo,
  persona,
  campos,
  etiqueta,
  onElegir,
}: {
  nodo: NodoLayout;
  persona: Persona;
  campos: Campos;
  etiqueta: string;
  onElegir: () => void;
}) {
  const detalle = detalleDe(persona, campos);
  const lineas = partirNombre(etiqueta, CARACTERES_POR_LINEA, detalle.length > 0 ? 1 : 2);
  const primeraY = nodo.y + (detalle.length > 0 || lineas.length > 1 ? -4 : 5);
  const dudoso = nombreIncierto(persona, campos);
  return (
    <g onClick={onElegir} className="cursor-pointer">
      <rect
        x={nodo.x - ANCHO_NODO / 2}
        y={nodo.y - ALTO_NODO / 2}
        width={ANCHO_NODO}
        height={ALTO_NODO}
        rx={8}
        // La línea directa lleva relleno, no solo borde: al alejarse, 2px de trazo
        // desaparecen y una mancha de color no.
        fill={nodo.esPuntoDeVista ? "#00b87a" : nodo.lineaDirecta ? "#e4f4ed" : "#ffffff"}
        stroke={nodo.esPuntoDeVista ? "#00b87a" : nodo.lineaDirecta ? "#4a4a48" : "#d4d4d2"}
        strokeWidth={nodo.lineaDirecta ? 2 : 1}
      />
      <text
        textAnchor="middle"
        fontSize={13}
        fill={nodo.esPuntoDeVista ? "#ffffff" : dudoso ? INCIERTO : "#1c1c1a"}
        fontWeight={nodo.lineaDirecta ? 600 : 400}
        fontStyle={dudoso ? "italic" : undefined}
      >
        {lineas.map((linea, i) => (
          <tspan key={i} x={nodo.x} y={primeraY + i * 15}>
            {linea}
          </tspan>
        ))}
      </text>
      {detalle.length > 0 && (
        <text x={nodo.x} y={nodo.y + 14} textAnchor="middle" fontSize={11}>
          {detalle.map((segmento, i) => (
            <tspan
              key={i}
              fill={segmento.incierto ? INCIERTO : nodo.esPuntoDeVista ? "#e6fff5" : "#8a8a87"}
              fontStyle={segmento.incierto ? "italic" : undefined}
            >
              {i > 0 && " · "}
              {segmento.texto}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

/** El botón de cerrar una rama, justo donde se abrió: sobre la unión. */
function Manija({ x, y, onPulsar }: { x: number; y: number; onPulsar: () => void }) {
  return (
    <g onClick={onPulsar} className="cursor-pointer">
      <circle cx={x} cy={y} r={11} fill="#ffffff" stroke="#b6b6b3" />
      <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke="#5a5a57" strokeWidth={1.5} />
    </g>
  );
}

function ContadorRama({ contador, onAbrir }: { contador: Contador; onAbrir: () => void }) {
  return (
    <g onClick={onAbrir} className="cursor-pointer">
      <rect
        x={contador.x - ANCHO_CONTADOR / 2}
        y={contador.y - ALTO_CONTADOR / 2}
        width={ANCHO_CONTADOR}
        height={ALTO_CONTADOR}
        rx={ALTO_CONTADOR / 2}
        fill="#ffffff"
        stroke="#b6b6b3"
        strokeDasharray="4 3"
      />
      <text x={contador.x} y={contador.y + 4} textAnchor="middle" fontSize={12} fill="#5a5a57">
        +{contador.cantidad} {contador.sentido}
      </text>
    </g>
  );
}

function Controles({
  campos,
  setCampos,
  apellidos,
  setApellidos,
  ocultar,
  setOcultar,
  abierto,
  setAbierto,
  onCentrar,
  todoDesplegado,
  onDesplegarTodo,
  onReiniciar,
}: {
  campos: Campos;
  setCampos: (c: Campos) => void;
  apellidos: Apellidos;
  setApellidos: (a: Apellidos) => void;
  ocultar: boolean;
  setOcultar: (v: boolean) => void;
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  onCentrar: () => void;
  todoDesplegado: boolean;
  onDesplegarTodo: () => void;
  onReiniciar: () => void;
}) {
  const interruptor = (activo: boolean, texto: string, alPulsar: () => void) => (
    <button
      key={texto}
      type="button"
      onClick={alPulsar}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] ${
        activo ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
      }`}
    >
      {texto}
      <span className={`h-2 w-2 rounded-full ${activo ? "bg-[#00b87a]" : "bg-neutral-300"}`} />
    </button>
  );

  const boton = (texto: string, alPulsar: () => void) => (
    <button
      key={texto}
      type="button"
      onClick={alPulsar}
      className="h-11 rounded-full border border-neutral-200 bg-white px-4 text-[13px] font-medium text-neutral-700 shadow-lg"
    >
      {texto}
    </button>
  );

  return (
    <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
      {abierto && (
        <div className="flex w-60 flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <div className="flex flex-col gap-1">
            <p className="px-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Mostrar en cada nodo</p>
            {/* «Nuevos» solo los enseña quien los estrena en su línea; 1 y 2, todo el mundo. */}
            <div className="flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5">
              <span className="flex-1 text-[13px] text-neutral-700">Apellidos</span>
              {(["nuevos", 0, 1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setApellidos(n)}
                  className={`h-6 rounded-md px-2 text-[12px] ${
                    apellidos === n ? "bg-neutral-900 text-white" : "text-neutral-500"
                  }`}
                >
                  {n === "nuevos" ? "nuevos" : n}
                </button>
              ))}
            </div>
            {interruptor(campos.fechas, "Fechas", () => setCampos({ ...campos, fechas: !campos.fechas }))}
            {interruptor(campos.notas, "Notas y apodos", () => setCampos({ ...campos, notas: !campos.notas }))}
            {interruptor(campos.dudoso, "Resaltar dato dudoso", () => setCampos({ ...campos, dudoso: !campos.dudoso }))}
          </div>
          <div className="flex flex-col gap-1">
            <p className="px-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Ramas</p>
            {interruptor(ocultar, "Ocultar no conectadas", () => setOcultar(!ocultar))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {boton(todoDesplegado ? "Plegar todo" : "Desplegar todo", onDesplegarTodo)}
        {boton("Reiniciar", onReiniciar)}
        {boton("Centrar", onCentrar)}
        {boton(abierto ? "Cerrar" : "Ver", () => setAbierto(!abierto))}
      </div>
    </div>
  );
}
