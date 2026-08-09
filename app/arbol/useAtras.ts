"use client";

// Volver atrás cierra lo que haya abierto encima del árbol antes de salir de la página. En
// un móvil el panel abierto es lo último que se ha hecho, y salir del árbol por haberlo
// cerrado es perder el sitio entero. Vale igual en Android —botón o gesto— y en iOS
// —deslizar desde el borde—: los dos disparan `popstate`, que es lo único que se escucha.

import { useEffect, useRef } from "react";

/**
 * Cada capa abierta empuja una entrada de historial y volver consume la de arriba, así que
 * se cierra de una en una y en el orden en que se abrieron. Cerrar desde la interfaz
 * devuelve su entrada —dejarla puesta haría que el primer atrás no hiciera nada— y el
 * `popstate` de esa devolución no cuenta como gesto.
 */
export function useAtras(capas: number, cerrarUna: () => void) {
  const puestas = useRef(0);
  /** Devoluciones en vuelo: su `popstate` es nuestro, no del dedo. */
  const devueltas = useRef(0);
  // El cierre se guarda en un ref para que el oyente se ponga una vez y siga viendo el
  // estado de ahora: mira lo que hay abierto, así que cambia en cada render.
  const cerrar = useRef(cerrarUna);
  useEffect(() => {
    cerrar.current = cerrarUna;
  });

  useEffect(() => {
    const alVolver = () => {
      if (devueltas.current > 0) devueltas.current -= 1;
      else if (puestas.current > 0) {
        puestas.current -= 1;
        cerrar.current();
      }
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  useEffect(() => {
    // Sin url, Next se limita a copiar su estado interno a la entrada nueva: sin él, su
    // propio manejador de `popstate` recarga la página al llegar a ella.
    while (puestas.current < capas) history.pushState({ arbol: ++puestas.current }, "");
    if (puestas.current > capas) {
      const sobran = puestas.current - capas;
      puestas.current = capas;
      devueltas.current += sobran;
      history.go(-sobran);
    }
  }, [capas]);
}
