"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

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
