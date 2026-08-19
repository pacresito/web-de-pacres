"use client";

// El lienzo: un solo árbol en SVG con pan y zoom, reanclado al punto de vista.
// Toda la lógica (quién sale, en qué columna, a qué altura y con qué texto) vive en
// lib/arbol; aquí solo se pinta y se recogen los gestos. Los colores no se escriben aquí:
// salen de los tokens de `.arbol` en globals.css, que es lo que vira con el tema.

import { useEffect, useMemo, useRef, useState } from "react";
import { calcularBloques, type Bloque } from "@/lib/arbol/bloques";
import { acortar, buscar, losSinNombre, porCercania } from "@/lib/arbol/busqueda";
import {
  acotar,
  alCambiarDeUnidad,
  brujulaDe,
  conZoom,
  reglaDe,
  ZOOM_DE,
  ZOOM_TITULO_BLOQUE,
  type Encuadre,
  type Parada,
  type Vista,
} from "@/lib/arbol/camara";
import { caminoEntre, trazosDelCamino } from "@/lib/arbol/camino";
import { centroRecordado, recordarCentro } from "@/lib/arbol/enlaces";
import { conDuda, escribirVida, FECHAS_POR_DEFECTO, type ModoFechas } from "@/lib/arbol/fechas";
import { proximasCelebraciones } from "@/lib/arbol/celebraciones";
import { construirGrafo, pasosDesde, visibles } from "@/lib/arbol/grafo";
import { fichaDe } from "@/lib/arbol/ficha";
import { huecosDe, losIncompletos } from "@/lib/arbol/incompletos";
import {
  identidadDe,
  LARGOS_FILA,
  LARGOS_LISTA,
  LARGOS_NODO,
  libretaDe,
  type OpcionesIdentidad,
} from "@/lib/arbol/identidad";
import { relacionesDesde } from "@/lib/arbol/parentesco";
import { APELLIDOS_POR_DEFECTO, type ModoApellidos } from "@/lib/arbol/personas";
import { calcularRamas, ramaVisible, repartoDeRamas } from "@/lib/arbol/ramas";
import {
  ALTO_NODO,
  ANCHO_COLUMNA,
  ANCHO_NODO,
  calcularLayout,
} from "@/lib/arbol/layout";
import { calcularRecuento, unionesHasta, type Fraccion } from "@/lib/arbol/recuento";
import { alturaDe, bajada, entreBordes, hastaElAncla } from "@/lib/arbol/trazos";
import type { ArbolData } from "@/lib/arbol/tree";
import AvisoDeMudanza from "./AvisoDeMudanza";
import BarraDeAbajo from "./BarraDeAbajo";
import Bloques from "./Bloques";
import Brujula from "./Brujula";
import Busqueda from "./Busqueda";
import Capas from "./Capas";
import Camino from "./Camino";
import Celebraciones, { AvisoCelebraciones } from "./Celebraciones";
import Esqueleto from "./Esqueleto";
import Ficha from "./Ficha";
import Hoja from "./Hoja";
import Nodo, { ATENUADO } from "./Nodo";
import { ContadorRama, GUION, Manija, MasPareja, TrazoDePareja } from "./Piezas";
import Ramas from "./Ramas";
import Recuento from "./Recuento";
import Redondo, { IconoFiltros } from "./Redondo";
import Regla from "./Regla";
import Riel from "./Riel";
import { useAtras } from "./useAtras";

/** Sin enlace ni memoria: quien nunca ha visto el árbol entra por su dueño. */
const POR_DEFECTO = "p25";
const ARRASTRE_MINIMO = 8; // px: por debajo de esto el gesto es un toque, no un arrastre
const CENTRADA: Vista = { dx: 0, dy: 0, escala: 0.85 };

/**
 * La hoja inferior, que es una sola: la ficha de alguien, el camino hasta él, lo que se
 * celebra o qué se ve. Dos a la vez se pisarían, y la de debajo no se leería ni se podría
 * cerrar.
 */
type Hoja =
  /** Recogida es la hoja apartada para mirar el lienzo: sigue abierta, y en su barra de abajo. */
  | { tipo: "ficha"; id: string; recogida?: boolean }
  | { tipo: "camino"; id: string; recogida?: boolean }
  | { tipo: "celebraciones" }
  | { tipo: "capas" }
  | null;

/**
 * El giro de mudar el punto de vista. El recolocado en sí es instantáneo —medido: 1 ms de
 * cálculo y menos de 110 ms hasta el último nodo puesto, con los 342 desplegados y en
 * desarrollo—, así que estos 420 ms no cubren ningún coste: **explican**. Lo que hay que
 * entender es que el mundo ha girado alrededor de otra persona, no que la app se ha roto, y
 * eso se cuenta apagando los colaterales y dejando encendida la línea directa, que es lo
 * único que el ojo puede seguir mientras todo lo demás cambia de sitio.
 */
const GIRO_APAGADO = 180; // ms con los colaterales al 25 %
const GIRO = 420; // ms de la transición entera; los 240 de la subida los pone la CSS
const AVISO = 8000; // ms que el aviso aguanta antes de irse solo

/** El `md` de Tailwind, en píxeles: por debajo la hoja tapa el lienzo en vez de apartarse. */
const DOS_COLUMNAS = 768;
/** Lo que le cabe al nombre en la barra de abajo, medido sobre el móvil más estrecho. */
const LARGO_BARRA = 34;

export default function Arbol({
  data,
  hoy,
  centroDelEnlace,
  conVistas,
}: {
  data: ArbolData;
  hoy: string;
  centroDelEnlace: string | null;
  /** Si sale el riel de unidades. Sin él el árbol se queda en personas, que es su parada. */
  conVistas: boolean;
}) {
  const grafo = useMemo(() => construirGrafo(data), [data]);
  const personaPorId = grafo.personaPorId;

  const esDelArbol = (id: string | null | undefined): id is string => !!id && personaPorId.has(id);
  const delEnlace = esDelArbol(centroDelEnlace) ? centroDelEnlace : null;
  /**
   * El punto de vista de entrada: manda el enlace, y a falta de él lo que recuerde el dispositivo
   * del último que se abrió aquí. Es al que devuelve reiniciar, así que **no se muda al mudar el
   * Centro**: se entra desde donde te mandaron y se vuelve ahí, se haya paseado por donde se haya
   * paseado. Lo recordado no puede leerse en el render —el servidor no lo conoce— y llega en el
   * efecto de abajo, un frame después de un lienzo que todavía está midiéndose.
   */
  const [inicial, setInicial] = useState(
    delEnlace ?? (esDelArbol(POR_DEFECTO) ? POR_DEFECTO : (data.people[0]?.id ?? POR_DEFECTO)),
  );
  const [puntoDeVista, setPuntoDeVista] = useState(inicial);
  /** De dónde se vino: el aviso que sale al mudar el Centro es el que ofrece deshacerlo. */
  const [anterior, setAnterior] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  // Aparte de las abiertas: de estas se ha pedido solo la pareja, no sus hijos.
  const [parejas, setParejas] = useState<Set<string>>(() => new Set());
  const [todoDesplegado, setTodoDesplegado] = useState(false);
  const [ocultarNoConectados, setOcultarNoConectados] = useState(true);
  const [fechas, setFechas] = useState<ModoFechas>(FECHAS_POR_DEFECTO);
  const [apellidos, setApellidos] = useState<ModoApellidos>(APELLIDOS_POR_DEFECTO);
  /**
   * El repaso: cada nodo enseña lo que le falta y se apaga quien ya está entero. Manda sobre
   * los dos interruptores de arriba —enseñarlo todo es de lo que va— y por eso los fija en vez
   * de leerlos: con «fechas: no» puesto no habría hueco que enseñar.
   */
  const [repaso, setRepaso] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [consulta, setConsulta] = useState("");
  /** Las cuatro sin nombre no se pueden teclear: se piden por su salida del callejón. */
  const [sinNombre, setSinNombre] = useState(false);
  /** El cajón del índice que se está leyendo: «tus primos» son quince personas, no un número. */
  const [cajon, setCajon] = useState<{ termino: string; ids: string[] } | null>(null);
  const [hoja, setHoja] = useState<Hoja>(null);
  /** El vistazo de pasar por encima de una fracción: dura lo que dure el puntero encima. */
  const [resaltados, setResaltados] = useState<Set<string> | null>(null);
  /**
   * Y lo que queda señalado al pulsarla, que no se va solo. Traer a quince primos segundos
   * y soltarlos entre trescientas personas es no haberlos traído: en un móvil no hay
   * puntero que pasar por encima, y en cualquiera de los dos el vistazo se acaba antes de
   * llegar a mirar el lienzo. Se apaga desde su barra, o al mudar el Centro.
   */
  const [marcados, setMarcados] = useState<{ termino: string; ids: Set<string> } | null>(null);
  const [vista, setVista] = useState<Vista>(CENTRADA);
  /**
   * Con qué unidad se dibuja. Es estado y no una lectura de la escala: el zoom semántico
   * cambiaba de unidad al pellizcar y con ello se llevaba por delante el árbol abierto en
   * pequeño, que es una vista que se quiere —la forma de lo desplegado, sin nombres—.
   */
  const [parada, setParada] = useState<Parada>("personas");
  const [tamano, setTamano] = useState({ w: 0, h: 0 });
  /** A quién hay que traer a pantalla en cuanto el layout lo coloque. */
  const [aEnfocar, setAEnfocar] = useState<string | null>(null);
  /** Mientras dura el apagado del giro: los colaterales al 25 %, la línea directa encendida. */
  const [girando, setGirando] = useState(false);
  /** Cuántas mudanzas van. Cambiarlo es lo que rearranca los relojes del giro y del aviso. */
  const [mudanza, setMudanza] = useState(0);
  const [aviso, setAviso] = useState(false);

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
  /** A quién le queda algo por preguntar: lo enciende el repaso y lo cuenta «Qué se ve». */
  const conHuecos = useMemo(() => losIncompletos(grafo, libreta.linaje), [grafo, libreta]);
  // Un solo apellido: el repaso ya avisa del que falta, y con dos el nodo se llenaba de
  // apellidos deducidos justo cuando lo que hay que leer es lo que no consta.
  const comoSePinta = {
    apellidos: repaso ? (1 as const) : apellidos,
    fechas: repaso ? ("completa" as const) : fechas,
  };
  const huecosDelNodo = (id: string) =>
    repaso ? huecosDe(personaPorId.get(id)!, libreta.linaje.get(id)!) : null;

  const layout = useMemo(
    () => calcularLayout(grafo, { puntoDeVista, expandidas, parejas, ocultarNoConectados }),
    [grafo, puntoDeVista, expandidas, parejas, ocultarNoConectados],
  );
  // El mapa de bloques no depende de lo desplegado: la escala media enseña la familia
  // entera, que es a lo que se aleja quien se aleja.
  const mapa = useMemo(
    () => calcularBloques(grafo, { puntoDeVista, ocultarNoConectados }),
    [grafo, puntoDeVista, ocultarNoConectados],
  );
  /** Quién está puesto en el lienzo ahora mismo: lo que no esté, hay que abrirlo para verlo. */
  const dibujado = useMemo(() => new Set(layout.nodos.map((n) => n.id)), [layout]);
  const cuentas = useMemo(
    () => calcularRecuento(grafo, { puntoDeVista, ocultarNoConectados }, dibujado),
    [grafo, puntoDeVista, ocultarNoConectados, dibujado],
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
  /** Por dónde va por el lienzo, que es lo único suyo que se queda delante. */
  const trazos = useMemo(() => (camino ? trazosDelCamino(camino) : null), [camino]);
  /** La hoja apartada para poder mirar el lienzo: ni tapa, ni desplaza, ni deja de contar. */
  const recogida = (hoja?.tipo === "ficha" || hoja?.tipo === "camino") && hoja.recogida === true;
  // Las ramas no dependen de quién mire: se derivan del grafo y valen para todo el árbol.
  const pertenencias = useMemo(() => calcularRamas(grafo), [grafo]);
  /** Cuánta familia deja fuera el filtro, que es lo que su interruptor tiene que decir. */
  const escondidos = useMemo(
    () => grafo.personaPorId.size - visibles(grafo, puntoDeVista).size,
    [grafo, puntoDeVista],
  );
  /**
   * El mapa de ramas obedece al mismo filtro que las otras dos escalas: enseñar ahí una
   * rama entera que el lienzo esconde sería contar dos familias distintas en la misma app.
   * La que se cae del mapa y por qué, en `ramaVisible`.
   */
  const reparto = useMemo(() => {
    const dentro = ocultarNoConectados ? visibles(grafo, puntoDeVista) : null;
    const suyas = dentro ? new Map([...pertenencias].filter(([id]) => dentro.has(id))) : pertenencias;
    return repartoDeRamas(suyas, puntoDeVista).filter((r) => ramaVisible(r, dentro));
  }, [grafo, pertenencias, puntoDeVista, ocultarNoConectados]);
  /**
   * Escribir a alguien. Lo que no cambia de una superficie a otra —el linaje y las
   * homonimias, que se calculan una vez por árbol, y el día del servidor— se pone aquí; lo
   * que sí, lo pide cada una. Cuatro copias de esta llamada eran cuatro sitios que tocar
   * cada vez que el bloque de identidad aprende algo nuevo.
   */
  const escribirlo = useMemo(
    () => (id: string, suyo: Pick<OpcionesIdentidad, "fechas" | "apellidos" | "largos" | "añosDeLosSuyos">) =>
      identidadDe(grafo, id, { linaje: libreta.linaje, hoy, homonimia: libreta.homonimias.get(id), ...suyo }),
    [grafo, libreta, hoy],
  );
  /**
   * El de una fila de «Lo que se celebra», la única superficie que nombra a los padres y al
   * cónyuge sin su año: aquí la fila ya viene con un día al lado y no hay que desempatar a
   * nadie, así que la línea se gasta entera en de quién es.
   */
  const paraCelebrar = (id: string) => escribirlo(id, { fechas, apellidos, largos: LARGOS_FILA, añosDeLosSuyos: false });
  /**
   * Y el de una fila de lista, que **lleva siempre los dos apellidos**: «nuevos» vale en el
   * lienzo, donde los demás se leen subiendo por el árbol, pero en una lista no hay árbol del
   * que subir y trece filas «Pablo» son trece filas iguales.
   */
  const enLista = (id: string, contexto: number) =>
    escribirlo(id, { fechas, apellidos: 2, largos: { ...LARGOS_LISTA, contexto } });
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
  /**
   * Sus años, como los escribe el lienzo: en la línea de abajo del nodo y no detrás del
   * nombre, así que van sin los paréntesis que los separaban de él. **El nombre se queda
   * arriba con los 32 caracteres enteros**, que es lo que se gana bajándolos.
   */
  const vidaDe = (id: string) => {
    const p = personaPorId.get(id)!;
    const vida = escribirVida(p, comoSePinta.fechas, hoy);
    return vida && p.incierto === "fechas" ? conDuda(vida) : vida;
  };
  /** Cómo se llama alguien en una línea, con lo que el bloque de identidad ponga arriba. */
  const nombreDe = (id: string) =>
    enLista(id, 0)
      .titulo.map((t) => t.texto)
      .join("");
  /**
   * Y cómo se llama en una barra de una sola línea, que se recorta con «…» y no crece. **Sin
   * la edad** —la barra cuenta pasos, no vidas— **y con los apellidos que quepan**: el
   * segundo cortado a la mitad no distingue a nadie de nadie, y se lleva por delante el
   * nombre, que es lo que se ha ido a leer.
   */
  const enUnaLinea = (id: string, largo: number) => {
    const escrito = (apellidos: ModoApellidos) =>
      escribirlo(id, { fechas: "ocultar", apellidos, largos: { titulo: largo, contexto: 0 } })
        .titulo.map((t) => t.texto)
        .join("");
    return ([2, 1] as const).map(escrito).find((texto) => !texto.endsWith("…")) ?? escrito(0);
  };
  /**
   * Nombre y primer apellido, sin años: como se nombra de lejos a quien no está en pantalla.
   * Los dos apellidos aprietan la línea donde esto se lee, y el primero ya dice de qué rama es,
   * que es lo que hace falta cuando a quien se nombra lo puso un enlace.
   */
  const conApellido = (id: string) =>
    escribirlo(id, { fechas: "ocultar", apellidos: 1, largos: { titulo: LARGO_BARRA, contexto: 0 } })
      .titulo.map((t) => t.texto)
      .join("");
  /** Quien cumple años hoy se lleva la guirnalda en su nodo, con los que cumple escritos. */
  const cumplenHoy = useMemo(
    () => new Map(celebraciones.filter((c) => c.tipo === "cumpleaños" && c.faltan === 0).map((c) => [c.id!, c.edad!])),
    [celebraciones],
  );

  /**
   * El arranque, que ocurre una vez: el enlace con el que se ha entrado se recuerda para la
   * próxima visita, y quien llega sin enlace entra por donde le mandaron la última vez. Mudar el
   * Centro después no vuelve a pasar por aquí — eso es mirar desde otro sitio, no entrar.
   */
  useEffect(() => {
    if (delEnlace) return recordarCentro(delEnlace);
    const recordado = centroRecordado();
    if (!esDelArbol(recordado)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount, como el tema: el servidor no puede saber lo que recuerda este navegador
    setInicial(recordado);
    setPuntoDeVista(recordado);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se entra una vez; lo que cambie después no es una entrada
  }, []);

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

  /**
   * La unidad manda sobre el sistema de coordenadas: bloques y personas se colocan cada uno
   * por su cuenta. La cámara se guarda relativa al punto de vista, así que cambiar de ancla
   * al cambiar de unidad lo deja donde estaba en pantalla y es el árbol el que se recompone
   * alrededor.
   */
  const anclaje =
    parada === "bloques"
      ? mapa.bloques.find((b) => b.esDelPuntoDeVista)
      : layout.nodos.find((n) => n.esPuntoDeVista);
  const ancla = { x: anclaje?.x ?? 0, y: anclaje?.y ?? 0 };
  const limites = parada === "bloques" ? mapa.limites : layout.limites;
  const centro = { x: ancla.x + vista.dx, y: ancla.y + vista.dy };

  // El encuadre se guarda en un ref porque lo consultan gestos que no se rehacen en cada
  // render (la rueda) y las funciones de actualización de setVista, que solo ven la vista.
  // Y se reacota al cambiar él: desplegar una rama o mudar el punto de vista mueven los
  // límites bajo una cámara que ya estaba puesta.
  const encuadre = useRef<Encuadre>({ ancla, limites, w: 0, h: 0 });
  useEffect(() => {
    encuadre.current = { ancla: { x: ancla.x, y: ancla.y }, limites, w: tamano.w, h: tamano.h };
    setVista((v) => acotar(v, encuadre.current));
  }, [ancla.x, ancla.y, limites, tamano.w, tamano.h]);

  /**
   * Traer una rama al lienzo y mirarla son dos pasos: cuando se pide, el layout todavía no
   * la ha colocado. Se apunta a quién enfocar y se centra en cuanto aparece colocado.
   */
  useEffect(() => {
    if (!aEnfocar) return;
    const destino = layout.nodos.find((n) => n.id === aEnfocar);
    if (!destino) return;
    setVista((v) => acotar({ ...v, dx: destino.x - ancla.x, dy: destino.y - ancla.y }, encuadre.current));
    setAEnfocar(null);
  }, [aEnfocar, layout, ancla.x, ancla.y]);

  /**
   * Los relojes del giro, colgados de la mudanza y no de `girando`: apagarlo a los 180 ms
   * volvería a entrar aquí y se llevaría por delante el aviso que aún no ha salido. El
   * encendido no está aquí —lo hace `centrarEn`, en el mismo commit que muda el ancla—:
   * desde un efecto llegaría un frame tarde y los colaterales darían un fogonazo.
   *
   * **Al entrar el aviso también sale**, y ahí no hay giro que apagar ni transición que esperar:
   * con los enlaces repartidos por ramas, el Centro casi nunca es quien mira, y esto es lo único
   * que lo dice. La segunda persona de toda la app cuelga de que se haya leído.
   */
  useEffect(() => {
    const entrada = mudanza === 0;
    const espera = entrada ? 0 : GIRO;
    const apagado = entrada ? undefined : setTimeout(() => setGirando(false), GIRO_APAGADO);
    const entra = setTimeout(() => setAviso(true), espera);
    const sale = setTimeout(() => setAviso(false), espera + AVISO);
    return () => [apagado, entra, sale].forEach((reloj) => reloj !== undefined && clearTimeout(reloj));
  }, [mudanza]);

  /** Los gestos mueven la cámara por aquí: moverla sin acotar es perderse. */
  function mover(paso: (v: Vista) => Vista) {
    setVista((v) => acotar(paso(v), encuadre.current));
  }

  /**
   * Abrir una hoja. **Donde no caben los dos se lleva por delante el índice**, en vez de
   * esconderlo: escondido y abierto volvía desplegado al cerrar la hoja, tapando el árbol
   * que se acababa de ir a mirar. Con sitio no se toca —ahí la hoja tiene su columna—, y la
   * hoja recogida tampoco, que esa se abre justo para mirar el lienzo.
   */
  function abrirHoja(cual: Hoja) {
    setHoja(cual);
    if (tamano.w > 0 && tamano.w < DOS_COLUMNAS) setBusquedaAbierta(false);
  }

  /** Y al revés, con la misma regla: donde no caben los dos, desplegar el índice cierra la hoja. */
  function abrirIndice() {
    setBusquedaAbierta(true);
    if (tamano.w > 0 && tamano.w < DOS_COLUMNAS && !recogida) setHoja(null);
  }

  /**
   * Tocar a alguien abre su ficha y nada más, en cualquier superficie. El centro solo se
   * muda desde el botón de dentro, que es una decisión y no el efecto de haber tocado.
   */
  function abrirFicha(id: string) {
    abrirHoja({ tipo: "ficha", id });
  }

  // Lo que el gesto de volver cierra: la capa de más arriba y solo esa, en el orden en que
  // se ven —lo que tapa antes que lo que flota debajo—.
  const apiladas =
    (busquedaAbierta ? 1 : 0) +
    (cajon ? 1 : 0) +
    (hoja ? 1 : 0) +
    (hoja?.tipo === "camino" ? 1 : 0) +
    (recogida ? 1 : 0) +
    (marcados ? 1 : 0);
  useAtras(apiladas, () => {
    if (recogida && (hoja?.tipo === "ficha" || hoja?.tipo === "camino")) setHoja({ ...hoja, recogida: false });
    else if (hoja?.tipo === "camino") setHoja({ tipo: "ficha", id: hoja.id });
    else if (hoja) setHoja(null);
    else if (cajon) setCajon(null);
    else if (busquedaAbierta) setBusquedaAbierta(false);
    else if (marcados) setMarcados(null);
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
    // Los señalados eran «tus primos segundos», y desde aquí ya no son tuyos ni segundos.
    setMarcados(null);
    // El giro se enciende aquí, con la mudanza y no después: los colaterales tienen que
    // nacer ya apagados en la primera pintura del árbol nuevo.
    setGirando(true);
    setAviso(false);
    setMudanza((n) => n + 1);
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
  function pulsarFraccion({ termino, puestos, todos, uniones }: Fraccion) {
    setResaltados(null); // el vistazo se acaba: manda lo que se acaba de pedir
    // Pedir una rama es una acción sobre el lienzo, y el lienzo hay que verlo: el índice se
    // recoge, y lo teclado se queda para volver a él de un toque.
    setBusquedaAbierta(false);
    // Y suelta el camino que estuviera recogido: señalar y seguir un camino son las dos
    // formas de mirar de cerca, y el lienzo solo sabe encender una.
    if (recogida) setHoja(null);
    const repliega = uniones.length > 0 && puestos.length === todos.length;
    if (repliega) cerrarRamas(uniones);
    else if (uniones.length > 0) abrirRamas(uniones);
    // Se señala a los del cajón entero y no a los que estaban puestos: los que vienen de
    // llegar son justo los que hay que encontrar. Replegar no señala nada, que lo que se
    // ha pedido es dejar de verlos.
    setMarcados(repliega ? null : { termino, ids: new Set(todos) });
  }

  /**
   * Tocar un bloque es pedir a esa familia: se abre lo que haga falta para traerla, se salta
   * a la escala de personas y se enfoca en ella. Es la única forma de cruzar el árbol de un
   * lado a otro sin arrastrar, y por eso el mapa de bloques existe.
   */
  function abrirBloque(bloque: Bloque) {
    const gente = [...bloque.hermanos, ...bloque.parejas];
    abrirRamas(unionesHasta(grafo, puntoDeVista, gente));
    // El salto que nadie ha pedido sí lleva a una altura cómoda: se ha tocado una familia
    // para verla, no para elegir un tamaño.
    setParada("personas");
    setVista((v) => ({ ...v, escala: ZOOM_DE.personas }));
    setAEnfocar(gente[0]);
  }

  /** Abrir lo justo para que esa gente esté puesta, y dejar el lienzo a la vista. */
  function traerAlLienzo(gente: string[]) {
    // A quien esconde el filtro no lo trae ninguna unión: hay que quitarlo, o se abrirían
    // ramas para llegar a alguien que sigue sin poder salir.
    const dentro = visibles(grafo, puntoDeVista);
    if (gente.some((p) => !dentro.has(p))) setOcultarNoConectados(false);
    abrirRamas(unionesHasta(grafo, puntoDeVista, gente));
    setParada("personas");
    // El panel de búsqueda se esconde —no se borra—: aquí sí es el caso de que no caben los
    // dos, que se ha pedido mirar el lienzo y él tapa media pantalla.
    setBusquedaAbierta(false);
  }

  /**
   * Ir a ver un camino al lienzo: se abre lo justo para que estén sus eslabones, se recoge la
   * hoja y se enfoca en él. Las dos cosas van juntas porque abrir lo que la hoja tapa no
   * enseña nada, y en un móvil la tapa entera.
   */
  function verCaminoEnElArbol(id: string, gente: string[]) {
    traerAlLienzo(gente);
    setMarcados(null); // el camino es lo que se va a mirar de cerca, y solo cabe uno
    setHoja({ tipo: "camino", id, recogida: true });
    setAEnfocar(id);
  }

  /**
   * Y traer al lienzo a una sola persona, que es como se sale de una ficha a la que se llegó
   * sin pasar por él. **La hoja se recoge, como la del camino**: se ha pedido mirar el árbol,
   * y una hoja que lo tapa —entera en un móvil— deja el gesto sin respuesta que se vea. Sigue
   * abierta, que es lo que le pone el cerco al nodo: sin él la persona aterriza en medio de un
   * lienzo lleno de nodos iguales. Nada más se apaga —el camino sí atenúa lo demás, pero eso
   * es una travesía y esto es un sitio—.
   */
  function verEnElArbol(id: string) {
    traerAlLienzo([id]);
    setHoja({ tipo: "ficha", id, recogida: true });
    setAEnfocar(id);
  }

  /** El «+» trae a la pareja y nada más: los hijos siguen detrás de su propio contador. */
  function mostrarPareja(unionId: string) {
    setParejas((previas) => new Set(previas).add(unionId));
  }

  /**
   * Devolver el árbol a como se entró. **`donde` decide si además se vuelve al punto de vista
   * de entrada**: desde «Qué se ve» sí —es volver al principio— y desde la ficha del Centro
   * no, que ahí lo que se pide es plegar lo que uno ha desplegado sin perder desde dónde lo
   * estaba mirando.
   */
  function reiniciar(donde: "entrada" | "aqui" = "entrada") {
    if (donde === "entrada") setPuntoDeVista(inicial);
    setAnterior(null);
    setHoja(null);
    setGirando(false);
    setAviso(false);
    setAbiertas(new Set());
    setParejas(new Set());
    setTodoDesplegado(false);
    setOcultarNoConectados(true);
    setFechas(FECHAS_POR_DEFECTO);
    setApellidos(APELLIDOS_POR_DEFECTO);
    setRepaso(false);
    setParada("personas");
    setVista(CENTRADA);
    setBusquedaAbierta(false);
    setConsulta("");
    setSinNombre(false);
    setCajon(null);
    setResaltados(null);
    setMarcados(null);
  }

  // Gestos: un puntero arrastra, dos pellizcan (vale igual para ratón y dedo)
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
  const apartado = hoja && !recogida ? "md:right-[392px]" : "";
  const brujula = brujulaDe(vista, tamano.w, tamano.h);
  const transformacion = `translate(${tamano.w / 2} ${tamano.h / 2}) scale(${vista.escala}) translate(${-centro.x} ${-centro.y})`;
  const dibujados = parada === "bloques" ? mapa.bloques : layout.nodos;
  const niveles = useMemo(() => [...new Set(dibujados.map((n) => n.nivel))].sort((a, b) => a - b), [dibujados]);
  const generacionPov = grafo.generacion.get(puntoDeVista) ?? 0;
  const { minY, maxY } = limites;
  /**
   * A quién se está mirando de cerca: los eslabones del camino abierto, la fracción por la
   * que se está pasando o la que se dejó señalada. El camino manda mientras dura, que es lo
   * que se ha ido a leer, y el vistazo manda sobre lo señalado: es el más reciente.
   */
  // El repaso va el último porque es el más flojo: si además se está mirando un camino o una
  // fracción, eso es lo que se ha ido a ver, y apagar dos cosas a la vez no apaga ninguna.
  const señalados = camino
    ? new Set(camino.eslabones.map((e) => e.id))
    : (resaltados ?? marcados?.ids ?? (repaso ? conHuecos : null));
  /** Con algo señalado, todo lo que no es suyo se va al fondo. Sin ello, nada cambia. */
  const opacidadDe = (id?: string) => (!señalados || (id && señalados.has(id)) ? undefined : ATENUADO);
  /**
   * Si el árbol se ha movido de como se entró. Es lo único que hace que reiniciar signifique
   * algo, y por eso decide si la ficha del Centro lo ofrece.
   */
  const tocado =
    puntoDeVista !== inicial ||
    abiertas.size > 0 ||
    parejas.size > 0 ||
    todoDesplegado ||
    !ocultarNoConectados ||
    repaso ||
    marcados !== null ||
    fechas !== FECHAS_POR_DEFECTO ||
    apellidos !== APELLIDOS_POR_DEFECTO;

  return (
    <div ref={contenedor} className="relative h-full w-full overflow-hidden bg-[var(--paper)]">
      <svg
        ref={lienzo}
        width={tamano.w}
        height={tamano.h}
        // Bajo la hoja el árbol sigue viéndose: tapa, no sustituye. Con sitio ni eso —la
        // hoja se ha apartado a su columna y el lienzo se queda entero.
        className={`block touch-none cursor-grab select-none active:cursor-grabbing ${girando ? "gira" : ""} ${
          hoja && !recogida ? "opacity-30 md:opacity-100" : ""
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Hasta medir el hueco no se pinta nada: el servidor no sabe ni el tamaño ni
            el punto de vista guardado, así que la hidratación cuadra con el lienzo vacío.
            Y en la parada de ramas tampoco: ahí el lienzo no es un árbol, es un mapa, y lo
            pinta su propia capa por encima. */}
        {tamano.w > 0 && parada !== "ramas" && (
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

          {parada === "bloques" ? (
            <Bloques
              bloques={mapa.bloques}
              conTitulo={vista.escala >= ZOOM_TITULO_BLOQUE}
              puntoDeVista={puntoDeVista}
              onElegir={(b) => arrastre.current <= ARRASTRE_MINIMO && abrirBloque(b)}
            />
          ) : (
          <>
          {/* El reparto arranca en la propia unión y muere en el borde de cada hijo: los
              tramos que cruzan un nodo quedan tapados por él, y lo que se ve toca a los dos. */}
          <g opacity={camino ? ATENUADO : opacidadDe()}>
            {layout.vinculos.map((v) => (
              <g key={v.unionId} className={v.directo ? "lk-dir" : "lk"}>
                {v.hijos.map((h, i) => (
                  <path key={i} d={bajada(v, h)} />
                ))}
                {v.pareja && <TrazoDePareja x={v.x} extremos={entreBordes(v.pareja)} tipo={v.tipo} roto={v.roto} />}
              </g>
            ))}
          </g>

          {/* El camino, encima de lo demás y **de una pieza**: dibujarlo con los trazos de
              cada unión le cambiaba el peso a media travesía según por dónde pasara, y una
              línea que engorda y adelgaza no se lee como una sola. */}
          {trazos && (
            <g className="lk-cam">
              {layout.vinculos.map((v) => (
                <g key={v.unionId}>
                  {v.hijos.map((h) => {
                    const desde = trazos.bajadas.get(`${v.unionId}:${h.id}`);
                    if (!desde) return null;
                    // Al hermano por el que se llega hay que buscarlo aquí: el camino sabe
                    // por dónde va, pero a qué altura queda cada uno lo dice el layout.
                    const hermano = desde === "entera" ? undefined : v.hijos.find((o) => o.id === desde.desdeElHermano);
                    return <path key={h.id} d={bajada(v, h, hermano && alturaDe(v, hermano))} />;
                  })}
                  {/* De la pareja, solo la mitad que llega a quien está en el camino: la otra
                      va a su pareja, y hasta ella no se pasa. Muere en el ancla, que es de
                      donde sale la bajada —o en el corazón, si fueron novios—. */}
                  {v.pareja &&
                    v.miembros?.map((m, i) => {
                      if (!trazos.uniones.get(v.unionId)?.has(m)) return null;
                      const borde = entreBordes(v.pareja!)[i];
                      return (
                        <line
                          key={m}
                          x1={v.x}
                          y1={borde}
                          x2={v.x}
                          y2={hastaElAncla(borde, v.y, v.tipo === "pareja")}
                          strokeDasharray={v.roto && v.tipo !== "pareja" ? GUION : undefined}
                        />
                      );
                    })}
                </g>
              ))}
            </g>
          )}

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
              identidad={escribirlo(n.id, {
                fechas: "ocultar",
                apellidos: comoSePinta.apellidos,
                largos: { titulo: LARGOS_NODO.titulo, contexto: 0 },
              })}
              vida={vidaDe(n.id)}
              huecos={huecosDelNodo(n.id)}
              cumple={cumplenHoy.get(n.id) ?? null}
              atenuado={opacidadDe(n.id) !== undefined}
              // El camino no deja de leer a quien lo abrió: el cerco sigue puesto mientras
              // se mira cómo se llega hasta él, que es lo que se ha ido a ver.
              abierta={hoja !== null && "id" in hoja && hoja.id === n.id}
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
          </>
          )}
        </g>
        )}
      </svg>

      {/* Sin medida no hay árbol, y la medida llega mucho después que el HTML: lo que ocupa
          ese hueco va debajo del cromo, que sí viene servido. */}
      {tamano.w === 0 && <Esqueleto escala={CENTRADA.escala} />}

      {/* En la escala de ramas no se pinta: ahí no hay personas colocadas por generación,
          y una regla que rotulase el mapa estaría midiendo otra cosa. */}
      {tamano.w > 0 && parada !== "ramas" && <Regla marcas={reglaDe(niveles, centro.x, vista.escala, tamano.w)} />}

      {parada === "ramas" && (
        <Ramas
          reparto={reparto}
          onRama={(rama) => {
            setCajon({ termino: `rama de ${rama.nombre}`, ids: [...rama.gente].sort(porCercania(grafo, opcionesBusqueda.pasos)) });
            setBusquedaAbierta(true);
          }}
        />
      )}

      {/* El riel: con qué unidad se dibuja, y **no toca la cámara** —el tamaño es del
          pellizco—. Va en el borde derecho y a media altura, que es donde no le quita el
          sitio ni al aviso de arriba ni a los botones de abajo. Solo con `?vistas`: las
          otras dos escalas se enseñan, y el árbol al que se entra es el de personas. */}
      {conVistas && (
        <Riel
          parada={parada}
          onIr={(p) => {
            setParada(p);
            mover((v) => alCambiarDeUnidad(v, p));
          }}
          apartado={apartado}
        />
      )}

      {brujula && parada === "personas" && (
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
        onAbrir={abrirIndice}
        onCerrar={() => setBusquedaAbierta(false)}
        resultados={resultados}
        sugerencia={sugerencia}
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

      <AvisoCelebraciones
        lista={celebraciones}
        onAbrir={() => abrirHoja({ tipo: "celebraciones" })}
        apartado={apartado}
        oculto={busquedaAbierta}
      />

      <Redondo
        etiqueta="Qué se ve"
        onPulsar={() => abrirHoja({ tipo: "capas" })}
        className={`absolute right-3 bottom-3 ${apartado}`}
      >
        <IconoFiltros />
      </Redondo>

      {/* La esquina de abajo a la izquierda es de lo que va y viene. El chip del Centro la
          ocupaba siempre para decir un nombre que ya dicen su nodo, en acento, y la brújula
          cuando el nodo se ha ido de pantalla. */}
      {recogida && (hoja?.tipo === "ficha" || hoja?.tipo === "camino") ? (
        <BarraDeAbajo
          rotulo={
            hoja.tipo === "camino" && camino
              ? `el camino · ${camino.pasos} ${camino.pasos === 1 ? "paso" : "pasos"}`
              : "en el árbol"
          }
          titulo={enUnaLinea(hoja.id, LARGO_BARRA)}
          onAbrir={() => abrirHoja({ ...hoja, recogida: false })}
          onCerrar={() => setHoja(null)}
          cerrar={hoja.tipo === "camino" ? "Cerrar el camino" : "Cerrar la ficha"}
        />
      ) : (
        marcados && (
          <BarraDeAbajo
            rotulo={`${marcados.ids.size} señalado${marcados.ids.size === 1 ? "" : "s"}`}
            titulo={marcados.termino}
            onCerrar={() => setMarcados(null)}
            cerrar="Dejar de señalarlos"
          />
        )
      )}

      {/* Encima de esa fila y no en ella: mudar el Centro cierra la hoja y suelta lo
          señalado, así que el aviso llega con el sitio de abajo ya vacío, pero es una caja
          de dos líneas y no una píldora. Al entrar sale sin «Deshacer»: no se viene de ningún
          sitio, y el enlace con el que se ha llegado no es una acción de quien lo abre. */}
      {aviso && (
        <AvisoDeMudanza
          centro={conApellido(puntoDeVista)}
          // Con el filtro quitado están en pantalla: contarlos aquí los daría por ausentes.
          escondidos={ocultarNoConectados ? escondidos : 0}
          onDeshacer={anterior ? () => centrarEn(anterior) : undefined}
          onCerrar={() => setAviso(false)}
        />
      )}

      {hoja && !recogida && (
        <Hoja contenido={"id" in hoja ? `${hoja.tipo}:${hoja.id}` : hoja.tipo} onCerrar={() => setHoja(null)}>
          {hoja.tipo === "capas" ? (
            <Capas
              fechas={fechas}
              setFechas={setFechas}
              apellidos={apellidos}
              setApellidos={setApellidos}
              ocultar={ocultarNoConectados}
              setOcultar={setOcultarNoConectados}
              escondidos={escondidos}
              repaso={repaso}
              setRepaso={setRepaso}
              // Los que están puestos y no los 381 del árbol: la cifra es lo que se va a
              // encontrar al cerrar la hoja, y el total no cabe en ninguna pantalla.
              incompletos={layout.nodos.filter((n) => conHuecos.has(n.id)).length}
              todoDesplegado={todoDesplegado}
              onDesplegarTodo={() => {
                setTodoDesplegado(!todoDesplegado);
                setAbiertas(new Set());
                setParejas(new Set());
              }}
              onReiniciar={() => reiniciar("entrada")}
              inicial={conApellido(inicial)}
            />
          ) : hoja.tipo === "celebraciones" ? (
            <Celebraciones lista={celebraciones} hoy={hoy} identidad={paraCelebrar} onPersona={abrirFicha} />
          ) : hoja.tipo === "camino" && camino ? (
            <Camino
              datos={camino}
              relacion={relaciones.get(hoja.id)!}
              identidad={enLista}
              sinDibujar={camino.eslabones.filter((e) => !dibujado.has(e.id)).length}
              onPersona={abrirFicha}
              onVolver={() => abrirFicha(hoja.id)}
              onVerEnElArbol={() => verCaminoEnElArbol(hoja.id, camino.eslabones.map((e) => e.id))}
            />
          ) : (
            <Ficha
              datos={fichaDe(grafo, hoja.id, {
                puntoDeVista,
                linaje: libreta.linaje,
                hoy,
                relacion: relaciones.get(hoja.id)!,
                pertenencia: pertenencias.get(hoja.id),
                homonimia: libreta.homonimias.get(hoja.id),
              })}
              reinicio={tocado ? personaPorId.get(puntoDeVista)!.nombre : undefined}
              onCentrar={() => centrarEn(hoja.id)}
              onCamino={() => abrirHoja({ tipo: "camino", id: hoja.id })}
              onVerEnElArbol={() => verEnElArbol(hoja.id)}
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
              onReiniciar={() => reiniciar("aqui")}
            />
          )}
        </Hoja>
      )}
    </div>
  );
}

/**
 * Las tres unidades, de la más gorda a la más fina. En pantalla se llaman por lo que se ve
 * en cada una y no por la unidad que las dibuja: «bloques» es una palabra del código, y
 * «familias» se entiende sin que nadie la presente.
 */
