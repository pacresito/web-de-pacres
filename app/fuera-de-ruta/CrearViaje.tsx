"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DatosViajes } from "@/lib/fuera-de-ruta/tipos";
import type { MatrizViajes } from "@/lib/fuera-de-ruta/geo";
import type { Filtros } from "@/lib/fuera-de-ruta/filtrar";
import { filtrosAQuery } from "@/lib/fuera-de-ruta/url-filtros";
import { BLOQUES, camposDe, type Bloque, type Campo, type Respuestas } from "@/lib/fuera-de-ruta/cuestionario/preguntas";
import { serializarViaje } from "@/lib/fuera-de-ruta/cuestionario/viaje-url";
import { tomarParaAbrir } from "@/lib/fuera-de-ruta/viaje/guardados";
import { PasoBloque, Resumen } from "./_crear-viaje/Cuestionario";
import Resultado from "./_crear-viaje/Resultado";

// S5 «Crear mi viaje» (Fase C): el cuestionario de Cris sustituye al formulario plano.
// Tres pasos —el viajero, el viaje y el resumen editable— y al confirmar lanza el motor
// de dos fases. El viajero se guarda en localStorage (reutilizable); el viaje viaja en la
// URL. Aquí se decide qué pantalla toca y quién guarda las respuestas; pintarlas es cosa
// de `_crear-viaje/` (carpeta privada: el `_` la deja fuera del enrutado de Next).

const CLAVE_VIAJERO = "fr:viajero";
const CLAVE_VIAJE = "fr:viaje";
type Paso = "viajero" | "viaje" | "resumen" | "resultado";

// --- Persistencia en localStorage, defensiva en ambos sentidos. El viajero (bloque 1) es
// reutilizable; el viaje (bloque 2) va sobre todo a la URL (compartible), pero se espeja
// aquí también para que sobreviva al entrar sin query —un enlace con viaje gana al espejo—.
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
// que marcaste no debe seguir eliminando destinos. El orden de BLOQUES basta (una
// condicional siempre depende de una pregunta anterior).
function podar(r: Respuestas): Respuestas {
  const out = { ...r };
  for (const p of BLOQUES.flatMap((b) => b.preguntas)) {
    if (p.visible && !p.visible(out)) delete out[p.campo];
  }
  return out;
}

// Cambia un campo (o lo borra al deseleccionar) y vuelve a podar las condicionales.
function conCampo(r: Respuestas, campo: Campo, valor: string | string[] | undefined): Respuestas {
  const out = { ...r };
  if (valor === undefined || (Array.isArray(valor) && valor.length === 0)) delete out[campo];
  else out[campo] = valor;
  return podar(out);
}

export default function CrearViaje({ datos, matriz, provincia, filtros, viajeInicial }: {
  datos: DatosViajes;
  matriz: MatrizViajes;    // tiempos y km de coche precalculados, para el panel «Mi viaje»
  provincia: string;       // slug de URL, para los enlaces
  filtros: Filtros;        // filtros heredados del explorador (de aquí salen las zonas)
  viajeInicial?: Respuestas; // bloque viaje llegado por la URL (recarga o enlace)
}) {
  // Reabrir un viaje de «Mis viajes» (handoff por localStorage, de un solo uso): arranca
  // directo en el resultado con el perfil y la selección guardados.
  const [abrir] = useState(() => tomarParaAbrir(provincia));
  const [respuestas, setRespuestas] = useState<Respuestas>(() =>
    abrir
      ? podar(abrir.perfil)
      : podar({ ...leerBloque(CLAVE_VIAJERO, "viajero"), ...leerBloque(CLAVE_VIAJE, "viaje"), ...viajeInicial }));
  const [paso, setPaso] = useState<Paso>(abrir ? "resultado" : "viajero");
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(abrir?.seleccion ?? []));

  // El viajero se recuerda; el viaje se refleja en la URL (sobre los filtros heredados,
  // que no chocan de clave). replaceState, no router: no queremos re-render del servidor.
  // OJO (Next ≥14.1): replaceState **sincroniza con useSearchParams**, y como los filtros
  // llegan de ahí, escribir en cada render realimentaba render→escribe→render (cuelgue al
  // marcar una opción). Por eso solo se escribe si la URL cambia de verdad: idempotente.
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

  const cambiar = (campo: Campo, valor: string | string[] | undefined) =>
    setRespuestas((r) => conCampo(r, campo, valor));

  const qsFiltros = filtrosAQuery(filtros);
  const hrefSitios = `/fuera-de-ruta/${provincia}/sitios${qsFiltros ? `?${qsFiltros}` : ""}`;

  const bloqueViajero = BLOQUES.find((b) => b.id === "viajero")!;
  const bloqueViaje = BLOQUES.find((b) => b.id === "viaje")!;

  if (paso === "viajero") {
    return (
      <PasoBloque
        bloque={bloqueViajero}
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
        bloque={bloqueViaje}
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
