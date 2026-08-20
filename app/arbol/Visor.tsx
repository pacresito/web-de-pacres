"use client";

// La foto ocupando la ficha, con lo justo para saber a quién se está mirando: el nombre, lo
// que consta de su vida y en qué momento de ella se tomó. Nada más, porque lo que se ha
// venido a hacer aquí es mirar una cara.
//
// **El marco es cuadrado aunque la foto no lo sea**, y el recorte es solo de pantalla: quien
// la descargue se lleva el archivo entero. Y **se monta vacío**: el cuadrado gris se dibuja
// en el primer fotograma y la foto entra fundiéndose cuando llega, así que la apertura no
// espera a la red. Un indicador de carga dentro de un marco que ya está dibujado es ruido
// —con la foto en caché ni se vería—.

import { useState } from "react";
import type { Ficha } from "@/lib/arbol/ficha";
import Fotos from "./Fotos";
import { Titulo } from "./Identidad";

export default function Visor({
  datos,
  clave,
  onFoto,
}: {
  datos: Ficha;
  /** Cuál de las suyas se está mirando. */
  clave: string;
  onFoto: (clave: string) => void;
}) {
  const [cargadas, setCargadas] = useState<ReadonlySet<string>>(() => new Set());
  const actual = datos.fotos.find((f) => f.clave === clave) ?? datos.fotos[0];

  // Se monta la que se mira y las que ya cargaron; las demás, ni se piden. Así entrar al
  // visor no se trae las otras dos, y al cambiar de foto **la anterior se queda debajo**
  // hasta que la nueva termine: la de arriba entra fundiéndose encima de ella y el marco no
  // parpadea en gris entre una y otra. Pasar de «con 20» a «con 40» es una cara envejeciendo
  // en el sitio, que es la gracia de tener tres.
  const montadas = datos.fotos.filter((f) => f.clave === clave || cargadas.has(f.clave));

  return (
    <div className="entra flex flex-col">
      <p className="font-[family-name:var(--serif)] text-[22px] leading-[1.1] tracking-[-0.01em]">
        <Titulo trozos={datos.titulo} />
      </p>
      <p className="mt-1 font-[family-name:var(--mono)] text-[12.5px] text-[var(--mut)]">{datos.datos}</p>

      <div className="relative mt-3.5 aspect-square w-full overflow-hidden rounded-[14px] bg-[var(--soft)]">
        {montadas.map((f) => (
          // next/image no vale aquí: optimiza pidiendo la imagen desde el servidor, y esta
          // sale de una ruta con cookie que ese fetch no lleva. Además ya viene al tamaño.
          // eslint-disable-next-line @next/next/no-img-element -- la sirve /arbol/api/foto, tras la sesión
          <img
            key={f.clave}
            src={f.url}
            alt={`Foto ${f.rotulo}`}
            onLoad={() => setCargadas((s) => new Set(s).add(f.clave))}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              cargadas.has(f.clave) ? "opacity-100" : "opacity-0"
            } ${f.clave === clave ? "z-[2]" : "z-[1]"}`}
          />
        ))}
      </div>

      {/* Con una sola foto queda su rótulo a secas, que es lo que hay que decir cuando no
          hay elección; con tres, en cuál de ellas se está. */}
      <p className="mt-3 text-[12.5px] leading-[1.45]">
        <Fotos fotos={datos.fotos} actual={actual.clave} onFoto={onFoto} />
      </p>
    </div>
  );
}
