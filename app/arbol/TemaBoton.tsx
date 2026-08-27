"use client";

// El interruptor de tema, con la paleta del árbol pero el mismo estado que el resto del
// sitio: quien lo cambia aquí lo cambia en /lab y en la home. **Sin el icono de luna y sol
// que lleva el del resto del sitio**: aquí vive en un pie de tres palabras, y un dibujo al
// lado de una de ellas la subía de rango sin decir nada que el texto no diga ya.

import { usePersistedTheme } from "../components/usePersistedTheme";

export default function TemaBoton({ className }: { className?: string }) {
  const [tema, setTema] = usePersistedTheme();
  const siguiente = tema === "dark" ? "light" : "dark";
  // El botón dice a qué tema lleva, no en cuál está: es lo que va a pasar al pulsarlo, y
  // es lo mismo que ya decían el título y la etiqueta cuando solo era un icono.
  const texto = siguiente === "dark" ? "Tema oscuro" : "Tema claro";
  return (
    <button
      type="button"
      onClick={() => setTema(siguiente)}
      title={texto}
      aria-label={`Activar ${texto.toLowerCase()}`}
      className={className}
    >
      {texto}
    </button>
  );
}
