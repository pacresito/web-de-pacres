"use client";

import type { Bloque, Campo, Pregunta, Respuestas } from "@/lib/fuera-de-ruta/cuestionario/preguntas";
import { uno, varios } from "@/lib/fuera-de-ruta/cuestionario/preguntas";
import { resumen as resumenPerfil } from "@/lib/fuera-de-ruta/cuestionario/resumen";

// Los tres pasos del cuestionario de Cris (Fase C): el viajero, el viaje y el resumen
// editable. Solo pintan y avisan del cambio — quién guarda las respuestas y qué paso toca
// lo decide CrearViaje.

const fechaFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const legibleFecha = (iso?: string) => (iso ? fechaFmt.format(new Date(`${iso}T00:00`)) : "Elegir fecha");

export type AlCambiar = (campo: Campo, valor: string | string[] | undefined) => void;

// ------------------------------------------------------------ Un paso = un bloque
export function PasoBloque({ bloque, numero, respuestas, onCambiar, atras, onSiguiente, textoSiguiente }: {
  bloque: Bloque;
  numero: number;
  respuestas: Respuestas;
  onCambiar: AlCambiar;
  atras: React.ReactNode;
  onSiguiente: () => void;
  textoSiguiente: string;
}) {
  const visibles = bloque.preguntas.filter((p) => !p.visible || p.visible(respuestas));
  return (
    <div className="fr-s5-form">
      <div className="fr-s5-form-head">
        {atras}
        <h1 className="fr-s5-titulo">{bloque.titulo}</h1>
        <span className="fr-mono">paso {numero} de 3</span>
      </div>

      <div className="fr-s5-form-card fr-tarjeta">
        <p className="fr-cq-intro">{bloque.intro}</p>
        {visibles.map((p) => (
          <PreguntaCampo key={p.campo} pregunta={p} respuestas={respuestas} onCambiar={onCambiar} />
        ))}
      </div>

      <div className="fr-s5-cta-barra">
        <button className="fr-btn fr-btn--primario fr-s5-montar" onClick={onSiguiente}>{textoSiguiente}</button>
      </div>
    </div>
  );
}

// Una pregunta: chips de opciones (única o multi con tope) o el selector de fecha.
function PreguntaCampo({ pregunta: p, respuestas: r, onCambiar }: {
  pregunta: Pregunta;
  respuestas: Respuestas;
  onCambiar: AlCambiar;
}) {
  return (
    <div className="fr-s5-preg">
      <span className="fr-s5-preg-t">{p.titulo}</span>
      {p.ayuda && <span className="fr-s5-preg-nota">{p.ayuda}</span>}

      {p.control === "fecha" ? (
        <label className="fr-s5-fecha">
          <span>{legibleFecha(uno(r, "fecha"))}</span>
          <input type="date" value={uno(r, "fecha") ?? ""} onChange={(e) => onCambiar("fecha", e.target.value || undefined)} />
        </label>
      ) : (
        <ChipsOpciones pregunta={p} respuestas={r} onCambiar={onCambiar} />
      )}
    </div>
  );
}

function ChipsOpciones({ pregunta: p, respuestas: r, onCambiar }: {
  pregunta: Pregunta;
  respuestas: Respuestas;
  onCambiar: AlCambiar;
}) {
  const seleccion = p.multi ? varios(r, p.campo) : ([uno(r, p.campo)].filter(Boolean) as string[]);
  const tope = !!(p.multi && p.max && seleccion.length >= p.max);

  const toggle = (valor: string) => {
    if (!p.multi) {
      onCambiar(p.campo, seleccion[0] === valor ? undefined : valor);
      return;
    }
    const activo = seleccion.includes(valor);
    if (!activo && tope) return;
    onCambiar(p.campo, activo ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]);
  };

  return (
    <div className="fr-s5-chips">
      {p.opciones!.map((o) => {
        const on = seleccion.includes(o.valor);
        return (
          <button
            key={o.valor}
            className={`fr-chip${on ? " fr-chip--activo" : ""}`}
            disabled={!on && tope}
            aria-pressed={on}
            onClick={() => toggle(o.valor)}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ Resumen editable
export function Resumen({ respuestas, onEditar, onEmpezar, onAtras }: {
  respuestas: Respuestas;
  onEditar: () => void;
  onEmpezar: () => void;
  onAtras: () => void;
}) {
  const lineas = resumenPerfil(respuestas);
  return (
    <div className="fr-s5-form">
      <div className="fr-s5-form-head">
        <button className="fr-s5-atras" onClick={onAtras} aria-label="Volver">‹</button>
        <h1 className="fr-s5-titulo">Así es tu viaje</h1>
        <span className="fr-mono">paso 3 de 3</span>
      </div>

      <div className="fr-s5-form-card fr-tarjeta">
        <p className="fr-cq-intro">
          Esto es lo que vamos a preparar. Repásalo y, si algo no encaja, edítalo antes de empezar.
        </p>
        {lineas.length > 0 ? (
          <ul className="fr-cq-resumen">
            {lineas.map((l) => <li key={l}>{l}</li>)}
          </ul>
        ) : (
          <p className="fr-cq-vacio">No has marcado preferencias: te propondremos lo mejor de la zona sin filtrar nada.</p>
        )}
        <button className="fr-s5-link" onClick={onEditar}>✏️ Quiero modificar alguna respuesta</button>
      </div>

      <div className="fr-s5-cta-barra">
        <button className="fr-btn fr-btn--primario fr-s5-montar" onClick={onEmpezar}>
          ✔ Empezar a preparar mi viaje
        </button>
      </div>
    </div>
  );
}
