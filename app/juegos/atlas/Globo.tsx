"use client";

import { useMemo, useRef, useState } from "react";
import { FORMAS } from "@/data/atlas/formas";
import { MUNDO } from "@/data/atlas/mundo";
import { enganche, gradosEntre, ortografica, pathDelGlobo, rellenoDelGlobo } from "@/lib/atlas/globo";

// Los países que el mapa de baja resolución no trae. Entran al enganche por su centro, que es el
// mismo punto con el que ya se dibujan.
const CON_ANILLO = new Set(MUNDO.map((a) => a.id));
const PUNTOS = Object.entries(FORMAS)
  .filter(([id]) => !CON_ANILLO.has(id))
  .map(([id, f]) => ({ id, lon: f.lon, lat: f.lat }));

/**
 * Hasta dónde se marcan esos países, en grados de arco desde el centro del globo. **Cincuenta,
 * media cara visible:** en el Pacífico casi todo país es un punto, y con veinte el globo enseñaba
 * uno solo y no había dónde apuntar. Más no cabe: cerca del limbo la ortográfica los apila contra
 * el canto —a 70° se pintan al 94% del radio— y dejan de distinguirse unos de otros.
 */
const RADIO_PUNTOS = 50;

/**
 * Cuánto se puede acercar el globo de marcar. Seis: a ese aumento Andorra mide lo que el dedo,
 * que es de lo que se trata, y más deja la costa como una escalera —el dibujo va a radio fijo—.
 */
const ZOOM_MAX = 6;

/**
 * Cuánto se arrastra antes de que un toque deje de serlo, en píxeles de pantalla. Diez, que es
 * el margen con el que Android da un toque por quieto: por debajo, el pulgar que se mueve al
 * levantarse deja de marcar y parece que el globo no responde.
 */
const ARRASTRE = 10;

/** Los anillos de un país, o ninguno si no se pide ninguno. */
const anillosDe = (quien: string | null) => (quien ? MUNDO.filter((a) => a.id === quien).map((a) => a.r) : []);

/** Lo que es del país sin ser él: Groenlandia de Dinamarca, la Polinesia de Francia. */
const territoriosDe = (quien: string | null) =>
  (quien ? MUNDO.filter((a) => a.id === quien && a.territorio).map((a) => a.r) : []);
const propiosDe = (quien: string | null) =>
  (quien ? MUNDO.filter((a) => a.id === quien && !a.territorio).map((a) => a.r) : []);

/**
 * El globo de la tarjeta: la Tierra centrada en el país, con él resaltado. Es quien cuenta el
 * tamaño y la ubicación, que la silueta ya no dice porque va normalizada.
 *
 * Va con la forma, no aparte: si se enseñara con la forma tapada estaría señalando el país en
 * un mapa, que es media respuesta regalada.
 *
 * **`lon` y `lat` son dónde se planta el globo, no dónde está el país.** No coinciden: la tarjeta
 * lo desvía a propósito para que la respuesta no caiga en el centro del disco. Quien sabe dónde
 * está cada país es `FORMAS`, y de ahí salen los puntos de los que no tienen contorno.
 *
 * `puntos` marca los que el mapa no trae, para poder apuntarles: a esta escala no se ven, y saber
 * dónde está Andorra no sirve de nada si no hay nada que pinchar. Que a veces el punto sea el país
 * preguntado se acepta —la mayoría de las veces no lo es, y quien califica es quien juega—.
 *
 * `oculto` lo dibuja como tierra cualquiera, con su costa igual que la de sus vecinos, para el
 * globo en el que se marca el sitio antes de destapar: omitirlo dejaría un hueco justo donde está
 * la respuesta. Con `alMarcar` el toque dentro del disco engancha un país y lo devuelve.
 */
export default function Globo({ id, lon, lat, r = 74, lado, oculto, puntos, marca, alMarcar }: {
  id: string; lon: number; lat: number; r?: number; lado?: string;
  oculto?: boolean; puntos?: boolean; marca?: string | null; alMarcar?: (id: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  // El mundo entero, que es lo que cuesta: 23.000 puntos por proyectar. Va aparte de la marca
  // porque marcar no lo cambia —son diez milisegundos por globo, y al marcar hay dos vivos—.
  const { proy, cercanos, tierra, relleno, mio, suyoLejos, punto, diminutos } = useMemo(() => {
    const proy = ortografica(lon, lat, r);
    // `null` y no "" para el que no se resalta: la cadena vacía es el id de la tierra que no es de
    // ningún país, y se llevaría el resaltado entera.
    const resaltado = oculto ? null : id;
    const suyos = propiosDe(resaltado);
    // Los que se dibujan son los mismos que se pueden enganchar, y por eso salen de aquí: dos
    // listas separadas serían un punto que se ve y no responde, o al revés.
    const cercanos = puntos ? PUNTOS.filter((p) => gradosEntre(lon, lat, p.lon, p.lat) <= RADIO_PUNTOS) : [];
    return {
      proy, cercanos,
      tierra: pathDelGlobo(MUNDO.filter((a) => a.id !== resaltado).map((a) => a.r), proy),
      // La tierra rellena, un punto más oscura que el agua: sin ella el globo es un círculo de
      // un solo tono con rayas, y no se lee cuál de los dos lados de la costa es mar.
      relleno: rellenoDelGlobo(MUNDO.map((a) => a.r), proy),
      mio: pathDelGlobo(suyos, proy),
      // Aparte del país y en otro tono: el globo es quien cuenta cuánto mide, y Groenlandia en el
      // mismo verde que Dinamarca la haría cincuenta veces más grande de lo que es.
      suyoLejos: pathDelGlobo(territoriosDe(resaltado), proy),
      // Los diminutos no están en el mapa de baja resolución del globo, y a esta escala un
      // punto es exactamente lo que son. Va por su sitio en `FORMAS`, no por el centro del globo,
      // que es otra cosa desde que la tarjeta lo desvía.
      punto: resaltado && !suyos.length ? proy(FORMAS[resaltado].lon, FORMAS[resaltado].lat) : null,
      // El resaltado no se dibuja gris: ya se pinta en acento un poco más abajo, y dos círculos
      // en el mismo sitio dejan un halo asomando por fuera del verde. Dentro del radio no hace
      // falta comprobar el horizonte, que está a noventa grados.
      diminutos: cercanos.filter((p) => p.id !== resaltado).map((p) => proy(p.lon, p.lat)),
    };
  }, [id, lon, lat, r, oculto, puntos]);

  const { trazo, trazoPunto } = useMemo(() => {
    const marcados = anillosDe(marca ?? null);
    return {
      trazo: pathDelGlobo(marcados, proy),
      trazoPunto: marca && !marcados.length ? proy(FORMAS[marca].lon, FORMAS[marca].lat) : null,
    };
  }, [proy, marca]);

  /**
   * El zoom del globo de marcar: pellizcar con dos dedos —rueda en escritorio— acerca, y
   * arrastrar mueve. Es nuestro y no el del navegador porque el nativo no se puede devolver a 1
   * desde JS: se quedaría puesto sobre la tarjeta siguiente. Este se va solo, que es estado del
   * componente y la lupa se desmonta al marcar.
   *
   * El enganche no se entera de nada: `tocar` mide el disco con `getBoundingClientRect`, que ya
   * viene escalado, así que al acercar el umbral en píxeles de pantalla encoge con él y la
   * puntería mejora sola.
   */
  const marco = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState({ k: 1, x: 0, y: 0 });
  // El mismo estado en un ref: los gestos lo leen y lo escriben varias veces por fotograma, y
  // desde el render llegaría siempre uno tarde.
  const actual = useRef({ k: 1, x: 0, y: 0 });
  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const inicio = useRef({ k: 1, x: 0, y: 0, px: 0, py: 0, d: 0 });
  // Un gesto se come el clic que viene detrás: al soltar un pellizco no se marca país.
  const movido = useRef(false);

  /** Dónde cae el puntero respecto al centro del marco, que es el origen de la transformación. */
  const donde = (e: { clientX: number; clientY: number }) => {
    const c = marco.current!.getBoundingClientRect();
    return { x: e.clientX - c.left - c.width / 2, y: e.clientY - c.top - c.height / 2 };
  };

  /**
   * El globo no se sale del marco: a escala k sobresale la mitad de lo que crece, y de ahí no
   * pasa. Con k = 1 el tope es cero, así que arrastrar sin acercar no mueve nada.
   */
  const aplicar = (k: number, x: number, y: number) => {
    const tope = ((k - 1) * marco.current!.getBoundingClientRect().width) / 2;
    const nuevo = { k, x: Math.min(tope, Math.max(-tope, x)), y: Math.min(tope, Math.max(-tope, y)) };
    actual.current = nuevo;
    setZ(nuevo);
  };

  /** El punto del dibujo que hay bajo el foco se queda bajo el foco: es lo que hace natural el gesto. */
  const hacia = (k: number, fx: number, fy: number) => {
    const i = inicio.current;
    aplicar(k, fx - (i.px - i.x) * (k / i.k), fy - (i.py - i.y) * (k / i.k));
  };

  /** Se rearma con cada dedo que entra o sale: el gesto sigue desde donde está, sin saltos. */
  const arrancar = () => {
    const ps = [...dedos.current.values()];
    if (!ps.length) return;
    const b = ps[1] ?? ps[0];
    inicio.current = {
      ...actual.current,
      px: (ps[0].x + b.x) / 2, py: (ps[0].y + b.y) / 2,
      d: Math.hypot(ps[0].x - b.x, ps[0].y - b.y),
    };
  };

  const abajo = (e: React.PointerEvent) => {
    if (!dedos.current.size) movido.current = false;
    dedos.current.set(e.pointerId, donde(e));
    e.currentTarget.setPointerCapture(e.pointerId);
    arrancar();
  };

  const mover = (e: React.PointerEvent) => {
    if (!dedos.current.has(e.pointerId)) return;
    dedos.current.set(e.pointerId, donde(e));
    const ps = [...dedos.current.values()];
    const i = inicio.current;
    const b = ps[1] ?? ps[0];
    const f = { x: (ps[0].x + b.x) / 2, y: (ps[0].y + b.y) / 2 };
    const k = ps.length > 1 && i.d > 0
      ? Math.min(ZOOM_MAX, Math.max(1, (i.k * Math.hypot(ps[0].x - b.x, ps[0].y - b.y)) / i.d))
      : i.k;
    // Un dedo sin acercar no arrastra —el tope lo deja en el sitio— y por eso tampoco deja de ser
    // un toque: a nadie se le pide el pulso de no moverse seis píxeles.
    if (ps.length > 1 || (i.k > 1 && Math.hypot(f.x - i.px, f.y - i.py) > ARRASTRE)) movido.current = true;
    if (!movido.current) return;
    hacia(k, f.x, f.y);
  };

  const arriba = (e: React.PointerEvent) => {
    if (dedos.current.delete(e.pointerId)) arrancar();
  };

  const rueda = (e: React.WheelEvent) => {
    const f = donde(e);
    dedos.current.clear();
    inicio.current = { ...actual.current, px: f.x, py: f.y, d: 0 };
    hacia(Math.min(ZOOM_MAX, Math.max(1, actual.current.k * Math.exp(-e.deltaY / 400))), f.x, f.y);
  };

  /**
   * Dentro del disco se marca; fuera, el toque sigue subiendo, que ahí es cerrar. Lo que
   * distingue un toque de otro es dónde cae, así que vale igual con dedo y con ratón.
   */
  const tocar = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!alMarcar || !svg.current) return;
    // El clic con el que acaba un pellizco no marca, pero tampoco cierra la lupa: quien acaba de
    // acercar el globo está apuntando, no saliendo.
    if (movido.current) return e.stopPropagation();
    const caja = svg.current.getBoundingClientRect();
    // Cuántas unidades del dibujo mide un píxel de pantalla: el globo se calcula a radio fijo y
    // se pinta al tamaño que quepa, y los umbrales del enganche van en píxeles del de verdad.
    const unidad = (r * 2 + 2) / caja.width;
    const p: [number, number] = [
      (e.clientX - caja.left) * unidad - (r + 1),
      (e.clientY - caja.top) * unidad - (r + 1),
    ];
    if (Math.hypot(p[0], p[1]) > r) return;
    e.stopPropagation();
    const enganchado = enganche(MUNDO, cercanos, proy, p, unidad);
    if (enganchado) alMarcar(enganchado);
  };

  // El dibujo se calcula a radio grande y se pinta al tamaño que pida quien lo usa: bajar el
  // radio adelgazaría la costa hasta perderla. Los trazos no escalan, para que a 52 px sigan
  // midiendo un píxel.
  const d = r * 2 + 2;
  const globo = (
    <svg ref={svg} onClick={tocar} width={d} height={d} viewBox={`${-r - 1} ${-r - 1} ${d} ${d}`}
         style={alMarcar
           ? { width: "100%", height: "100%", cursor: "crosshair", transformOrigin: "center",
               transform: `translate(${z.x.toFixed(1)}px, ${z.y.toFixed(1)}px) scale(${z.k.toFixed(3)})` }
           : { ...(lado && { width: lado, height: lado, flexShrink: 0 }) }}
         aria-hidden>
      <circle r={r} fill="var(--t-paper2)" stroke="var(--t-rule)" />
      {/* No hace falta recortar por el círculo: lo escondido va pegado al canto y la cuerda
          entre dos puntos del borde cae siempre por dentro. */}
      <path d={relleno} fill="var(--t-rule2)" />
      <path d={tierra} fill="none" stroke="var(--t-ink4)" strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Los que no tienen contorno, del gris de en medio: se ven sin gritar, y no se confunden
          con la marca —que va en tinta llena y es una circunferencia hueca, no un punto—. El radio
          va a escala del globo, como la costa. */}
      {diminutos.map((q, i) => <circle key={i} cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r={r / 100} fill="var(--t-ink3)" />)}
      {/* Lo que es suyo sin ser él, en acento a medio gas: se lee que es del país y no se
          confunde con él, que es exactamente lo que hay que entender de Groenlandia. Debajo del
          país, para que un territorio grande no le tape su propio contorno. */}
      <path d={suyoLejos} fill="var(--t-accent)" fillOpacity={0.3} fillRule="evenodd" stroke="var(--t-accent)" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Trazo además de relleno: un país fino (Chile, Italia) desaparece si solo se rellena. */}
      <path d={mio} fill="var(--t-accent)" fillRule="evenodd" stroke="var(--t-accent)" strokeWidth={2.5} strokeLinejoin="round" />
      {punto?.[2] && <circle cx={punto[0]} cy={punto[1]} r={3.5} fill="var(--t-accent)" />}
      {/* La marca va encima y es trazo, mientras que la respuesta es relleno: así no pelean, y
          el acierto se lee solo —el contorno cae clavado sobre la forma verde— en vez de
          desaparecer debajo. */}
      <path d={trazo} fill="none" stroke="var(--t-ink)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {trazoPunto?.[2] && <circle cx={trazoPunto[0]} cy={trazoPunto[1]} r={6} fill="none" stroke="var(--t-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      <circle r={r} fill="none" stroke="var(--t-rule2)" />
    </svg>
  );

  if (!alMarcar) return globo;
  // El marco recorta lo que se sale al acercar y se queda con los gestos, que si no se los lleva
  // el navegador: dentro de él, pellizcar es acercar el globo y no la página.
  return (
    <div ref={marco} className="atlas-zoom" style={{ width: lado, height: lado }}
         onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba}
         onWheel={rueda}>
      {globo}
    </div>
  );
}
