// Auditoría Inteligente del Viaje (Fase F, §4.16): última revisión antes de generar la
// guía. NO modifica el viaje —esa es la regla del flujo, como en el motor y el panel—:
// solo agrega las señales que ya calcula el panel «Mi viaje» (`desbordado`/`apretado`) y
// las reservas de la selección en una lista de hallazgos ✅/⚠️/💡 (§4.16.5). Puro; el
// panel de la Fase D no vuelve a calcular el tiempo, lee de aquí. La detección de
// oportunidades y las zonas de alojamiento son piezas aparte (F3, F4) que añaden sus
// propios hallazgos; las optimizaciones finas (§4.16.4) llegan más tarde.
import type { Destino } from "../tipos";
import type { ResumenViaje } from "../viaje/mi-viaje";
import type { ZonaAlojamiento } from "../alojamiento/alojamiento";

// El nivel decide el icono en el panel (✅ ok · ⚠️ aviso · 💡 idea). `accion` es una CTA
// que la UI resuelve (hoy solo «comparar», que abre el comparador de la F2).
export type Hallazgo = {
  nivel: "ok" | "aviso" | "idea";
  tipo: "compatibilidad" | "tiempo" | "reserva" | "alojamiento";
  texto: string;
  accion?: "comparar";
};

// Un destino requiere reserva si trae el campo `reserva` (texto que la describe); el
// `plazoReserva` es complementario y puede faltar.
const requiereReserva = (d: Destino) => d.reserva != null;

// Une nombres en lista natural: "A", "A y B", "A, B y C".
const listaNatural = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;

// Selección + reparto ya calculado → hallazgos de la auditoría. Sin selección, nada que
// auditar (lista vacía: el panel no muestra el bloque). El orden es el de §4.16.5:
// compatibilidad, tiempo, reservas, alojamiento. Las `zonas` (F4) son opcionales: si
// llegan, añaden la línea 💡 de dónde dormir; el bloque detallado lo pinta el panel.
export function auditar(resumen: ResumenViaje, seleccion: Destino[], zonas: ZonaAlojamiento[] = []): Hallazgo[] {
  if (seleccion.length === 0) return [];
  const hallazgos: Hallazgo[] = [];

  // Compatibilidad: el motor ya eliminó las incompatibilidades objetivas en su primera
  // fase, así que todo lo seleccionable —y por tanto seleccionado— es compatible.
  hallazgos.push({
    nivel: "ok",
    tipo: "compatibilidad",
    texto: "Todas las actividades son compatibles con vuestro perfil.",
  });

  // Tiempo (§4.16.1): avisa solo cuando el reparto no cabe con el ritmo —global
  // (`desbordado`) o algún día justo (`apretado`)—; nunca por tener muchas actividades
  // similares. El aviso ofrece el comparador; nunca elimina.
  const apretados = resumen.dias.filter((d) => d.apretado).length;
  if (resumen.desbordado || apretados > 0) {
    hallazgos.push({
      nivel: "aviso",
      tipo: "tiempo",
      texto:
        "El tiempo disponible puede no ser suficiente para disfrutar de todas las actividades con el ritmo que elegiste.",
      accion: "comparar",
    });
  } else {
    hallazgos.push({
      nivel: "ok",
      tipo: "tiempo",
      texto: "El itinerario es coherente con el ritmo de viaje seleccionado.",
    });
  }

  // Reservas (§4.16.3): cuenta las seleccionadas que requieren reserva previa. Sin
  // ninguna, no se añade línea (no meter ruido); el detalle por actividad y sus enlaces
  // viven en la ficha.
  const conReserva = seleccion.filter(requiereReserva).length;
  if (conReserva > 0) {
    hallazgos.push({
      nivel: "aviso",
      tipo: "reserva",
      texto:
        conReserva === 1
          ? "Una actividad requiere reserva previa."
          : `Hay ${conReserva} actividades que requieren reserva previa.`,
    });
  }

  // Alojamiento (§4.15, F4): dónde conviene dormir. Una línea 💡 con las localidades base;
  // el detalle (días, paradas, ahorro) lo pinta el bloque «Zonas recomendadas» del panel.
  if (zonas.length > 0) {
    const pueblos = zonas.map((z) => z.pueblo);
    hallazgos.push({
      nivel: "idea",
      tipo: "alojamiento",
      texto:
        pueblos.length === 1
          ? `Mejor base para dormir: ${pueblos[0]}.`
          : `Os proponemos dormir en ${pueblos.length} zonas: ${listaNatural(pueblos)}.`,
    });
  }

  return hallazgos;
}
