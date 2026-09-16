"use client";

// La foto entera, ocupando la pantalla, con un rótulo sobre cada cara que está en el árbol.
// Es la otra mitad del marco cuadrado de la ficha: allí se mira a uno, aquí se reconoce a
// todos. **Tocar una cara abre su ficha con la foto puesta**, así que una foto de 1962 es
// una manera de andar por el árbol — la única que no pasa por un nombre.
//
// **El fondo es negro y no el papel del sitio.** Una foto suelta sobre blanco parece un
// documento; sobre negro es lo que es, una foto, y el gris del papel viejo deja de leerse
// como suciedad. Es la única superficie del árbol que no respeta el tema, y por eso también
// es la única que se cierra tocando donde sea.
//
// **No lleva instrucciones.** Un recuadro con un nombre encima ya dice que se puede tocar, y
// una foto abierta a pantalla completa se cierra por fuera en cualquier pantalla del mundo:
// escribirlo debajo es enseñar a usar lo que no hay que aprender.
//
// **Los rótulos llevan solo el nombre de casa**: con diez caras, el nombre entero de cada
// una taparía a los de al lado. El completo, con la edad, aparece en el que se señala.
//
// **Y en cuanto la foto sale pequeña se apagan todos menos ese.** Una foto apaisada en un
// móvil de pie no llega a 400 px, y diez pastillas ahí dentro tapan justo lo que se ha
// abierto a ver; los recuadros solos siguen diciendo a quién se puede tocar.

import { useEffect, useRef, useState } from "react";
import type { Retratado } from "@/lib/arbol/retratados";

export default function Ampliada({
  url,
  titulo,
  gente,
  mirando,
  onPersona,
  onCerrar,
}: {
  url: string;
  /** Cómo se llama la foto y de cuándo es: «La Venta de La Paloma · 1962». */
  titulo: string;
  gente: Retratado[];
  /** Desde cuya ficha se ha abierto: el suyo va rotulado entero desde el principio. */
  mirando?: string;
  onPersona: (id: string) => void;
  onCerrar: () => void;
}) {
  // El tamaño al que ha quedado la foto, que es lo que convierte las fracciones del recuadro
  // en píxeles. **Se mide, no se deduce**: `object-contain` decide si sobra ancho o alto, y
  // los recuadros van en fracciones del ancho de la foto, no del hueco donde cabe.
  const foto = useRef<HTMLImageElement>(null);
  const [caja, setCaja] = useState<{ w: number; h: number } | null>(null);
  const [señalado, setSeñalado] = useState<string | undefined>(mirando);
  // Cuando la foto no llega a los 480 px, los rótulos pequeños se solapan entre ellos: se
  // apagan y se deja solo el del que se señala.
  const apretada = !!caja && caja.w < 480 && gente.length > 3;

  useEffect(() => {
    const medir = () => {
      const img = foto.current;
      if (img?.clientWidth) setCaja({ w: img.clientWidth, h: img.clientHeight });
    };
    medir();
    // El observador de tamaño no dispara con la pestaña oculta y el de ventana sí: aquí lo
    // único que cambia el tamaño de la foto es la ventana.
    window.addEventListener("resize", medir);
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("keydown", alTeclear);
    };
  }, [onCerrar]);

  return (
    <div
      className="entra fixed inset-0 z-50 flex flex-col bg-[#0b0b0d]/97"
      onClick={onCerrar}
      role="dialog"
      aria-label={titulo}
    >
      <div className="flex shrink-0 items-start gap-3 px-4 pt-3 text-[#e9e7e3]">
        <p className="min-w-0 flex-1 font-[family-name:var(--serif)] text-[17px] leading-tight">{titulo}</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar la foto"
          className="-mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] text-[#9d9b97] hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* El hueco es todo lo que queda, y la foto crece hasta llenarlo por donde toque. El
          contenedor se encoge a la foto para que los recuadros midan desde su borde y no
          desde el del hueco. */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element -- la sirve /arbol/api/foto, tras la sesión */}
          <img
            ref={foto}
            src={url}
            alt={titulo}
            onLoad={(e) => setCaja({ w: e.currentTarget.clientWidth, h: e.currentTarget.clientHeight })}
            className="block max-h-[calc(100svh-76px)] max-w-full object-contain"
          />

          {caja &&
            gente.map((r) => {
              // Cuánto sitio hay por cara: lo que decide si un nombre cabe o estorba.
              const lado = r.recuadro.lado * caja.w;
              const abierto = señalado === r.id;
              // A quien está pegado al borde de abajo —cortado por la foto— el rótulo se le
              // mete dentro: colgado se saldría de la foto y acabaría sobre el fondo.
              const pegado = (r.recuadro.y + r.recuadro.lado) * caja.w > caja.h - 26;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onPersona(r.id)}
                  onPointerEnter={() => setSeñalado(r.id)}
                  onPointerLeave={() => setSeñalado(mirando)}
                  onFocus={() => setSeñalado(r.id)}
                  onBlur={() => setSeñalado(mirando)}
                  style={{
                    left: r.recuadro.x * caja.w,
                    top: r.recuadro.y * caja.w,
                    width: lado,
                    height: lado,
                  }}
                  className={`absolute rounded-[6px] border transition-colors ${
                    abierto ? "border-white/85 bg-white/10" : "border-white/35 hover:border-white/85"
                  }`}
                >
                  {/* El rótulo cuelga por debajo de la cara y se centra en ella. Al que se
                      señala se le abre el nombre entero con su edad, que es lo que se ha
                      venido a saber; al resto le basta el de casa para no ser un recuadro. */}
                  <span
                    className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] leading-[1.5] ${
                      pegado ? "bottom-1" : "top-full mt-1"
                    } ${abierto ? "z-10 bg-white text-[#17181b]" : "bg-black/55 text-white/90"}`}
                  >
                    {abierto ? `${r.nombre}${r.edad ? ` · ${r.edad}` : ""}` : apretada ? "" : r.corto}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

    </div>
  );
}
