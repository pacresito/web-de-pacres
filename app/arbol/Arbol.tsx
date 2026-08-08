"use client";

// El lienzo: un solo árbol en SVG con pan y zoom, reanclado al punto de vista.
// Toda la lógica (quién sale, en qué columna, a qué altura y con qué texto) vive en
// lib/arbol; aquí solo se pinta y se recogen los gestos. Los colores no se escriben aquí:
// salen de los tokens de `.arbol` en globals.css, que es lo que vira con el tema.

import { useEffect, useMemo, useRef, useState } from "react";
import { acotar, brujulaDe, conZoom, type Encuadre, type Rumbo, type Vista } from "@/lib/arbol/camara";
import { proximasCelebraciones } from "@/lib/arbol/celebraciones";
import { construirGrafo } from "@/lib/arbol/grafo";
import { CAMPOS_POR_DEFECTO, type Campos, type ModoFechas } from "@/lib/arbol/etiquetas";
import { identidadDe, LARGOS_NODO, libretaDe, type Identidad, type Pinta } from "@/lib/arbol/identidad";
import type { ModoApellidos } from "@/lib/arbol/personas";
import {
  ALTO_CONTADOR,
  ALTO_NODO,
  ANCHO_COLUMNA,
  ANCHO_CONTADOR,
  ANCHO_NODO,
  calcularLayout,
  RADIO_SALTO,
  type Contador,
  type NodoLayout,
} from "@/lib/arbol/layout";
import { calcularRecuento, type Fraccion } from "@/lib/arbol/recuento";
import type { ArbolData, Union } from "@/lib/arbol/tree";
import Celebraciones from "./Celebraciones";
import Recuento from "./Recuento";

const POR_DEFECTO = "p25";
const ARRASTRE_MINIMO = 8; // px: por debajo de esto el gesto es un toque, no un arrastre
// Señalar una fracción del recuento atenúa el resto del lienzo en vez de encender lo suyo:
// el acento es del punto de vista y de nada más, y encender con otro color sería inventarse
// un tercer eje encima de los dos que el árbol ya dice.
const ATENUADO = 0.15;

const CENTRADA: Vista = { dx: 0, dy: 0, escala: 0.85 };

export default function Arbol({ data, hoy }: { data: ArbolData; hoy: string }) {
  const grafo = useMemo(() => construirGrafo(data), [data]);
  const personaPorId = grafo.personaPorId;

  const inicial = grafo.personaPorId.has(POR_DEFECTO) ? POR_DEFECTO : (data.people[0]?.id ?? POR_DEFECTO);
  const [puntoDeVista, setPuntoDeVista] = useState(inicial);
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  // Aparte de las abiertas: de estas se ha pedido solo la pareja, no sus hijos.
  const [parejas, setParejas] = useState<Set<string>>(() => new Set());
  const [todoDesplegado, setTodoDesplegado] = useState(false);
  const [ocultarNoConectados, setOcultarNoConectados] = useState(true);
  const [campos, setCampos] = useState<Campos>(CAMPOS_POR_DEFECTO);
  const [apellidos, setApellidos] = useState<ModoApellidos>("nuevos");
  const [panelAbierto, setPanelAbierto] = useState(false);
  // Los dos paneles de arriba comparten el borde superior, así que se turnan: en un móvil
  // abiertos a la vez se pisan, y el que queda debajo no se lee ni se puede cerrar.
  const [arriba, setArriba] = useState<"recuento" | "celebraciones" | null>(null);
  /** Lo que se resalta del lienzo: el numerador de la fracción señalada, o nada. */
  const [resaltados, setResaltados] = useState<Set<string> | null>(null);
  const [vista, setVista] = useState<Vista>(CENTRADA);
  const [tamano, setTamano] = useState({ w: 0, h: 0 });

  const contenedor = useRef<HTMLDivElement>(null);

  // «Desplegar todo» es un interruptor y manda sobre lo abierto a mano; ninguno de los
  // dos se pierde al cambiar de punto de vista.
  const expandidas = useMemo(
    () => (todoDesplegado ? new Set(grafo.unionPorId.keys()) : abiertas),
    [todoDesplegado, abiertas, grafo],
  );
  const libreta = useMemo(() => libretaDe(grafo), [grafo]);

  const layout = useMemo(
    () => calcularLayout(grafo, { puntoDeVista, expandidas, parejas, ocultarNoConectados }),
    [grafo, puntoDeVista, expandidas, parejas, ocultarNoConectados],
  );
  const cuentas = useMemo(
    () => calcularRecuento(grafo, { puntoDeVista, ocultarNoConectados }, new Set(layout.nodos.map((n) => n.id))),
    [grafo, puntoDeVista, ocultarNoConectados, layout],
  );
  const celebraciones = useMemo(
    () => proximasCelebraciones(grafo, puntoDeVista, hoy),
    [grafo, puntoDeVista, hoy],
  );
  /** Quien cumple años hoy se lleva además una tarta en su nodo, sin abrir nada. */
  const cumplenHoy = useMemo(
    () => new Set(celebraciones.filter((c) => c.tipo === "cumpleaños" && c.faltan === 0).map((c) => c.id!)),
    [celebraciones],
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
  const ancla = { x: anclaje?.x ?? 0, y: anclaje?.y ?? 0 };
  const centro = { x: ancla.x + vista.dx, y: ancla.y + vista.dy };

  // El encuadre se guarda en un ref porque lo consultan gestos que no se rehacen en cada
  // render (la rueda) y las funciones de actualización de setVista, que solo ven la vista.
  // Y se reacota al cambiar él: desplegar una rama o mudar el punto de vista mueven los
  // límites bajo una cámara que ya estaba puesta.
  const encuadre = useRef<Encuadre>({ ancla, limites: layout.limites, w: 0, h: 0 });
  useEffect(() => {
    encuadre.current = { ancla: { x: ancla.x, y: ancla.y }, limites: layout.limites, w: tamano.w, h: tamano.h };
    setVista((v) => acotar(v, encuadre.current));
  }, [ancla.x, ancla.y, layout.limites, tamano.w, tamano.h]);

  /** Los gestos mueven la cámara por aquí: moverla sin acotar es perderse. */
  function mover(paso: (v: Vista) => Vista) {
    setVista((v) => acotar(paso(v), encuadre.current));
  }

  function elegirPuntoDeVista(id: string) {
    if (id === puntoDeVista) {
      // Volver a tocar al que ya lo es es la forma de replegarlo todo.
      setAbiertas(new Set());
      setParejas(new Set());
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

  /**
   * Abrir y cerrar son dos acciones y no una sola con memoria: sobre la misma unión
   * pueden convivir el contador de los hijos y la manija de la pareja ya traída, y un
   * único interruptor haría que pulsar el contador cerrase en vez de abrir.
   */
  function abrirRamas(uniones: string[]) {
    setAbiertas((previas) => {
      const siguientes = new Set(todoDesplegado ? expandidas : previas);
      for (const unionId of uniones) siguientes.add(unionId);
      return siguientes;
    });
    setTodoDesplegado(false); // a partir de aquí manda lo que se abra a mano
  }

  function cerrarRamas(uniones: string[]) {
    setAbiertas((previas) => {
      const siguientes = new Set(todoDesplegado ? expandidas : previas);
      for (const unionId of uniones) siguientes.delete(unionId);
      return siguientes;
    });
    // Se lleva también a la pareja que se hubiera pedido suelta: la manija cierra la
    // unión entera, y si no, replegarla dejaría media puesta sin nada que la anuncie.
    setParejas((previas) => {
      if (!uniones.some((unionId) => previas.has(unionId))) return previas;
      const siguientes = new Set(previas);
      for (const unionId of uniones) siguientes.delete(unionId);
      return siguientes;
    });
    setTodoDesplegado(false);
  }

  /**
   * Una fracción del recuento no se puede desplegar en aislado: para pintar a un primo
   * segundo hay que abrir antes la unión de sus padres, y así hasta el punto de vista.
   * Pulsarla trae lo pedido y todo lo que hace falta para llegar; pulsarla ya llena quita
   * justo esas uniones y la repliega hasta el núcleo, como la manija «−» del lienzo.
   */
  function pulsarFraccion({ puestos, alcanzables, uniones }: Fraccion) {
    setResaltados(null); // lo que acaba de llegar se ve, no se atenúa
    if (uniones.length === 0) return;
    if (puestos.length === alcanzables) cerrarRamas(uniones);
    else abrirRamas(uniones);
  }

  /** El «+» trae a la pareja y nada más: los hijos siguen detrás de su propio contador. */
  function mostrarPareja(unionId: string) {
    setParejas((previas) => new Set(previas).add(unionId));
  }

  function reiniciar() {
    setPuntoDeVista(inicial);
    setAbiertas(new Set());
    setParejas(new Set());
    setTodoDesplegado(false);
    setOcultarNoConectados(true);
    setCampos(CAMPOS_POR_DEFECTO);
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
        mover((v) => ({ ...v, dx: v.dx - dx / v.escala, dy: v.dy - dy / v.escala }));
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
    if (caja) mover((v) => conZoom(v, factor, px, py, caja));
  }

  // La rueda con preventDefault necesita un listener no pasivo.
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const alGirar = (e: WheelEvent) => {
      e.preventDefault();
      // El pellizco de trackpad llega como rueda con ctrlKey; la rueda a secas —y el
      // deslizar con dos dedos— desplaza. El zoom ya lo dan el pellizco y ctrl+rueda.
      // Acota aquí y no por `mover`: el listener se registra una vez y no ve el render.
      if (e.ctrlKey) {
        const caja = nodo.getBoundingClientRect();
        setVista((v) => acotar(conZoom(v, Math.exp(-e.deltaY / 400), e.clientX, e.clientY, caja), encuadre.current));
        return;
      }
      setVista((v) =>
        acotar({ ...v, dx: v.dx + e.deltaX / v.escala, dy: v.dy + e.deltaY / v.escala }, encuadre.current),
      );
    };
    nodo.addEventListener("wheel", alGirar, { passive: false });
    return () => nodo.removeEventListener("wheel", alGirar);
  }, []);

  const brujula = brujulaDe(vista, tamano.w, tamano.h);
  const transformacion = `translate(${tamano.w / 2} ${tamano.h / 2}) scale(${vista.escala}) translate(${-centro.x} ${-centro.y})`;
  const niveles = useMemo(() => [...new Set(layout.nodos.map((n) => n.nivel))].sort((a, b) => a - b), [layout]);
  const generacionPov = grafo.generacion.get(puntoDeVista) ?? 0;
  const { minY, maxY } = layout.limites;
  /** Con una fracción señalada, todo lo que no es suyo se va al fondo. Sin ella, nada cambia. */
  const opacidadDe = (id?: string) => (!resaltados || (id && resaltados.has(id)) ? undefined : ATENUADO);

  return (
    <div ref={contenedor} className="relative h-full w-full touch-none overflow-hidden bg-[var(--paper)]">
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
              className={(generacionPov - nivel) % 2 === 0 ? "banda-a" : "banda-b"}
            />
          ))}

          {/* El reparto arranca en la propia unión y muere en el borde de cada hijo: los
              tramos que cruzan un nodo quedan tapados por él, y lo que se ve toca a los dos. */}
          <g opacity={opacidadDe()}>
            {layout.vinculos.map((v) => (
              <g key={v.unionId} className={v.directo ? "lk-dir" : "lk"}>
                {v.hijos.map((h, i) => (
                  <path
                    key={i}
                    d={
                      h.recto
                        ? `M ${v.x} ${v.y} ${horizontal(h.x - h.ancho / 2, v.y, h.saltos)}`
                        : `M ${v.x} ${v.y} ${horizontal(v.canal, v.y, v.saltos)} V ${h.y} ${horizontal(h.x - h.ancho / 2, h.y, h.saltos)}`
                    }
                  />
                ))}
                {v.pareja && <TrazoDePareja x={v.x} extremos={v.pareja} tipo={v.tipo} roto={v.roto} />}
              </g>
            ))}
          </g>

          <g opacity={opacidadDe()}>
            {layout.contadores.map((c) => (
              <ContadorRama
                key={`${c.sentido}:${c.unionId}`}
                contador={c}
                onAbrir={() => arrastre.current <= ARRASTRE_MINIMO && abrirRamas([c.unionId])}
              />
            ))}
          </g>

          {layout.nodos.map((n) => (
            <Nodo
              key={n.id}
              nodo={n}
              identidad={identidadDe(grafo, n.id, {
                linaje: libreta.linaje,
                campos,
                apellidos,
                hoy,
                largos: LARGOS_NODO,
                homonimia: libreta.homonimias.get(n.id),
              })}
              cumpleHoy={cumplenHoy.has(n.id)}
              atenuado={opacidadDe(n.id) !== undefined}
              onElegir={() => arrastre.current <= ARRASTRE_MINIMO && elegirPuntoDeVista(n.id)}
            />
          ))}

          <g opacity={opacidadDe()}>
            {/* Las parejas que no se pintan, asomando por su borde. Como la manija, van
                después de los nodos: por encima del suyo y por delante para pulsarlas. */}
            {layout.nodos.flatMap((n) =>
              n.pendientes.map((p) => (
                <MasPareja
                  key={`+:${p.unionId}`}
                  x={n.x}
                  y={n.y + (p.arriba ? -ALTO_NODO / 2 : ALTO_NODO / 2)}
                  onAbrir={() => arrastre.current <= ARRASTRE_MINIMO && mostrarPareja(p.unionId)}
                />
              )),
            )}

            {/* Lo que se abrió a mano se cierra por donde se abrió: en su propia unión.
                Va después de los nodos para quedar por encima y poder pulsarse. */}
            {layout.vinculos
              .filter((v) => v.colapsable)
              .map((v) => (
                <Manija
                  key={`x:${v.unionId}`}
                  x={v.x + ANCHO_NODO / 2 + 14}
                  y={v.y}
                  onPulsar={() => arrastre.current <= ARRASTRE_MINIMO && cerrarRamas([v.unionId])}
                />
              ))}
          </g>
        </g>
        )}
      </svg>

      {brujula && (
        <Brujula
          posicion={brujula}
          nombre={personaPorId.get(puntoDeVista)?.nombre ?? ""}
          onVolver={() => mover(() => CENTRADA)}
        />
      )}

      <Recuento
        cuentas={cuentas}
        abierto={arriba === "recuento"}
        setAbierto={(v) => setArriba(v ? "recuento" : null)}
        onPulsar={pulsarFraccion}
        onResaltar={(ids) => setResaltados(ids ? new Set(ids) : null)}
      />

      <Celebraciones
        lista={celebraciones}
        abierto={arriba === "celebraciones"}
        setAbierto={(v) => setArriba(v ? "celebraciones" : null)}
      />

      <Controles
        campos={campos}
        setCampos={setCampos}
        apellidos={apellidos}
        setApellidos={setApellidos}
        ocultar={ocultarNoConectados}
        setOcultar={setOcultarNoConectados}
        abierto={panelAbierto}
        setAbierto={setPanelAbierto}
        todoDesplegado={todoDesplegado}
        onDesplegarTodo={() => {
          setTodoDesplegado(!todoDesplegado);
          setAbiertas(new Set());
          setParejas(new Set());
        }}
        onReiniciar={reiniciar}
      />
    </div>
  );
}

/**
 * La brújula: cuando el punto de vista se va de la pantalla asoma por el borde en su
 * dirección, con su nombre, y devuelve a él. Sustituye al botón de centrar, que estaba
 * siempre y no decía nada; esta solo aparece cuando hace falta y dice hacia dónde.
 */
function Brujula({ posicion, nombre, onVolver }: { posicion: Rumbo; nombre: string; onVolver: () => void }) {
  return (
    <button
      type="button"
      onClick={onVolver}
      style={{ left: posicion.x, top: posicion.y, boxShadow: "var(--sh)" }}
      className="absolute flex h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper)] pr-3 pl-2.5 text-[12px] font-medium whitespace-nowrap text-[var(--ink)]"
    >
      <svg width={13} height={13} viewBox="-6.5 -6.5 13 13" style={{ transform: `rotate(${posicion.angulo}deg)` }}>
        {/* El color va por `style`: en SVG un atributo de presentación no resuelve var(). */}
        <path
          d="M -4.5 0 H 4 M 1 -3 L 4 0 L 1 3"
          fill="none"
          style={{ stroke: "var(--acc)" }}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {nombre}
    </button>
  );
}

const SANGRADO = 9; // el aire entre el borde del nodo y su texto

/** Cada trozo de la primera línea, con la clase y la cursiva que le tocan. */
const PINTAS: Record<Pinta, { clase: string; cursiva?: boolean }> = {
  nombre: { clase: "nm" },
  dudoso: { clase: "nm", cursiva: true },
  heredado: { clase: "nm-her" },
  año: { clase: "nm-fecha" },
  sinNombre: { clase: "nm-her", cursiva: true },
};

/**
 * El nodo es el bloque de identidad y nada más: quién es arriba y de quién es debajo. Los
 * dos ejes del dibujo se dicen sin color —el sitio en el árbol, con la posición; la línea
 * directa del punto de vista, con el peso del trazo—, así que el acento se queda para lo
 * único que no se puede decir de otra forma: dónde estás tú.
 */
function Nodo({
  nodo,
  identidad,
  cumpleHoy,
  atenuado,
  onElegir,
}: {
  nodo: NodoLayout;
  identidad: Identidad;
  cumpleHoy: boolean;
  atenuado: boolean;
  onElegir: () => void;
}) {
  const izquierda = nodo.x - ANCHO_NODO / 2 + SANGRADO;
  return (
    <g
      onClick={onElegir}
      // El contraste dice a cuántas generaciones del punto de vista está, y lo dice por
      // clase para que el tema oscuro pueda comprimir la escala sin que React lo sepa.
      className={`cursor-pointer g${Math.min(Math.abs(nodo.nivel), 4)}`}
      style={atenuado ? { opacity: ATENUADO } : undefined}
    >
      <rect
        x={nodo.x - ANCHO_NODO / 2}
        y={nodo.y - ALTO_NODO / 2}
        width={ANCHO_NODO}
        height={ALTO_NODO}
        rx={9}
        className={nodo.esPuntoDeVista ? "nd-pov" : nodo.lineaDirecta ? "nd-dir" : "nd"}
      />
      <text x={izquierda} y={nodo.y - 3} fontSize={13} fontWeight={600}>
        {identidad.titulo.map((trozo, i) => (
          <tspan key={i} className={PINTAS[trozo.pinta].clase} fontStyle={PINTAS[trozo.pinta].cursiva ? "italic" : undefined}>
            {trozo.texto}
          </tspan>
        ))}
      </text>
      {/* La segunda línea es lo que identifica de verdad a quien no trae ni apellido ni
          fecha: se pinta apagada, pero no se quita nunca. */}
      <text x={izquierda} y={nodo.y + 13} fontSize={10.5} className="ct">
        {identidad.contexto}
      </text>
      {/* La esquina de arriba a la derecha es la única que no usa ni la manija ni el «+»
          de la pareja, así que la tarta cabe sin taparle nada a nadie. */}
      {cumpleHoy && (
        <text x={nodo.x + ANCHO_NODO / 2 - 13} y={nodo.y - ALTO_NODO / 2 + 5} textAnchor="middle" fontSize={15}>
          🎂
        </text>
      )}
    </g>
  );
}

const GUION = "4 3"; // el trazo de la unión que acabó, rota como el tachón del documento
// Un corazón de 14×11 centrado en el origen: la marca de los novios que no se casaron.
// Más pequeño no cabía la grieta del roto sin volverse un borrón a tamaño de lectura.
const CORAZON = "M 0 5.5 C -7.4 0.3 -7.3 -5.6 -3.8 -5.6 C -1.4 -5.6 0 -3.9 0 -2.7 C 0 -3.9 1.4 -5.6 3.8 -5.6 C 7.3 -5.6 7.4 0.3 0 5.5 Z";
// La grieta del que se rompió, del escote al pico y en zigzag para que no parezca el trazo.
const GRIETA = "M 0 -2.7 L 1.7 -0.8 L -1.4 1.2 L 1.2 3.2 L 0 5.5";
// El trazo muere justo en el corazón, que por arriba es el escote y por abajo el pico.
const ESCOTE = 2.7;
const PICO = 5.5;

/**
 * El trazo que une a los dos miembros de una pareja, más marcado que el resto: en una
 * columna apretada es lo único que distingue a un matrimonio de dos vecinos cualesquiera.
 * Y dice qué unión es: **a rayas si se rompió** y **con un corazón si fueron novios y no
 * matrimonio** —partido si además se rompió, y entonces el trazo se queda entero: la
 * rotura ya la cuenta el corazón, y las dos rayas sueltas que quedaban a los lados de él
 * no se leían como un trazo discontinuo—. El corazón va relleno para comerse el trazo por
 * dentro y se pinta el último, tapando también el arranque de los hijos.
 */
/**
 * Un tramo horizontal hacia la derecha que salta por encima de los trazos que se cruza:
 * sin el saltito, un cruce y una bifurcación hacia dos hijos se dibujan igual.
 */
function horizontal(hasta: number, y: number, saltos: number[]): string {
  const arcos = saltos.map((x) => `H ${x - RADIO_SALTO} A ${RADIO_SALTO} ${RADIO_SALTO} 0 0 1 ${x + RADIO_SALTO} ${y}`);
  return [...arcos, `H ${hasta}`].join(" ");
}

function TrazoDePareja({
  x,
  extremos,
  tipo,
  roto,
}: {
  x: number;
  extremos: [number, number];
  tipo: Union["tipo"];
  roto: boolean;
}) {
  const [arriba, abajo] = [...extremos].sort((a, b) => a - b);
  const centro = (arriba + abajo) / 2;
  // El corazón se lleva su trozo de trazo: por arriba hasta el escote y por abajo hasta
  // el pico, que es donde el dibujo lo espera. A la misma distancia quedaba despegado.
  const tramos: [number, number][] =
    tipo === "pareja"
      ? [
          [arriba, centro - ESCOTE],
          [centro + PICO, abajo],
        ]
      : [[arriba, abajo]];
  return (
    <>
      {tramos.map(([desde, hasta], i) => (
        <line
          key={i}
          x1={x}
          y1={desde}
          x2={x}
          y2={hasta}
          className="par"
          strokeWidth={2.5}
          strokeDasharray={roto && tipo !== "pareja" ? GUION : undefined}
        />
      ))}
      {tipo === "pareja" && (
        <g transform={`translate(${x} ${centro})`} className="par-cor">
          <path d={CORAZON} strokeWidth={1.4} />
          {roto && <path d={GRIETA} strokeWidth={1} fill="none" />}
        </g>
      )}
    </>
  );
}

/** La pareja que no se pinta: un «+» discreto asomando por el borde en que ella iría. */
function MasPareja({ x, y, onAbrir }: { x: number; y: number; onAbrir: () => void }) {
  return (
    <g onClick={onAbrir} className="cursor-pointer">
      <circle cx={x} cy={y} r={13} fillOpacity={0} />
      <circle cx={x} cy={y} r={7.5} className="pieza" />
      <line x1={x - 3.5} y1={y} x2={x + 3.5} y2={y} className="par" strokeWidth={1.3} />
      <line x1={x} y1={y - 3.5} x2={x} y2={y + 3.5} className="par" strokeWidth={1.3} />
    </g>
  );
}

/** El botón de cerrar una rama, justo donde se abrió: sobre la unión. */
function Manija({ x, y, onPulsar }: { x: number; y: number; onPulsar: () => void }) {
  return (
    <g onClick={onPulsar} className="cursor-pointer">
      <circle cx={x} cy={y} r={11} className="pieza" />
      <line x1={x - 5} y1={y} x2={x + 5} y2={y} className="par" strokeWidth={1.5} />
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
        className="pieza"
        strokeDasharray="4 3"
      />
      <text x={contador.x} y={contador.y + 4} textAnchor="middle" fontSize={12} className="pieza-tx">
        +{contador.cantidad} {contador.sentido}
      </text>
    </g>
  );
}

/** Los cuatro trazos, tal cual salen en el lienzo: es lo único que dice qué significan. */
const UNIONES: { texto: string; tipo: Union["tipo"]; roto: boolean }[] = [
  { texto: "Matrimonio", tipo: "matrimonio", roto: false },
  { texto: "Novios", tipo: "pareja", roto: false },
  { texto: "Divorcio", tipo: "matrimonio", roto: true },
  { texto: "Ya no novios", tipo: "pareja", roto: true },
];

function Leyenda() {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 font-[family-name:var(--mono)] text-[9.5px] font-medium tracking-[0.12em] text-[var(--mut)] uppercase">
        Uniones
      </p>
      <div className="grid grid-cols-2 gap-x-2">
        {UNIONES.map(({ texto, tipo, roto }) => (
          <div key={texto} className="flex items-center gap-1.5">
            <svg width={18} height={30} className="shrink-0">
              <TrazoDePareja x={9} extremos={[2, 28]} tipo={tipo} roto={roto} />
            </svg>
            <span className="text-[11px] text-[var(--mut)]">{texto}</span>
          </div>
        ))}
      </div>
    </div>
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
  todoDesplegado,
  onDesplegarTodo,
  onReiniciar,
}: {
  campos: Campos;
  setCampos: (c: Campos) => void;
  apellidos: ModoApellidos;
  setApellidos: (a: ModoApellidos) => void;
  ocultar: boolean;
  setOcultar: (v: boolean) => void;
  abierto: boolean;
  setAbierto: (v: boolean) => void;
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
        activo ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--soft)] text-[var(--ink)]"
      }`}
    >
      {texto}
      <span className={`h-2 w-2 rounded-full ${activo ? "bg-[var(--acc)]" : "bg-[var(--line)]"}`} />
    </button>
  );

  /** Una fila de opciones excluyentes, para lo que no es un sí o un no. */
  const eleccion = <T,>(titulo: string, opciones: readonly T[], actual: T, alElegir: (v: T) => void, nombrar: (v: T) => string) => (
    <div className="flex items-center gap-1 rounded-lg bg-[var(--soft)] px-3 py-1.5">
      <span className="flex-1 text-[13px] text-[var(--ink)]">{titulo}</span>
      {opciones.map((opcion) => (
        <button
          key={String(opcion)}
          type="button"
          onClick={() => alElegir(opcion)}
          className={`h-6 rounded-md px-2 text-[12px] ${
            actual === opcion ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--mut)]"
          }`}
        >
          {nombrar(opcion)}
        </button>
      ))}
    </div>
  );

  const boton = (texto: string, alPulsar: () => void) => (
    <button
      key={texto}
      type="button"
      onClick={alPulsar}
      style={{ boxShadow: "var(--sh)" }}
      className="h-11 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 text-[13px] font-medium text-[var(--ink)]"
    >
      {texto}
    </button>
  );

  return (
    <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
      {abierto && (
        <div
          style={{ boxShadow: "var(--sh)" }}
          className="flex w-72 flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3"
        >
          <div className="flex flex-col gap-1">
            <p className="px-1 font-[family-name:var(--mono)] text-[9.5px] font-medium tracking-[0.12em] text-[var(--mut)] uppercase">
              En cada nodo
            </p>
            {/* «Nuevos» solo los enseña quien los estrena en su línea; 1 y 2, todo el mundo. */}
            {eleccion("Apellidos", ["nuevos", 0, 1, 2] as const, apellidos, setApellidos, String)}
            {/* Los cuatro ocupan el mismo hueco detrás del nombre, así que son excluyentes.
                La fecha entera solo la tienen los del calendario de cumpleaños; para el
                resto, «completa» sigue enseñando el año a secas. */}
            {eleccion("Fechas", ["ocultar", "año", "edad", "completa"] as const, campos.fechas, (f: ModoFechas) => setCampos({ ...campos, fechas: f }), (f) => (f === "ocultar" ? "no" : f))}
            {/* Los interruptores se enuncian por lo que hacen al marcarlos, y de entrada
                están apagados: el árbol de partida es el de siempre. */}
            {interruptor(!campos.notas, "Ocultar notas", () => setCampos({ ...campos, notas: !campos.notas }))}
            {interruptor(!campos.dudoso, "No resaltar dudosos", () => setCampos({ ...campos, dudoso: !campos.dudoso }))}
          </div>
          <div className="flex flex-col gap-1">
            <p className="px-1 font-[family-name:var(--mono)] text-[9.5px] font-medium tracking-[0.12em] text-[var(--mut)] uppercase">
              Ramas
            </p>
            {interruptor(!ocultar, "Mostrar no conectadas", () => setOcultar(!ocultar))}
          </div>
          <Leyenda />
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {boton(todoDesplegado ? "Plegar todo" : "Desplegar todo", onDesplegarTodo)}
        {boton("Reiniciar", onReiniciar)}
        {boton(abierto ? "Cerrar" : "Ver", () => setAbierto(!abierto))}
      </div>
    </div>
  );
}
