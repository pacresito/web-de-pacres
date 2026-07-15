"use client";

import { useState } from "react";
import Image from "next/image";
import type { ReactNode } from "react";

// Portada de la ficha: la foto grande y el título. Es cliente (y no la ficha entera)
// solo por el estado de qué foto se está mirando: al pulsar una miniatura pasa a
// grande. La foto grande son dos elementos excluyentes por media query — el hero
// full-bleed en móvil y `galeria-principal` en escritorio —, así que ambos leen
// `activa`. La cabecera móvil va aquí dentro porque en móvil se pinta entre el hero
// y las miniaturas, y sacarla la dejaría debajo de la tira.
type Props = {
  fotos: string[];
  nombre: string;
  queEs: string;
  overlay: ReactNode; // «‹» y badges que solapan el hero en móvil
};

export default function Portada({ fotos, nombre, queEs, overlay }: Props) {
  const [activa, setActiva] = useState(0);
  const foto = fotos[activa];
  const sinFoto = <div className="fr-s4-hero-fallback"><span>foto en camino</span></div>;

  return (
    <>
      <div className="fr-s4-hero--movil">
        <div className="fr-s4-hero-img">
          {foto ? <Image src={foto} alt={nombre} fill sizes="100vw" priority /> : sinFoto}
          {overlay}
        </div>
      </div>
      <div className="fr-s4-cabecera--movil">
        <h1 className="fr-s4-h1">{nombre}</h1>
        <p className="fr-s4-lead">{queEs}</p>
      </div>

      <div className="fr-s4-galeria-principal">
        {foto ? <Image src={foto} alt={nombre} fill sizes="(max-width: 900px) 100vw, 760px" /> : sinFoto}
      </div>
      {fotos.length > 1 && (
        <div className="fr-s4-thumbs">
          {fotos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`fr-s4-thumb${i === activa ? " fr-s4-thumb--activa" : ""}`}
              aria-label={`Foto ${i + 1} de ${fotos.length}`}
              aria-current={i === activa}
              onClick={() => setActiva(i)}
            >
              <Image src={src} alt="" fill sizes="104px" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
