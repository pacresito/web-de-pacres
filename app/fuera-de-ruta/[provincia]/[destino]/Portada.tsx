"use client";

import { useState } from "react";
import Image from "next/image";
import type { ReactNode } from "react";
import { lineaCredito, type Credito } from "@/lib/fuera-de-ruta/creditos";

// Portada de la ficha: la foto grande y el título. Es cliente (y no la ficha entera)
// solo por el estado de qué foto se está mirando: al pulsar una miniatura pasa a
// grande. La foto grande son dos elementos excluyentes por media query — el hero
// full-bleed en móvil y `galeria-principal` en escritorio —, así que ambos leen
// `activa`. La cabecera móvil va aquí dentro porque en móvil se pinta entre el hero
// y las miniaturas, y sacarla la dejaría debajo de la tira.
type Props = {
  fotos: string[];
  creditos: (Credito | undefined)[]; // en paralelo a `fotos`; hueco = foto de Cris
  nombre: string;
  queEs: string;
  overlay: ReactNode; // «‹» y badges que solapan el hero en móvil
};

export default function Portada({ fotos, creditos, nombre, queEs, overlay }: Props) {
  const [activa, setActiva] = useState(0);
  const foto = fotos[activa];
  const credito = creditos[activa];
  const sinFoto = <div className="fr-s4-hero-fallback"><span>foto en camino</span></div>;

  // El crédito acompaña a la foto que se está mirando, así que va bajo cada una de las
  // dos grandes — y son excluyentes por media query, igual que ellas.
  const pieDeFoto = (clase: string) =>
    credito && (
      <p className={`fr-s4-credito ${clase}`}>
        Foto:{" "}
        {credito.url
          ? <a href={credito.url} target="_blank" rel="noreferrer">{lineaCredito(credito)} ↗</a>
          : lineaCredito(credito)}
      </p>
    );

  return (
    <>
      {/* El «‹» y los badges van fuera de `hero-img`: su `overflow: hidden` recortaba
          por la mitad los badges, que asoman por debajo del borde de la foto. */}
      <div className="fr-s4-hero--movil">
        <div className="fr-s4-hero-img">
          {foto ? <Image src={foto} alt={nombre} fill sizes="100vw" priority /> : sinFoto}
        </div>
        {overlay}
      </div>
      {pieDeFoto("fr-s4-credito--movil")}
      <div className="fr-s4-cabecera--movil">
        <h1 className="fr-s4-h1">{nombre}</h1>
        <p className="fr-s4-lead">{queEs}</p>
      </div>

      <div className="fr-s4-galeria-principal">
        {foto ? <Image src={foto} alt={nombre} fill sizes="(max-width: 900px) 100vw, 760px" /> : sinFoto}
      </div>
      {pieDeFoto("fr-s4-credito--desktop")}
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
