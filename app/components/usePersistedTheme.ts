"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "pacres-theme";

// Tema scoped persistido en localStorage. Default claro; en mount restaura la preferencia
// guardada (localStorage no existe en SSR). El setter persiste al cambiar. Centraliza el
// estado + la clave que estaban copiados en TerminalShell y ChromeWindow — dos copias que
// ya habían divergido. Quien lo use pone el `theme` como data-theme en su wrapper.
export function usePersistedTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount: lectura única de preferencia
    if (localStorage.getItem(STORAGE_KEY) === "dark") setTheme("dark");
  }, []);

  const setAndPersist = (t: Theme) => {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  return [theme, setAndPersist];
}
