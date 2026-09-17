"use client";

import { useEffect, useRef, useState } from "react";
import { RASGOS, type Bicho, type Genoma, type Muerte, type Mundo, type Rasgo } from "./engine";
import { enEje, posGen } from "./render";

/**
 * Un bicho concreto, mientras la cámara lo sigue. **Va bajo el mundo y no encima**, al revés que
 * la leyenda y los estratos: lo que cuenta solo se entiende mirándolo a él andar, así que taparlo
 * sería taparse a sí mismo. Le quita alto al lienzo como la tira, y de ahí sale que la cámara
 * tenga que acercarse — ver el mundo entero en lo que queda deja al bicho en seis píxeles.
 *
 * **No hay aquí un solo número que el mundo no tenga ya.** Los hijos se cuentan del censo y no de
 * un contador en el `Bicho`: lo que el motor lleva es la camada de esta noche, y añadirle un total
 * de por vida sería tocar el mundo para pintar un panel.
 */

/** Refresco, en ms. El mismo de la tira: la energía se mueve en días, no en fotogramas. */
const REFRESCO = 333;

const NOMBRE: Record<string, string> = { vision: "visión" };

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 });
const pct = (r: Rasgo, v: number) => Math.round(enEje(r, v) * 100);

/**
 * Cómo se cuenta cada muerte. En pasado y con el bicho de sujeto, porque es su ficha la que lo
 * dice: aquí no hay nadie más de quien hablar.
 */
const FINAL: Record<Muerte, string> = {
  vejez: "murió de viejo",
  hambre: "murió de hambre",
  comido: "se lo comieron",
};

/** Lo que se lee de un bicho en un momento dado. Se guarda copiado: el original muere. */
type Ficha = {
  id: number; gen: number;
  dias: number; vida: number;
  despensa: number; carga: number;
  crias: number; vivas: number; camada: number;
  donde: string;
  g: Genoma;
};

function fichar(m: Mundo, b: Bicho): Ficha {
  let vivas = 0;
  for (const o of m.bichos) if (o.idMadre === b.id) vivas++;
  return {
    id: b.id, gen: b.gen,
    // **Los días que lleva vividos, contando el de hoy**, que es lo que hace que el plazo se lea:
    // en crudo, `dia - nacido` deja al que se muere hoy de viejo en «9 días de 10» —y la ficha se
    // congela ahí, porque muere al cerrar el día—, así que la causa y la edad se contradicen. De
    // noche no se suma: `dia` ya es el de mañana, y la cría que acaba de nacer no ha salido aún.
    // Topado en el plazo porque **un muerto no cumple años**: su cuerpo se puede pulsar al día
    // siguiente —se disuelve cruzando el alba— y `dia` ya ha corrido, así que el de viejo saldría
    // con once días de diez, que es justo la contradicción que esto viene a quitar.
    dias: Math.min(m.cfg.vida, m.dia - b.nacido + (m.noche ? 0 : 1)), vida: m.cfg.vida,
    despensa: b.reserva / (m.cfg.capReserva * b.masa),
    carga: b.carga,
    crias: b.crias, vivas, camada: m.noche ? b.hijos : 0,
    donde: b.dormido ? "durmiendo" : b.aSalvo ? "en casa" : "fuera",
    g: { ...b.g },
  };
}

/** La despensa pasa de llena sin techo, así que por encima del 100% se cuenta en veces. */
const despensaDe = (d: number) => (d > 1 ? `×${num(d)}` : `${Math.round(d * 100)}%`);

export default function Inspector({ mundo, id, eva, cerrar, genes = true }: {
  mundo: () => Mundo | null;
  id: number;
  eva: Genoma;
  cerrar: () => void;
  /** Con las seis barras o solo la línea de arriba. **Sin ellas con la tira puesta**: ahí los seis
   *  genes ya están, y contra toda la población en vez de contra el fundador solo. */
  genes?: boolean;
}) {
  /**
   * La última ficha, y **se deja de refrescar en cuanto el bicho no está**: seguir leyéndola del
   * mundo le echaría años y le mataría hijos a un muerto, porque el día sigue corriendo. Lo que
   * queda en pantalla es la foto del último momento en que estuvo vivo, que es lo que se quiere
   * mirar cuando desaparece de golpe.
   */
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [vivo, setVivo] = useState(true);
  /**
   * Cómo acabó, o `null` si simplemente no está —que es lo que pasa al volver atrás, a un día en
   * el que aún no había nacido—. Sale del propio bicho, que se lo apunta al morirse, **y no de sus
   * marcas, que caducan con su animación**: a ×64 caben catorce ticks entre dos fotogramas, así
   * que quien las mirara acertaría o no según la velocidad a la que fuera el mundo.
   */
  const [muerte, setMuerte] = useState<Muerte | null>(null);
  /** El último cuerpo visto, que el motor ya ha sacado de la lista. Es quien guarda la muerte. */
  const cuerpoRef = useRef<Bicho | null>(null);

  useEffect(() => {
    cuerpoRef.current = null;
    const leer = () => {
      const m = mundo();
      if (!m) return;
      const b = m.bichos.find((x) => x.id === id) ?? null;
      // Se puede pulsar un cuerpo que todavía se disuelve, y entonces no hay ninguna foto anterior
      // que enseñar: se saca de él, **una sola vez**, y desde ahí se congela como cualquier otra.
      const cuerpo = b ?? (cuerpoRef.current ? null : m.restos.find((z) => z.b.id === id)?.b ?? null);
      if (cuerpo) { cuerpoRef.current = cuerpo; setFicha(fichar(m, cuerpo)); }
      setVivo(b !== null);
      setMuerte(b ? null : cuerpoRef.current?.muerte ?? null);
    };
    leer();
    const t = window.setInterval(leer, REFRESCO);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    return () => { window.clearInterval(t); window.removeEventListener("keydown", esc); };
  }, [mundo, id, cerrar]);

  if (!ficha) return null;
  const f = ficha;
  const cria = (n: number) => `${n} ${n === 1 ? "cría" : "crías"}`;

  return (
    <div className={`in-panel${vivo ? "" : " ido"}`}>
      {/* Identidad, estado y descendencia, en ese orden. */}
      <div className="in-cab">
        <b>#{f.id}</b>
        {!vivo && <span className="in-ido">{muerte ? FINAL[muerte] : "ya no está"}</span>}
        <span>generación {f.gen}</span>
        <span>
          {f.dias} {f.dias === 1 ? "día" : "días"}
          {Number.isFinite(f.vida) && <i> de {f.vida}</i>}
        </span>
        {vivo && <span className="in-donde">{f.donde}</span>}
        <span title="reserva sobre la despensa llena, que va con la masa">
          despensa {despensaDe(f.despensa)}
        </span>
        {f.carga > 0 && <span>lleva {f.carga}</span>}
        {/* Las que puso y las que le quedan, que no son lo mismo ni de lejos: es lo único que
            contesta para qué sirvió este bicho. */}
        <span className="in-prole">
          {f.crias === 0 ? "sin crías" : `${vivo ? "" : "dejó "}${cria(f.crias)}, ${f.vivas} ${f.vivas === 1 ? "viva" : "vivas"}`}
          {f.camada > 0 && <i> · {cria(f.camada)} esta noche</i>}
        </span>
        {/* Una aspa y no un botón con marco: la cabecera es una sola línea de datos y un botón de
            los de la barra no cabe en ella, así que se lleva un renglón entero del mundo. */}
        <button className="in-cerrar" onClick={cerrar} title="Soltar el bicho" aria-label="Soltar el bicho">✕</button>
      </div>

      {/* Los seis genes en la misma vara que la leyenda y la tira —octavas desde el fundador, vía
          `posGen`—, para que «63%» quiera decir lo mismo en los tres sitios. La marca del fundador
          va en cada barra: sin ella el tanto por ciento no dice de dónde salió. **Y solo la marca,
          sin la distancia en cifra**: el fundador está clavado en el 50, así que restárselo al
          tanto por ciento es escribir dos veces el mismo número. */}
      {genes && <div className="in-genes">
        {RASGOS.map((r) => (
          <div key={r} className="in-gen" title={`${NOMBRE[r] ?? r} ${num(f.g[r])}`}>
            <div className="in-gen-cab">
              <b>{NOMBRE[r] ?? r}</b>
              <span>{pct(r, f.g[r])}%</span>
            </div>
            <div className="in-barra">
              <span className="in-eva-marca" style={{ left: `${posGen(r, eva[r]) * 100}%` }} />
              <span className="in-aqui" style={{ left: `${posGen(r, f.g[r]) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
