import { tieneSesion } from "./auth";
import LoginForm from "./LoginForm";
import Arbol from "./Arbol";
import redis from "@/lib/redis";
import { KEYS } from "@/lib/arbol/keys";
import type { ArbolData } from "@/lib/arbol/tree";

export default async function ArbolPage() {
  const auth = await tieneSesion();
  if (!auth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <LoginForm />
      </div>
    );
  }

  const raw = await redis.get(KEYS.datos());
  const data: ArbolData = raw ? JSON.parse(raw) : { people: [], unions: [], roots: {} };
  // El día del que se cuentan las edades, fijado aquí y no en el cliente: si cada uno
  // mirara su reloj, el nodo de quien cumple hoy se pintaría con dos edades distintas.
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });

  return (
    <div className="flex h-full flex-col">
      {/* En un móvil la pantalla es el lienzo: el título se va con la barra y arriba manda
          la regla de generación, que es la que dice dónde estás. Tema y salida viven en
          «Qué se ve», que es donde se busca lo que se toca una vez. */}
      <nav className="hidden items-center border-b border-[var(--line)] px-4 py-2 md:flex">
        <h1 className="font-[family-name:var(--serif)] text-[20px]">Árbol genealógico</h1>
      </nav>
      <div className="min-h-0 flex-1">
        <Arbol data={data} hoy={hoy} />
      </div>
    </div>
  );
}
