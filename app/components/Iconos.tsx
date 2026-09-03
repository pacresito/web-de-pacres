/** Iconos de la chrome del laboratorio: los comparten los juegos y las apps, y antes vivían
 *  copiados en cada página. `size` acompaña al texto de cada HUD, que no todos son iguales. */

export function IconoRanking({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 17V11" /><path d="M10 17V4" /><path d="M16 17V8" />
    </svg>
  );
}

/** `salir` da la variante con las esquinas hacia dentro (ya está en pantalla completa). */
export function IconoPantallaCompleta({ size = 20, salir = false }: { size?: number; salir?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {salir ? (
        <><path d="M3 8h5V3" /><path d="M17 8h-5V3" /><path d="M3 12h5v5" /><path d="M17 12h-5v5" /></>
      ) : (
        <><path d="M8 3H3v5" /><path d="M12 3h5v5" /><path d="M3 12v5h5" /><path d="M17 12v5h-5" /></>
      )}
    </svg>
  );
}
