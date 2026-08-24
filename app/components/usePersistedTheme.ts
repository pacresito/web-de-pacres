"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

// OJO: duplicada como string crudo en el script inline de app/layout.tsx (que corre antes
// del bundle y no puede importar esta constante). Si cambias la clave, cámbiala en los dos sitios.
const STORAGE_KEY = "pacres-theme";

// Tema persistido en localStorage y reflejado en `data-theme` del <html>. El destello al
// recargar (FOUC) lo mata un script inline en el root layout, que aplica el atributo en
// <html> ANTES del primer pintado leyendo localStorage; ahí los tokens --t-* cascadean ya
// en oscuro. Este hook solo gobierna el estado de React: arranca en claro (igual que el
// SSR, sin mismatch) y en mount se sincroniza con lo que el script dejó en <html>. El
// setter vira el atributo de <html> + persiste. Centraliza estado + clave (antes copiados
// en TerminalShell y ChromeWindow). El fondo lo pinta el CSS desde <html>, no React.
export function usePersistedTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount: sincroniza con el atributo que puso el script
    if (document.documentElement.dataset.theme === "dark") setTheme("dark");
  }, []);

  const setAndPersist = (t: Theme) => {
    setTheme(t);
    if (t === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem(STORAGE_KEY, t);
  };

  return [theme, setAndPersist];
}

/**
 * Qué tema está puesto ahora mismo, de solo lectura y **al día**: observa el atributo de
 * <html>, así que se entera del toggle lo pinte quien lo pinte. Es para lo que no se resuelve
 * con tokens CSS —una imagen cuyo color **es** el dato y que por eso viene en dos archivos—;
 * todo lo demás vira solo con la cascada y no necesita pasar por React.
 *
 * `null` hasta el mount: en el servidor no hay tema, y arrancar en claro descargaría el archivo
 * equivocado para quien está en oscuro. Quien lo use pinta lo que sea sin imagen hasta entonces.
 */
export function useTema(): Theme | null {
  const [tema, setTema] = useState<Theme | null>(null);

  useEffect(() => {
    const lee = () => setTema(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    lee();
    const observador = new MutationObserver(lee);
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observador.disconnect();
  }, []);

  return tema;
}
