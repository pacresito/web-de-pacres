// Utilidades compartidas de front.

// Etiqueta de versión de la barra de la shell. Fuente única: la muestran tanto la
// chrome de cv/lab/designs (Chrome.tsx) como la de los experimentos (TerminalShell.tsx).
export const SHELL_VERSION = "v1.0.0 · zsh";

/** Edad en años cumplidos a partir de la fecha de nacimiento. */
export function calcularEdad(nacimiento: Date): number {
  const hoy = new Date();
  const cumple = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  return hoy.getFullYear() - nacimiento.getFullYear() - (hoy < cumple ? 1 : 0);
}

// Altura de la ventana restaurada de un destino. Una página la publica al montarse
// (saveRestoredHeight) y la animación de "volver" de TerminalShell la lee
// (readRestoredHeight) para restaurarse a esa misma altura, sin salto.
const RESTORED_HEIGHT_KEY = "pacres:restored-height:";

export function saveRestoredHeight(path: string, px: number): void {
  try {
    sessionStorage.setItem(RESTORED_HEIGHT_KEY + path, String(px));
  } catch {
    // sessionStorage puede no estar disponible (SSR, modo restringido): sin guardar.
  }
}

export function readRestoredHeight(path: string): number | null {
  try {
    const px = sessionStorage.getItem(RESTORED_HEIGHT_KEY + path);
    return px ? Number(px) : null;
  } catch {
    return null;
  }
}
