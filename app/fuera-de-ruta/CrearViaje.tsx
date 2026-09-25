"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/geo";
import type { Filtros } from "@/lib/fuera-de-ruta/filtrar";
import { filtrosAQuery } from "@/lib/fuera-de-ruta/url-filtros";
import { BLOQUES, bloque, camposDe, type Bloque, type Campo, type Respuestas } from "@/lib/fuera-de-ruta/cuestionario/preguntas";
import { serializarViaje } from "@/lib/fuera-de-ruta/cuestionario/viaje-url";
import { tomarParaAbrir } from "@/lib/fuera-de-ruta/viaje/guardados";
import { PasoBloque, Resumen } from "./_crear-viaje/Cuestionario";
import Resultado from "./_crear-viaje/Resultado";

// «Crear mi viaje»: viajero, viaje, resumen y resultado. Aquí se decide qué paso toca y
// dónde se guardan las respuestas; pintarlas es cosa de `_crear-viaje/`.

const CLAVE_VIAJERO = "fr:viajero";
const CLAVE_VIAJE = "fr:viaje";
type Paso = "viajero" | "viaje" | "resumen" | "resultado";

// El viaje va a la URL, pero se espeja aquí para sobrevivir a una entrada sin query; si
// la URL lo trae, gana ella.
function leerBloque(clave: string, id: Bloque["id"]): Respuestas {
  try {
    const obj = JSON.parse(localStorage.getItem(clave) ?? "{}") as Respuestas;
    return recortar(obj, camposDe(id));
  } catch {
    return {};
  }
}
function guardarBloque(clave: string, id: Bloque["id"], r: Respuestas) {
  try {
    localStorage.setItem(clave, JSON.stringify(recortar(r, camposDe(id))));
  } catch {
    /* navegador sin localStorage: no se recuerda, no pasa nada más */
  }
}
const recortar = (r: Respuestas, campos: Campo[]): Respuestas => {
  const out: Respuestas = {};
  for (const c of campos) if (r[c] !== undefined) out[c] = r[c];
  return out;
};

// Quita las respuestas de preguntas ocultas: si dejas de viajar en familia, el carrito
// no debe seguir eliminando destinos. Una condicional siempre depende de una anterior.
function podar(r: Respuestas): Respuestas {
  const out = { ...r };
  for (const p of BLOQUES.flatMap((b) => b.preguntas)) {
    if (p.visible && !p.visible(out)) delete out[p.campo];
  }
  return out;
}

function conCampo(r: Respuestas, campo: Campo, valor: string | string[] | undefined): Respuestas {
  const out = { ...r };
  if (valor === undefined || (Array.isArray(valor) && valor.length === 0)) delete out[campo];
  else out[campo] = valor;
  return podar(out);
}

export default function CrearViaje({ datos, matriz, provincia, filtros, viajeInicial }: {
  datos: DatosViajes;
  matriz: MatrizViajes;
  provincia: string;       // slug de URL
  filtros: Filtros;        // heredados del explorador; de aquí salen las zonas
  viajeInicial?: Respuestas; // bloque viaje llegado por la URL
}) {
  // Un viaje reabierto desde «Mis viajes» arranca directo en el resultado.
  const [abrir] = useState(() => tomarParaAbrir(provincia));
  const [respuestas, setRespuestas] = useState<Respuestas>(() =>
    abrir
      ? podar(abrir.perfil)
      : podar({ ...leerBloque(CLAVE_VIAJERO, "viajero"), ...leerBloque(CLAVE_VIAJE, "viaje"), ...viajeInicial }));
  const [paso, setPaso] = useState<Paso>(abrir ? "resultado" : "viajero");
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(abrir?.seleccion ?? []));

  // replaceState sincroniza con useSearchParams, de donde llegan los filtros: escribir
  // siempre realimentaría el render. Solo se escribe si la URL cambia.
  useEffect(() => {
    guardarBloque(CLAVE_VIAJERO, "viajero", respuestas);
    guardarBloque(CLAVE_VIAJE, "viaje", respuestas);
    const params = new URLSearchParams(filtrosAQuery(filtros));
    new URLSearchParams(serializarViaje(respuestas)).forEach((v, k) => params.append(k, v));
    const qs = params.toString();
    const url = `/fuera-de-ruta/${provincia}/crear-viaje${qs ? `?${qs}` : ""}`;
    if (url !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", url);
    }
  }, [respuestas, filtros, provincia]);

  // Cada paso sustituye al anterior sin navegar y heredaría su scroll.
  useEffect(() => { window.scrollTo(0, 0); }, [paso]);

  const cambiar = (campo: Campo, valor: string | string[] | undefined) =>
    setRespuestas((r) => conCampo(r, campo, valor));

  const qsFiltros = filtrosAQuery(filtros);
  const hrefSitios = `/fuera-de-ruta/${provincia}/sitios${qsFiltros ? `?${qsFiltros}` : ""}`;

  if (paso === "viajero") {
    return (
      <PasoBloque
        bloque={bloque("viajero")}
        numero={1}
        respuestas={respuestas}
        onCambiar={cambiar}
        atras={<Link href={hrefSitios} className="fr-s5-atras" aria-label="Volver a los resultados">‹</Link>}
        onSiguiente={() => setPaso("viaje")}
        textoSiguiente="Seguir →"
      />
    );
  }

  if (paso === "viaje") {
    return (
      <PasoBloque
        bloque={bloque("viaje")}
        numero={2}
        respuestas={respuestas}
        onCambiar={cambiar}
        atras={<button className="fr-s5-atras" onClick={() => setPaso("viajero")} aria-label="Volver">‹</button>}
        onSiguiente={() => setPaso("resumen")}
        textoSiguiente="Ver resumen →"
      />
    );
  }

  if (paso === "resumen") {
    return (
      <Resumen
        respuestas={respuestas}
        onEditar={() => setPaso("viajero")}
        onEmpezar={() => setPaso("resultado")}
        onAtras={() => setPaso("viaje")}
      />
    );
  }

  return (
    <Resultado
      datos={datos}
      matriz={matriz}
      provincia={provincia}
      filtros={filtros}
      respuestas={respuestas}
      seleccion={seleccion}
      setSeleccion={setSeleccion}
      onEditar={() => setPaso("resumen")}
    />
  );
}
