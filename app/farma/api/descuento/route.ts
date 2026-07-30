// Edita un descuento (principio, lab, dosis) en el blob mutable farma:descuentos y apaga
// el flag `inferido` (pasa a validado por María). Única admin = María, sin
// concurrencia → read-modify-write directo del blob. Solo admin.
//
// `nuevaDosis` renombra la dosis de la entrada, que es media identidad: solo para entradas
// que YA la tienen y nunca a vacío —quitarle la dosis a una entrada la convertiría en la
// tarifa genérica del lab, que es otra cosa; para eso se borra la entrada—.
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
    if (!fila.dosis || !nuevaDosis) {
      return Response.json({ error: "La dosis no se puede quitar ni añadir al editar" }, { status: 400 });
    }
    if (nuevaDosis !== fila.dosis) {
      if (data[principio].some((l) => mismaEntrada(l, lab, nuevaDosis))) {
        return Response.json({ error: "Ese laboratorio ya tiene esa dosis" }, { status: 409 });
      }
      fila.dosis = nuevaDosis;
    }
  }

  fila.descuento = valor;
  fila.inferido = false;
  await guardarDescuentos(data);
  return Response.json({ ok: true });
}
