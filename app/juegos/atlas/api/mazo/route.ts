// El mazo de Atlas en Redis, que es quien manda cuando hay sesión.
//
// El POST no recibe un mazo, recibe **calificaciones sueltas**, y las aplica con el mismo
// motor que el navegador. Es lo que hace que la sincronía no pierda nada: mandar el mazo
// entero pisaría lo calificado en el otro dispositivo, y aplicar una a una se mezcla solo.
// Por eso "gana Redis" no es una decisión arriesgada — al cargar, lo local ya está volcado.
import { cookies } from "next/headers";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/atlas/keys";
import { verifySession } from "@/lib/atlas/session";
import { PAIS_POR_ID } from "@/lib/atlas/paises";
import { calificar, DATOS, NOTAS, type Dato, type Mazo, type Nota } from "@/lib/atlas/srs";

const conSesion = async () => verifySession((await cookies()).get("atlas_session")?.value);

async function leer(): Promise<Mazo> {
  const guardado = await redis.get(KEYS.mazo());
  return guardado ? (JSON.parse(guardado) as Mazo) : {};
}

export async function GET(): Promise<Response> {
  if (!(await conSesion())) return new Response("No autorizado", { status: 401 });
  return Response.json({ mazo: await leer() });
}

export async function POST(request: Request): Promise<Response> {
  if (!(await conSesion())) return new Response("No autorizado", { status: 401 });

  let body: { calificaciones?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const ahora = Date.now();
  let mazo = await leer();
  for (const c of Array.isArray(body.calificaciones) ? body.calificaciones : []) {
    // Se valida una a una: esto acaba en el mazo, y un dato inventado se queda ahí con una
    // vida que ya no vuelve a salir a preguntar nunca.
    const { pais, dato, nota, ms } = (c ?? {}) as Record<string, unknown>;
    if (typeof pais !== "string" || !PAIS_POR_ID.has(pais)) continue;
    if (!(DATOS as readonly string[]).includes(dato as string)) continue;
    if (!(NOTAS as readonly string[]).includes(nota as string)) continue;
    // El reloj lo pone quien calificó —lo de hace tres días sin cobertura es de hace tres
    // días—, pero nunca del futuro: una fecha adelantada infla la vida y no se deshace.
    const cuando = typeof ms === "number" && Number.isFinite(ms) ? Math.min(ms, ahora) : ahora;
    mazo = calificar(mazo, pais, dato as Dato, nota as Nota, cuando);
  }

  await redis.set(KEYS.mazo(), JSON.stringify(mazo));
  return Response.json({ mazo });
}
