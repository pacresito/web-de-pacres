// La puerta de las fotos: lo único que puede sacar una del blob privado, y solo a quien ya
// ha entrado en /arbol. El repo es público y las fotos son caras de la familia, así que no
// hay ninguna URL que valga sin esta cookie.
//
// **El último tramo de la ruta es el nombre de la descarga**, no un dato: viaja ahí porque
// es lo único que respetan por igual el «guardar imagen» del móvil y el clic derecho del
// escritorio. Quien lo lee es el navegador; aquí solo se devuelve como cabecera, y saneado,
// porque lo escribe quien pide la URL y no esta ruta.
import { get } from "@vercel/blob";
import { tieneSesion } from "@/app/arbol/auth";
import { hayFoto, rutaEnBlob } from "@/lib/arbol/fotos";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clave: string; nombre: string }> },
): Promise<Response> {
  if (!(await tieneSesion())) return new Response("No autorizado", { status: 401 });

  const { clave, nombre } = await params;
  // Solo se sirve lo que la lista conoce. Sin esto, la ruta sería un proxy abierto a todo lo
  // que hubiera en el blob para cualquiera con sesión.
  if (!hayFoto(clave)) return new Response("No encontrada", { status: 404 });

  // **El navegador pregunta siempre, y casi siempre se va con un 304.** La clave sale de la
  // foto —su título o su dueño— y del año, así que resubir la foto reutiliza la suya: guardarla por tiempo —fuera
  // un día o una semana— es prometer que el archivo de esa clave no cambia, y cambia. Y no
  // basta con que tarde en verse la nueva: los recuadros son fracciones del ancho, así que
  // una copia con otro encuadre deja las caras recortadas por los ojos hasta que caduque.
  // El ETag es el del propio blob y el 304 lo decide él, que es quien sabe si cambió.
  const foto = await get(rutaEnBlob(clave), {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
  });
  if (!foto) return new Response("No encontrada", { status: 404 });

  // Privada, porque en medio hay CDN y esto no es de todos.
  const revalidar = { ETag: foto.blob.etag, "Cache-Control": "private, no-cache" };
  if (foto.statusCode === 304) return new Response(null, { status: 304, headers: revalidar });

  return new Response(foto.stream, {
    headers: {
      ...revalidar,
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(saneado(nombre))}`,
    },
  });
}

/** Un nombre de archivo, no una ruta ni una cabecera: fuera barras y saltos de línea. */
const saneado = (nombre: string): string => nombre.replace(/[/\\\r\n]/g, "-").slice(0, 200);
