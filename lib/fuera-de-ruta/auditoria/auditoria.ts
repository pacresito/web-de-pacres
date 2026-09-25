// Auditoría del viaje: resume en hallazgos ✅/⚠️/💡 lo que ya calcularon el reparto y
// las bases. Nunca modifica el viaje.
import type { Destino } from "../tipos";
import { enumerar } from "../formato";
import type { ResumenViaje } from "../viaje/mi-viaje";
import type { ZonaAlojamiento } from "../alojamiento/alojamiento";

// `accion`: botón que la UI pinta junto al hallazgo.
export type Hallazgo = {
  nivel: "ok" | "aviso" | "idea";
  tipo: "compatibilidad" | "tiempo" | "reserva" | "alojamiento";
  texto: string;
  accion?: "comparar";
};

// Coche de ida y vuelta a la base a partir del cual se avisa.
const DIA_LARGO_MIN = 120;

export function auditar(resumen: ResumenViaje, seleccion: Destino[], zonas: ZonaAlojamiento[] = []): Hallazgo[] {
  if (seleccion.length === 0) return [];
  const hallazgos: Hallazgo[] = [];

  // La fase 1 del motor ya quitó lo incompatible: todo lo seleccionable lo es.
  hallazgos.push({
    nivel: "ok",
    tipo: "compatibilidad",
    texto: "Todas las actividades son compatibles con vuestro perfil.",
  });

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

  const conReserva = seleccion.filter((d) => d.reserva != null).length;
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

  if (zonas.length > 0) {
    const pueblos = zonas.map((z) => z.pueblo);
    hallazgos.push({
      nivel: "idea",
      tipo: "alojamiento",
      texto:
        pueblos.length === 1
          ? `Mejor base para dormir: ${pueblos[0]}.`
          : `Os proponemos dormir en ${pueblos.length} zonas: ${enumerar(pueblos)}.`,
    });

    // Mudarse no siempre compensa, pero el día atado a una base lejana se dice.
    const largos = zonas.flatMap((z) =>
      z.dias.filter((_, i) => (z.cocheDiaMin?.[i] ?? 0) >= DIA_LARGO_MIN));
    if (largos.length > 0) {
      hallazgos.push({
        nivel: "aviso",
        tipo: "alojamiento",
        texto:
          largos.length === 1
            ? `El día ${largos[0]} pasaréis más de ${DIA_LARGO_MIN / 60} h en el coche solo para ir y volver del alojamiento.`
            : `Los días ${enumerar(largos.map(String))} pasaréis más de ${DIA_LARGO_MIN / 60} h en el coche solo para ir y volver del alojamiento.`,
      });
    }
  }

  return hallazgos;
}
