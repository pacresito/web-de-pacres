// Las cifras del árbol, en una ruta que no enlaza nadie: `/arbol/stats`. Es la vista del
// trabajo de rellenarlo —cuánto hay, de qué rama y qué queda por preguntar—, no una vista
// más del árbol, y por eso no entra en «Qué se ve» ni en ningún filtro. Se encuentra como se
// encuentran las fotos: sabiendo que está.
//
// Lo cuenta todo `lib/arbol/stats.ts`; aquí solo se pinta. Va bajo la misma clave que el
// lienzo, que es el mismo dato con otra forma.

import Link from "next/link";
import { calcularStats, type Generacion, type Tatarabuelo } from "@/lib/arbol/stats";
import { construirGrafo } from "@/lib/arbol/grafo";
import { KEYS } from "@/lib/arbol/keys";
import type { ArbolData } from "@/lib/arbol/tree";
import redis from "@/lib/redis";
import { tieneSesion } from "../auth";
import LoginForm from "../LoginForm";
import TemaBoton from "../TemaBoton";

// El árbol no lleva título de pestaña propio en ninguna de sus pantallas; esta sí, que se
// abre a mano y se deja abierta en una pestaña al lado de la del lienzo.
export const metadata = { title: "Stats del árbol" };

export default async function CifrasPage() {
  if (!(await tieneSesion())) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <LoginForm />
      </div>
    );
  }

  const raw = await redis.get(KEYS.datos());
  const data: ArbolData = raw ? JSON.parse(raw) : { people: [], unions: [], roots: {} };
  if (data.people.length === 0) return <Vacio />;
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const c = calcularStats(construirGrafo(data), hoy);

  return (
    // El layout del árbol se come la pantalla y no hace scroll: aquí lo hace la página.
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <header className="mb-10">
          {/* El tema es el del sitio entero y no uno de esta página: aquí no hay «Qué se ve»
              donde vive en el lienzo, así que sale a la barra de arriba, junto a la salida. */}
          <div className="flex items-baseline justify-between gap-4 text-[13px] text-[var(--mut)]">
            <Link href="/arbol" className="hover:text-[var(--ink)]">
              ← el árbol
            </Link>
            <TemaBoton className="cursor-pointer hover:text-[var(--ink)]" />
          </div>
          <h1 className="mt-3 font-[family-name:var(--serif)] text-[34px] leading-tight">Stats del árbol</h1>
        </header>

        <Seccion titulo="Los próximos cumpleaños">
          <ul className="text-[14px]">
            {c.cumples.map((cumple) => (
              <li
                key={cumple.id}
                className="flex flex-col gap-0.5 border-b border-[var(--line)] py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span>{cumple.quien}</span>
                <span className="shrink-0 text-[13px] text-[var(--mut)]">
                  {cumple.dia} · cumple {cumple.cumple}
                </span>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="De un vistazo">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[var(--line)] sm:grid-cols-3">
            <Dato n={c.personas} de="personas" />
            <Dato n={c.uniones} de={c.rotas === 1 ? "uniones, una rota" : `uniones, ${c.rotas} rotas`} />
            <Dato n={c.generaciones.length} de="generaciones" />
            <Dato n={c.vivos} de="a los que el árbol da por vivos" />
            <Dato n={c.falta.conAlgo} de="con algo que preguntar" />
            <Dato n={c.homonimos} de="comparten nombre completo y año" />
          </div>
        </Seccion>

        <Seccion titulo="Los centros">
          <Tabla cabeceras={["Enlace", "Centrado en", "Despliega", "Alcanza"]}>
            {c.centros.map((centro) => (
              <tr key={centro.alias} className="border-t border-[var(--line)]">
                <Celda>
                  <Link href={`/arbol?centro=${centro.alias}`} className="text-[var(--acc)] hover:underline">
                    {centro.alias}
                  </Link>
                </Celda>
                <Celda>{centro.quien}</Celda>
                <Numero>{centro.desplegados}</Numero>
                <Numero>{centro.alcanzables}</Numero>
              </tr>
            ))}
          </Tabla>
        </Seccion>

        <Seccion titulo="Las ramas">
          <Tabla cabeceras={["Rama", "La estrena", "Gente", "En dos", "Por preguntar"]}>
            {c.ramas.map((rama) => (
              <tr key={rama.nombre} className="border-t border-[var(--line)]">
                <Celda>{rama.nombre}</Celda>
                <Celda>{rama.ancestro}</Celda>
                <Numero>{rama.gente}</Numero>
                <Numero apagado={rama.compartidos === 0}>{rama.compartidos}</Numero>
                <Numero apagado={rama.huecos === 0}>{rama.huecos}</Numero>
              </tr>
            ))}
          </Tabla>
        </Seccion>

        <Seccion titulo="Las generaciones">
          <Generaciones filas={c.generaciones} />
        </Seccion>

        <Seccion titulo="Lo que falta">
          {/* «Con algo que preguntar» no se repite aquí: ya está arriba, y la misma cifra dos
              veces con dos rótulos distintos se lee como dos cosas. Esto es su desglose. */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[var(--line)] sm:grid-cols-3">
            <Dato n={c.falta.sinNingunaFecha} de="sin ninguna fecha" />
            <Dato n={c.falta.sinApellido} de="sin ningún apellido" />
            <Dato n={c.falta.sinNombre} de="sin nombre" />
          </div>
        </Seccion>

        <Seccion titulo="Cómo se llama esta familia">
          <div className="grid gap-8 sm:grid-cols-2">
            <Ranking titulo="Nombres" filas={c.nombres} />
            <Ranking titulo="Apellidos" filas={c.apellidos} />
          </div>
        </Seccion>

        <Seccion titulo="Los extremos">
          <dl className="space-y-3 text-[14px]">
            {c.extremos.map((e) => (
              <Fila key={e.que} termino={e.que}>
                {e.quien}
              </Fila>
            ))}
            {c.cuarteles && (
              <Fila termino="Quien más atrás llega">
                {c.cuarteles.quienes}: {c.cuarteles.ascendientes} ascendientes
              </Fila>
            )}
          </dl>
          {/* Los apellidos no caben en la fila de arriba y no son un récord más: son la lista
              de la que sale el nombre de cualquiera de esta familia, y se leen de una vez. */}
          {c.cuarteles && <Cuarteles quienes={c.cuarteles.nombres} filas={c.cuarteles.tatarabuelos} />}
        </Seccion>
      </div>
    </div>
  );
}

const Vacio = () => (
  <div className="flex h-full items-center justify-center p-6 text-[14px] text-[var(--mut)]">
    No hay árbol sembrado del que dar cifras.
  </div>
);

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-[family-name:var(--serif)] text-[22px]">{titulo}</h2>
      {children}
    </section>
  );
}

/** Un número grande con lo que cuenta debajo: la rejilla se pinta con el hueco del grid. */
const Dato = ({ n, de }: { n: number; de: string }) => (
  <div className="bg-[var(--paper)] px-4 py-4">
    <div className="font-[family-name:var(--serif)] text-[30px] leading-none">{n}</div>
    <div className="mt-1.5 text-[12px] leading-snug text-[var(--mut)]">{de}</div>
  </div>
);

const Tabla = ({ cabeceras, children }: { cabeceras: string[]; children: React.ReactNode }) => (
  // Una tabla no se estrecha por debajo de lo que miden sus columnas: en un móvil se arrastra.
  <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
    <table className="w-full min-w-[26rem] border-collapse text-[14px]">
      <thead>
        <tr>
          {cabeceras.map((c, i) => (
            <th
              key={c}
              className={`pb-2 text-[12px] font-normal text-[var(--mut)] ${i < 2 ? "text-left" : "text-right"}`}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Celda = ({ children }: { children: React.ReactNode }) => <td className="py-2 pr-3">{children}</td>;

const Numero = ({ children, apagado }: { children: React.ReactNode; apagado?: boolean }) => (
  <td
    className={`py-2 pl-3 text-right font-[family-name:var(--mono)] text-[13px] ${apagado ? "text-[var(--mut)]" : ""}`}
  >
    {children}
  </td>
);

/** Barras contra la generación más ancha, que es la que llena la fila. */
const Generaciones = ({ filas }: { filas: Generacion[] }) => {
  const mayor = Math.max(...filas.map((x) => x.cuantos));
  return (
    <ul className="space-y-2">
      {filas.map((gen) => (
        <li key={gen.numero} className="flex items-center gap-3">
          <span className="w-6 shrink-0 text-right font-[family-name:var(--mono)] text-[12px] text-[var(--mut)]">
            {gen.numero}
          </span>
          <span className="h-4 rounded-sm bg-[var(--accb)]" style={{ width: `${(gen.cuantos / mayor) * 100}%` }} />
          <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--mut)]">{gen.cuantos}</span>
        </li>
      ))}
    </ul>
  );
};

const Ranking = ({ titulo, filas }: { titulo: string; filas: { texto: string; cuantos: number }[] }) => (
  <div>
    <h3 className="mb-2 text-[12px] text-[var(--mut)]">{titulo}</h3>
    <ul className="space-y-1.5 text-[14px]">
      {filas.map((f) => (
        <li key={f.texto} className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-1.5">
          <span>{f.texto}</span>
          <span className="font-[family-name:var(--mono)] text-[13px] text-[var(--mut)]">{f.cuantos}</span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Los dieciséis, en dos bloques que no son media lista y la otra media: en el orden en que se
 * leen los apellidos los ocho primeros son ellos y los ocho segundos ellas, así que el de la
 * izquierda son los maridos, el de la derecha las mujeres y cada línea un matrimonio. **Se
 * llenan por columnas** —de ahí el `slice`, y no un grid que reparte por filas—, que además es
 * el orden en que los treinta y dos apellidos se leen seguidos.
 *
 * Los dos apellidos van en columna propia y pegados a la derecha, con el nombre apagado en la
 * otra punta: se viene a leer los apellidos en vertical, y el nombre solo dice de quién es cada
 * par. En tinta lo que traía el documento y apagado lo que se deduce subiendo; el sitio vacío
 * lleva signos de pregunta y no la cursiva de lo que no consta, que en esta fuente separa los
 * dos signos tanto que dejan de leerse como uno.
 */
const Cuarteles = ({ quienes, filas }: { quienes: string; filas: Tatarabuelo[] }) => {
  const mitad = Math.ceil(filas.length / 2);
  return (
    <div className="mt-7">
      <h3 className="mb-2 text-[12px] text-[var(--mut)]">
        Los apellidos de los {filas.length} tatarabuelos de {quienes}
      </h3>
      {/* En móvil no hay dos bloques sino una lista, y entonces el grid que manda es el de
          fuera: los bloques se vuelven `contents` para que las dieciséis filas repartan las
          mismas tres columnas. Cada uno con el suyo, las columnas de arriba no caen donde las
          de abajo. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 text-[14px] sm:grid-cols-2 sm:gap-x-10">
        {[filas.slice(0, mitad), filas.slice(mitad)].map((bloque, i) => (
          <div key={i} className="contents sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4">
            {bloque.map((t, j) => (
              <div key={j} className="col-span-3 grid grid-cols-subgrid border-b border-[var(--line)] py-1.5">
                <span className="truncate text-[var(--mut)]">{t.quien ?? "¿?"}</span>
                {[0, 1].map((sitio) => (
                  <Apellido key={sitio} texto={t.apellidos[sitio]} escrito={sitio < t.escritos} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const Apellido = ({ texto, escrito }: { texto?: string; escrito: boolean }) =>
  texto === undefined ? (
    <span className="text-[var(--mut)]">¿?</span>
  ) : (
    <span className={escrito ? "" : "text-[var(--mut)]"}>{texto}</span>
  );

const Fila = ({ termino, children }: { termino: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 border-b border-[var(--line)] pb-3 sm:flex-row sm:justify-between sm:gap-6">
    <dt className="text-[var(--mut)]">{termino}</dt>
    <dd className="sm:text-right">{children}</dd>
  </div>
);
