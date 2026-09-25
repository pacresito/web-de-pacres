"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Destino } from "@/lib/fuera-de-ruta/tipos";
import { desnivel, rango } from "@/lib/fuera-de-ruta/formato";

export function Tarjeta({ destino: d, zona, num, href, activa, onActivo }: {
  destino: Destino;
  zona: string;
  num: number;
  href: string;
  activa: boolean;
  onActivo: (slug: string | null) => void;
}) {
  // Solo lo que distingue: el "sí" de niños o perros se repite en casi todas y no ayuda
  // a elegir. El baño va de sticker.
  const chips: { texto: string; no?: boolean }[] = [];
  if (d.distanciaKm) chips.push({ texto: rango(d.distanciaKm, "km") });
  if (d.desnivelM) chips.push({ texto: desnivel(d.desnivelM) });
  if (d.ninos === false) chips.push({ texto: "niños no", no: true });
  if (d.perros === false) chips.push({ texto: "perros no", no: true });
  if (d.bano === false) chips.push({ texto: "baño no", no: true });

  return (
    <Link
      href={href}
      id={`fr-card-${d.slug}`}
      className={`fr-s3-card${activa ? " fr-s3-card--activa" : ""}`}
      onMouseEnter={() => onActivo(d.slug)}
      onMouseLeave={() => onActivo(null)}
    >
      <div className="fr-s3-card-foto">
        {d.imagen ? (
          <div className="fr-s3-card-marco">
            <Image src={d.imagen} alt={d.nombre} fill sizes="(max-width: 900px) 100vw, 330px" />
          </div>
        ) : (
          <div className="fr-s3-card-fallback">
            <i className="fr-s3-foto-pronto">foto en camino</i>
            <span>{d.nombre}</span>
          </div>
        )}
        <span className={`fr-s3-pin-num${activa ? " fr-s3-pin-num--activo" : ""}`}>{num}</span>
        {d.bano && <span className="fr-s3-bano">te puedes bañar</span>}
      </div>
      <div className="fr-s3-card-body">
        <span className="fr-s3-card-meta">{zona} · {d.tipo}</span>
        <span className="fr-s3-card-nombre">{d.nombre}</span>
        {chips.length > 0 && (
          <span className="fr-s3-card-chips">
            {chips.slice(0, 4).map((c) => (
              <span key={c.texto} className={`fr-s3-dato${c.no ? " fr-s3-dato--no" : ""}`}>{c.texto}</span>
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}

// Lista móvil. Mismo criterio de chips, pero el baño va en chip: no hay sticker.
export function TarjetaCompacta({ destino: d, zona, num, href }: { destino: Destino; zona: string; num: number; href: string }) {
  const chips: { texto: string; tono?: "si" | "no" }[] = [];
  if (d.distanciaKm) chips.push({ texto: rango(d.distanciaKm, "km") });
  if (d.bano !== undefined) chips.push({ texto: `baño ${d.bano ? "sí" : "no"}`, tono: d.bano ? "si" : "no" });
  if (d.ninos === false) chips.push({ texto: "niños no", tono: "no" });
  if (d.perros === false) chips.push({ texto: "perros no", tono: "no" });
  if (d.desnivelM) chips.push({ texto: desnivel(d.desnivelM) });

  return (
    <Link href={href} className="fr-m3-card">
      <div className={`fr-m3-card-foto${d.imagen ? "" : " fr-m3-card-foto--sin"}`}>
        {d.imagen && <Image src={d.imagen} alt={d.nombre} fill sizes="112px" />}
        <span className="fr-m3-card-pin">{num}</span>
      </div>
      <div className="fr-m3-card-body">
        <span className="fr-m3-card-meta">{zona} · {d.tipo}</span>
        <span className="fr-m3-card-nombre">{d.nombre}</span>
        {chips.length > 0 && (
          <span className="fr-m3-card-chips">
            {chips.slice(0, 3).map((c) => (
              <span key={c.texto} className={`fr-m3-dato${c.tono ? ` fr-m3-dato--${c.tono}` : ""}`}>{c.texto}</span>
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}

// Carrusel del modo mapa, sincronizado con los pins en los dos sentidos. El umbral de
// "ya centrada" evita que el scroll y el pin activo se persigan.
export function CarruselMovil({ destinos, activo, onActivo, hrefDestino }: {
  destinos: Destino[];
  activo: string | null;
  onActivo: (slug: string | null) => void;
  hrefDestino: (slug: string) => string;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const ultimo = useRef<string | null>(activo);

  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const cont = pista.current;
      if (!cont) return;
      const centro = cont.scrollLeft + cont.clientWidth / 2;
      let slug: string | null = null;
      let min = Infinity;
      cont.querySelectorAll<HTMLElement>("[data-slug]").forEach((el) => {
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - centro);
        if (d < min) { min = d; slug = el.dataset.slug ?? null; }
      });
      if (slug && slug !== ultimo.current) { ultimo.current = slug; onActivo(slug); }
    });
  };

  useEffect(() => {
    ultimo.current = activo;
    const cont = pista.current;
    if (!cont || !activo) return;
    const el = cont.querySelector<HTMLElement>(`[data-slug="${activo}"]`);
    if (!el) return;
    if (Math.abs(cont.scrollLeft + cont.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2)) < 40) return;
    // Sin smooth: con scroll-snap mandatory, Chromium cancela el scroll suave programático.
    cont.scrollTo({ left: el.offsetLeft - (cont.clientWidth - el.offsetWidth) / 2 });
  }, [activo]);

  return (
    <div className="fr-m3-pista" ref={pista} onScroll={onScroll}>
      {destinos.map((d, i) => (
        <Link key={d.slug} href={hrefDestino(d.slug)} data-slug={d.slug}
          className={`fr-m3-mini${activo === d.slug ? " fr-m3-mini--activa" : ""}`}>
          <div className={`fr-m3-mini-foto${d.imagen ? "" : " fr-m3-mini-foto--sin"}`}>
            {d.imagen && <Image src={d.imagen} alt={d.nombre} fill sizes="88px" />}
            <span className="fr-m3-mini-pin">{i + 1}</span>
          </div>
          <div className="fr-m3-mini-body">
            <span className="fr-m3-mini-meta">{d.tipo}{d.bano !== undefined ? ` · baño ${d.bano ? "sí" : "no"}` : ""}</span>
            <span className="fr-m3-mini-nombre">{d.nombre}</span>
            <span className="fr-m3-mini-stat">{miniStat(d)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function miniStat(d: Destino): string {
  const p: string[] = [];
  if (d.distanciaKm) p.push(rango(d.distanciaKm, "km"));
  if (d.desnivelM) p.push(desnivel(d.desnivelM));
  return p.join(" · ");
}
