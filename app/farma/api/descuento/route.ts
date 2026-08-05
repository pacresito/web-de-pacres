// Edita un descuento (principio, lab, dosis) en el blob mutable farma:descuentos y apaga
// el flag `inferido` (pasa a validado por María). Única admin = María, sin
// concurrencia → read-modify-write directo del blob. Solo admin.
//
// `nuevaDosis` cambia la dosis de la entrada, que es media identidad, y en los dos
// sentidos: ponérsela a una genérica (la tarifa resultó ser la de una presentación, no la
// del lab) y quitársela (era general después de todo). Ese es el ÚNICO camino entre las
// dos formas: borrar y volver a crear deja un hueco en el que el mostrador lee una tarifa
// que ya se sabe falsa. La colisión con otra entrada del mismo lab la corta el 409 —que al
// quitar la dosis es justo el guard de "solo si el lab no tiene ya genérica"—.
import { getRol } from "../../auth";
import { cargarDescuentos, guardarDescuentos } from "@/lib/farma/descuentos-store";
import { mismaEntrada } from "@/lib/farma/prioridades";
import { leerDosis } from "../dosis";

export async function POST(request: Request): Promise<Response> {
  if ((await getRol()) !== "admin") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { principio?: unknown; lab?: unknown; dosis?: unknown; nuevaDosis?: unknown; valor?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { principio, lab, valor } = body;
  if (typeof principio !== "string" || typeof lab !== "string") {
    return Response.json({ error: "principio y lab requeridos" }, { status: 400 });
  }
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
    return Response.json({ error: "Descuento entre 0 y 100" }, { status: 400 });
  }
  const dosis = leerDosis(body.dosis);
  if (dosis instanceof Error) {
    return Response.json({ error: dosis.message }, { status: 400 });
  }

  const data = await cargarDescuentos();
  const fila = data[principio]?.find((l) => mismaEntrada(l, lab, dosis));
  if (!fila) {
    return Response.json({ error: "Principio o lab desconocido" }, { status: 404 });
  }

  if (body.nuevaDosis !== undefined) {
    const nuevaDosis = leerDosis(body.nuevaDosis);
    if (nuevaDosis instanceof Error) {
      return Response.json({ error: nuevaDosis.message }, { status: 400 });
    }
    if ((nuevaDosis ?? "") !== (fila.dosis ?? "")) {
      if (data[principio].some((l) => mismaEntrada(l, lab, nuevaDosis))) {
        return Response.json(
          {
            error: nuevaDosis
              ? "Ese laboratorio ya tiene esa dosis"
              : "Ese laboratorio ya tiene una tarifa general en este principio",
          },
          { status: 409 },
        );
      }
      if (nuevaDosis) fila.dosis = nuevaDosis;
      else delete fila.dosis;
    }
  }

  fila.descuento = valor;
  fila.inferido = false;
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
