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
  _request: Request,
  { params }: { params: Promise<{ clave: string; nombre: string }> },
): Promise<Response> {
  if (!(await tieneSesion())) return new Response("No autorizado", { status: 401 });

  const { clave, nombre } = await params;
  // Solo se sirve lo que la lista conoce. Sin esto, la ruta sería un proxy abierto a todo lo
  // que hubiera en el blob para cualquiera con sesión.
  if (!hayFoto(clave)) return new Response("No encontrada", { status: 404 });

  const foto = await get(rutaEnBlob(clave), { access: "private" });
  if (!foto) return new Response("No encontrada", { status: 404 });

  return new Response(foto.stream, {
    headers: {
      "Content-Type": "image/jpeg",
      // Una semana, y **nunca `immutable`**: la clave sale del dueño y del año, así que
      // resubir una foto mejor escaneada reutiliza la suya y el navegador seguiría
      // enseñando la vieja sin que nada lo delate. Privada, porque en medio hay CDN y esto
      // no es de todos.
      "Cache-Control": "private, max-age=604800",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(saneado(nombre))}`,
    },
  });
}

/** Un nombre de archivo, no una ruta ni una cabecera: fuera barras y saltos de línea. */
const saneado = (nombre: string): string => nombre.replace(/[/\\\r\n]/g, "-").slice(0, 200);
