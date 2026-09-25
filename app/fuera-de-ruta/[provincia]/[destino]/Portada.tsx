"use client";

import { useState } from "react";
import Image from "next/image";
import type { ReactNode } from "react";
import { lineaCredito, type Credito } from "@/lib/fuera-de-ruta/creditos";

// Fotos y título de la ficha; es cliente solo por la foto activa. La foto grande son dos
// elementos excluyentes por media query (hero en móvil, galería en escritorio). La
// cabecera móvil vive aquí porque se pinta entre el hero y las miniaturas.
type Props = {
  fotos: string[];
  creditos: (Credito | undefined)[]; // paralelo a `fotos`
  nombre: string;
  queEs: string;
  overlay: ReactNode; // lo que solapa el hero en móvil
};

export default function Portada({ fotos, creditos, nombre, queEs, overlay }: Props) {
  const [activa, setActiva] = useState(0);
  const foto = fotos[activa];
  const credito = creditos[activa];
  const sinFoto = <div className="fr-s4-hero-fallback"><span>foto en camino</span></div>;

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
      {/* El overlay va fuera de `hero-img`, cuyo overflow recortaría los badges. */}
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
