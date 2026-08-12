"use client";

// El lienzo: un solo árbol en SVG con pan y zoom, reanclado al punto de vista.
// Toda la lógica (quién sale, en qué columna, a qué altura y con qué texto) vive en
// lib/arbol; aquí solo se pinta y se recogen los gestos. Los colores no se escriben aquí:
// salen de los tokens de `.arbol` en globals.css, que es lo que vira con el tema.

import { useEffect, useMemo, useRef, useState } from "react";
import { acortar, buscar, losSinNombre, porCercania } from "@/lib/arbol/busqueda";
import { acotar, brujulaDe, conZoom, type Encuadre, type Rumbo, type Vista } from "@/lib/arbol/camara";
import { caminoEntre } from "@/lib/arbol/camino";
import { FECHAS_POR_DEFECTO, type ModoFechas } from "@/lib/arbol/fechas";
import { proximasCelebraciones } from "@/lib/arbol/celebraciones";
import { construirGrafo, pasosDesde } from "@/lib/arbol/grafo";
import { fichaDe } from "@/lib/arbol/ficha";
import { identidadDe, LARGOS_FILA, LARGOS_LISTA, LARGOS_NODO, libretaDe, type Identidad, type Pinta } from "@/lib/arbol/identidad";
import { relacionesDesde } from "@/lib/arbol/parentesco";
import type { ModoApellidos } from "@/lib/arbol/personas";
import { calcularRamas } from "@/lib/arbol/ramas";
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
import Busqueda from "./Busqueda";
import Camino from "./Camino";
import Celebraciones, { AvisoCelebraciones } from "./Celebraciones";
import Ficha from "./Ficha";
import Hoja from "./Hoja";
import Recuento from "./Recuento";
import { useAtras } from "./useAtras";

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
  /** De dónde se vino: la ficha del centro de ahora es la que ofrece deshacer la mudanza. */
  const [anterior, setAnterior] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  // Aparte de las abiertas: de estas se ha pedido solo la pareja, no sus hijos.
  const [parejas, setParejas] = useState<Set<string>>(() => new Set());
  const [todoDesplegado, setTodoDesplegado] = useState(false);
  const [ocultarNoConectados, setOcultarNoConectados] = useState(true);
  const [fechas, setFechas] = useState<ModoFechas>(FECHAS_POR_DEFECTO);
  const [apellidos, setApellidos] = useState<ModoApellidos>("nuevos");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [consulta, setConsulta] = useState("");
  /** Las cuatro sin nombre no se pueden teclear: se piden por su salida del callejón. */
  const [sinNombre, setSinNombre] = useState(false);
  /** El cajón del índice que se está leyendo: «tus primos» son quince personas, no un número. */
  const [cajon, setCajon] = useState<{ termino: string; ids: string[] } | null>(null);
  /**
   * La hoja inferior, que es una sola: la ficha de alguien, el camino hasta él o lo que se
   * celebra. Dos a la vez se pisarían, y la de debajo no se leería ni se podría cerrar.
   */
  const [hoja, setHoja] = useState<{ tipo: "ficha" | "camino"; id: string } | { tipo: "celebraciones" } | null>(null);
  /** Lo que se resalta del lienzo: el numerador de la fracción señalada, o nada. */
  const [resaltados, setResaltados] = useState<Set<string> | null>(null);
  const [vista, setVista] = useState<Vista>(CENTRADA);
  const [tamano, setTamano] = useState({ w: 0, h: 0 });

  const contenedor = useRef<HTMLDivElement>(null);
  /** El lienzo, aparte del contenedor: los gestos son suyos y no de lo que flota encima. */
  const lienzo = useRef<SVGSVGElement>(null);

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
  const relaciones = useMemo(() => relacionesDesde(grafo, puntoDeVista), [grafo, puntoDeVista]);
  const camino = useMemo(
    () => (hoja?.tipo === "camino" ? caminoEntre(grafo, puntoDeVista, hoja.id) : null),
    [grafo, puntoDeVista, hoja],
  );
  // Las ramas no dependen de quién mire: se derivan del grafo y valen para todo el árbol.
  const pertenencias = useMemo(() => calcularRamas(grafo), [grafo]);
  /** El bloque de identidad de cualquiera, para las superficies que lo piden fila a fila. */
  const escribir = useMemo(
    () => (id: string, largoContexto: number) =>
      identidadDe(grafo, id, {
        linaje: libreta.linaje,
        fechas,
        apellidos,
        hoy,
        largos: { titulo: LARGOS_FILA.titulo, contexto: largoContexto },
        homonimia: libreta.homonimias.get(id),
      }),
    [grafo, libreta, fechas, apellidos, hoy],
  );
  /**
   * Y el de una fila de lista, que **lleva siempre los dos apellidos**: «nuevos» vale en el
   * lienzo, donde los demás se leen subiendo por el árbol, pero en una lista no hay árbol del
   * que subir y trece filas «Pablo» son trece filas iguales.
   */
  const enLista = useMemo(
    () => (id: string, largoContexto: number) =>
      identidadDe(grafo, id, {
        linaje: libreta.linaje,
        fechas,
        apellidos: 2,
        hoy,
        largos: { titulo: LARGOS_LISTA.titulo, contexto: largoContexto },
        homonimia: libreta.homonimias.get(id),
      }),
    [grafo, libreta, fechas, hoy],
  );
  // La búsqueda mira el árbol entero, con filtro o sin él: es por donde se llega a quien el
  // lienzo no está pintando, y decirle «nadie se llama así» de alguien que solo estaba
  // escondido sería mentir.
  const opcionesBusqueda = useMemo(
    () => ({ linaje: libreta.linaje, pasos: pasosDesde(grafo, puntoDeVista) }),
    [grafo, libreta, puntoDeVista],
  );
  const resultados = useMemo(() => {
    if (consulta.trim() !== "") return buscar(grafo, consulta, opcionesBusqueda);
    return sinNombre ? losSinNombre(grafo, opcionesBusqueda) : [];
  }, [grafo, consulta, sinNombre, opcionesBusqueda]);
  const sugerencia = useMemo(
    () => (consulta.trim() !== "" && resultados.length === 0 ? acortar(grafo, consulta, opcionesBusqueda) : null),
    [grafo, consulta, resultados, opcionesBusqueda],
  );
  /** Cómo se llama alguien en una línea, con lo que el bloque de identidad ponga arriba. */
  const nombreDe = (id: string) =>
    enLista(id, 0)
      .titulo.map((t) => t.texto)
      .join("");
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

  /**
   * Tocar a alguien abre su ficha y nada más, en cualquier superficie. El centro solo se
   * muda desde el botón de dentro, que es una decisión y no el efecto de haber tocado.
   */
  function abrirFicha(id: string) {
    setHoja({ tipo: "ficha", id });
  }

  // Lo que el gesto de volver cierra: la capa de más arriba y solo esa, en el orden en que
  // se ven —lo que tapa antes que lo que flota debajo—.
  const capas =
    (busquedaAbierta ? 1 : 0) + (cajon ? 1 : 0) + (panelAbierto ? 1 : 0) + (hoja ? 1 : 0) + (hoja?.tipo === "camino" ? 1 : 0);
  useAtras(capas, () => {
    if (hoja?.tipo === "camino") setHoja({ tipo: "ficha", id: hoja.id });
    else if (hoja) setHoja(null);
    else if (panelAbierto) setPanelAbierto(false);
    else if (cajon) setCajon(null);
    else if (busquedaAbierta) setBusquedaAbierta(false);
  });

  /**
   * Teclear manda sobre las cuatro sin nombre —son una lista aparte, no un resultado— y abre
   * el panel: escribir es pedir la lista, y con el panel recogido no se vería.
   */
  function teclear(texto: string) {
    setConsulta(texto);
    setSinNombre(false);
    setCajon(null);
    setBusquedaAbierta(true);
  }

  /** A las cuatro sin nombre no se llega tecleando, así que se piden y se enseñan aparte. */
  function mostrarSinNombre() {
    setConsulta("");
    setSinNombre(true);
    setCajon(null);
    setBusquedaAbierta(true);
  }

  /** Pulsar un parentesco lista a los suyos, ordenados como cualquier lista: lo cerca antes. */
  function abrirCajon({ termino, todos }: Fraccion) {
    setCajon({ termino, ids: [...todos].sort(porCercania(grafo, opcionesBusqueda.pasos)) });
  }

  function centrarEn(id: string) {
    if (id === puntoDeVista) return;
    setAnterior(puntoDeVista);
    setPuntoDeVista(id);
    setHoja(null);
    // La cámara no se mueve: quien has tocado se queda donde estaba en pantalla, aunque
    // el árbol entero se recoloque a su alrededor.
    const saliente = layout.nodos.find((n) => n.esPuntoDeVista);
    const entrante = layout.nodos.find((n) => n.id === id);
    if (saliente && entrante) {
      setVista((v) => ({ ...v, dx: v.dx + saliente.x - entrante.x, dy: v.dy + saliente.y - entrante.y }));
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
  function pulsarFraccion({ puestos, todos, uniones }: Fraccion) {
    setResaltados(null); // lo que acaba de llegar se ve, no se atenúa
    // Pedir una rama es una acción sobre el lienzo, y el lienzo hay que verlo: el índice se
    // recoge, y lo teclado se queda para volver a él de un toque.
    setBusquedaAbierta(false);
    if (uniones.length === 0) return;
    if (puestos.length === todos.length) cerrarRamas(uniones);
    else abrirRamas(uniones);
  }

  /** El «+» trae a la pareja y nada más: los hijos siguen detrás de su propio contador. */
  function mostrarPareja(unionId: string) {
    setParejas((previas) => new Set(previas).add(unionId));
  }

  function reiniciar() {
    setPuntoDeVista(inicial);
    setAnterior(null);
    setHoja(null);
    setAbiertas(new Set());
    setParejas(new Set());
    setTodoDesplegado(false);
    setOcultarNoConectados(true);
    setFechas(FECHAS_POR_DEFECTO);
    setApellidos("nuevos");
    setVista(CENTRADA);
    setBusquedaAbierta(false);
    setConsulta("");
    setSinNombre(false);
    setCajon(null);
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

  // La rueda con preventDefault necesita un listener no pasivo. **Va en el lienzo y no en el
  // contenedor**: desde el contenedor se tragaba también las ruedas de lo que flota encima, y
  // ni el índice ni la hoja podían bajar. Por lo mismo, el `touch-none` es del lienzo.
  useEffect(() => {
    const nodo = lienzo.current;
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

  // Con la hoja hecha columna, lo que flota a la derecha se corre para no quedar debajo.
  const apartado = hoja ? "md:right-[392px]" : "";
  const brujula = brujulaDe(vista, tamano.w, tamano.h);
  const transformacion = `translate(${tamano.w / 2} ${tamano.h / 2}) scale(${vista.escala}) translate(${-centro.x} ${-centro.y})`;
  const niveles = useMemo(() => [...new Set(layout.nodos.map((n) => n.nivel))].sort((a, b) => a - b), [layout]);
  const generacionPov = grafo.generacion.get(puntoDeVista) ?? 0;
  const { minY, maxY } = layout.limites;
  /** Con una fracción señalada, todo lo que no es suyo se va al fondo. Sin ella, nada cambia. */
  const opacidadDe = (id?: string) => (!resaltados || (id && resaltados.has(id)) ? undefined : ATENUADO);

  return (
    <div ref={contenedor} className="relative h-full w-full overflow-hidden bg-[var(--paper)]">
      <svg
        ref={lienzo}
        width={tamano.w}
        height={tamano.h}
        // Bajo la hoja el árbol sigue viéndose: tapa, no sustituye. Con sitio ni eso —la
        // hoja se ha apartado a su columna y el lienzo se queda entero.
        className={`block touch-none cursor-grab select-none active:cursor-grabbing ${hoja ? "opacity-30 md:opacity-100" : ""}`}
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
                {v.pareja && <TrazoDePareja x={v.x} extremos={entreBordes(v.pareja)} tipo={v.tipo} roto={v.roto} />}
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
                fechas,
                apellidos,
                hoy,
                largos: LARGOS_NODO,
                homonimia: libreta.homonimias.get(n.id),
              })}
              cumpleHoy={cumplenHoy.has(n.id)}
              atenuado={opacidadDe(n.id) !== undefined}
              abierta={hoja?.tipo === "ficha" && hoja.id === n.id}
              onElegir={() => arrastre.current <= ARRASTRE_MINIMO && abrirFicha(n.id)}
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

      <Busqueda
        consulta={consulta}
        onTeclear={teclear}
        abierta={busquedaAbierta}
        setAbierta={setBusquedaAbierta}
        oculta={hoja !== null}
        resultados={resultados}
        sugerencia={sugerencia}
        onSinNombre={mostrarSinNombre}
        identidad={enLista}
        relaciones={relaciones}
        puntoDeVista={puntoDeVista}
        onPersona={abrirFicha}
        cajon={cajon}
        onVolverAlIndice={() => setCajon(null)}
        indice={
          <Recuento
            cuentas={cuentas}
            centro={nombreDe(puntoDeVista)}
            onAbrir={abrirCajon}
            onPulsar={pulsarFraccion}
            onResaltar={(ids) => setResaltados(ids ? new Set(ids) : null)}
          />
        }
      />

      <AvisoCelebraciones lista={celebraciones} onAbrir={() => setHoja({ tipo: "celebraciones" })} apartado={apartado} />

      <Controles
        fechas={fechas}
        setFechas={setFechas}
        apellidos={apellidos}
        setApellidos={setApellidos}
        ocultar={ocultarNoConectados}
        setOcultar={setOcultarNoConectados}
        abierto={panelAbierto}
        setAbierto={setPanelAbierto}
        apartado={apartado}
        todoDesplegado={todoDesplegado}
        onDesplegarTodo={() => {
          setTodoDesplegado(!todoDesplegado);
          setAbiertas(new Set());
          setParejas(new Set());
        }}
        onReiniciar={reiniciar}
      />

      {hoja && (
        <Hoja onCerrar={() => setHoja(null)}>
          {hoja.tipo === "celebraciones" ? (
            <Celebraciones lista={celebraciones} identidad={escribir} onPersona={abrirFicha} />
          ) : hoja.tipo === "camino" && camino ? (
            <Camino
              datos={camino}
              relacion={relaciones.get(hoja.id)!}
              identidad={enLista}
              onPersona={abrirFicha}
              onVolver={() => abrirFicha(hoja.id)}
            />
          ) : (
            <Ficha
              datos={fichaDe(grafo, hoja.id, {
                puntoDeVista,
                linaje: libreta.linaje,
                fechas,
                hoy,
                relacion: relaciones.get(hoja.id)!,
                pertenencia: pertenencias.get(hoja.id),
                homonimia: libreta.homonimias.get(hoja.id),
              })}
              anterior={anterior ? { id: anterior, nombre: personaPorId.get(anterior)?.nombre ?? "" } : undefined}
              onCentrar={() => centrarEn(hoja.id)}
              onCamino={() => setHoja({ tipo: "camino", id: hoja.id })}
              onHomonimos={(consulta) => {
                setHoja(null); // la lista y la ficha no caben a la vez en un móvil
                if (consulta === null) mostrarSinNombre();
                else teclear(consulta);
              }}
              onIndice={() => {
                setHoja(null);
                setConsulta("");
                setSinNombre(false);
                setBusquedaAbierta(true);
              }}
              onDevolver={() => anterior && centrarEn(anterior)}
            />
          )}
        </Hoja>
      )}
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
 * El nodo es el bloque de identidad y nada más: quién es arriba y de quién es debajo. Su
 * sitio en el árbol lo dice la posición, y el resto se reparte entre el fondo y el borde:
 * **el fondo mide la cercanía** —cuatro pisadas del acento, del papel al punto de vista— y
 * **el borde dice dónde miras** —el trazo grueso, la línea directa; el acento, tú y la
 * ficha que tengas abierta—. Dos preguntas, dos canales, y ninguna pisando a la otra.
 */
function Nodo({
  nodo,
  identidad,
  cumpleHoy,
  atenuado,
  abierta,
  onElegir,
}: {
  nodo: NodoLayout;
  identidad: Identidad;
  cumpleHoy: boolean;
  atenuado: boolean;
  /** Es la ficha que está abierta: el borde de acento dice desde el lienzo a quién lees. */
  abierta: boolean;
  onElegir: () => void;
}) {
  const izquierda = nodo.x - ANCHO_NODO / 2 + SANGRADO;
  return (
    <g
      onClick={onElegir}
      // El contraste dice a cuántas generaciones del punto de vista está, y lo dice por
      // clase para que el tema oscuro pueda comprimir la escala sin que React lo sepa. A
      // quien se está leyendo se le devuelve entero: la distancia ya no es lo que cuenta.
      className={`cursor-pointer g${abierta ? 0 : Math.min(Math.abs(nodo.nivel), 4)}`}
      style={atenuado ? { opacity: ATENUADO } : undefined}
    >
      {/* El cerco es la tercera marca y no le quita el canal a ninguna de las dos: el fondo
          sigue midiendo la cercanía y el borde, dónde miras. */}
      {abierta && (
        <rect
          x={nodo.x - ANCHO_NODO / 2 - 4}
          y={nodo.y - ALTO_NODO / 2 - 4}
          width={ANCHO_NODO + 8}
          height={ALTO_NODO + 8}
          rx={13}
          // El único hueco va por atributo, que no es un color y no necesita resolver
          // var(): un rect sin regla de relleno se pinta negro macizo, y una hoja de
          // estilos rancia —o la que un deploy se deje por el camino— taparía al nodo
          // justo cuando se le señala.
          fill="none"
          className="nd-cerco"
        />
      )}
      <rect
        x={nodo.x - ANCHO_NODO / 2}
        y={nodo.y - ALTO_NODO / 2}
        width={ANCHO_NODO}
        height={ALTO_NODO}
        rx={9}
        // Fondo y borde por separado: el fondo dice cuánto es tuyo y el borde, dónde miras.
        className={`${
          nodo.esPuntoDeVista ? "nd-pov" : nodo.lineaDirecta ? "nd-dir" : nodo.consanguineo ? "nd-con" : "nd"
        } ${nodo.esPuntoDeVista || abierta ? "bd-acc" : nodo.lineaDirecta ? "bd-dir" : "bd"}`}
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

/**
 * El layout da los centros de los dos y el trazo se queda en el hueco que hay entre ellos:
 * los nodos llevan la opacidad de su generación, así que lo que cruzara por debajo se leería
 * a través del recuadro como si lo atravesara.
 */
const entreBordes = ([a, b]: [number, number]): [number, number] =>
  a < b ? [a + ALTO_NODO / 2, b - ALTO_NODO / 2] : [a - ALTO_NODO / 2, b + ALTO_NODO / 2];

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
  fechas,
  setFechas,
  apellidos,
  setApellidos,
  ocultar,
  setOcultar,
  abierto,
  setAbierto,
  apartado,
  todoDesplegado,
  onDesplegarTodo,
  onReiniciar,
}: {
  fechas: ModoFechas;
  setFechas: (f: ModoFechas) => void;
  apellidos: ModoApellidos;
  setApellidos: (a: ModoApellidos) => void;
  ocultar: boolean;
  setOcultar: (v: boolean) => void;
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  /** Lo que se corre a la izquierda cuando la hoja ocupa su columna de la derecha. */
  apartado: string;
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
    <div className={`absolute right-3 bottom-3 flex flex-col items-end gap-2 ${apartado}`}>
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
            {eleccion("Fechas", ["ocultar", "año", "edad", "completa"] as const, fechas, setFechas, (f) => (f === "ocultar" ? "no" : f))}
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
