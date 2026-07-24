"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChromeWindow from "../components/ChromeWindow";
import { useTypewriter } from "../components/useTypewriter";
import { calcularEdad } from "@/lib/utils";

// ─── Data ─────────────────────────────────────────────────────────────────────

type LabStatus = "available" | "hidden" | "soon" | "private";

type LabItem = {
  id: string;
  num: string;
  type: string;
  title: string;
  description: string;
  status: LabStatus;
  href: string | null;
  cta: string;
  secretHref?: string; // puerta oculta: navega aquí al clicar SIN afordance visible (solo farma → stats)
};

const ITEMS: LabItem[] = [
  { id: "lucas",       num: "01", type: "web",        title: "Dr. Lucas Crespo",     description: `Perfil profesional de un aeronáutico de ${calcularEdad(new Date(2020, 2, 30))} años.`, status: "available", href: "/webs/lucas",       cta: "Ver perfil →" },
  { id: "lagartijas",  num: "02", type: "web",        title: "Lagartijas de Lucas",  description: "Las lagartijas de cuentas que hace a mano, una a una.",                             status: "available", href: "/webs/lagartijas",  cta: "Verlas →" },
  { id: "farma",       num: "03", type: "web",        title: "Farmacia",             description: "Gestión de pedidos, inventario y prioridades de venta.",                          status: "private",   href: "/farma",           cta: "Privada", secretHref: "/webs/farma-stats" },
  { id: "fuera-de-ruta", num: "04", type: "web",      title: "Fuera de Ruta",       description: "Destinos chulos pero poco conocidos, filtrables y con mapa.",                         status: "available", href: "/fuera-de-ruta",           cta: "Explorar →" },
  { id: "placeholder", num: "05", type: "web",        title: "Aquí va lo importante", description: "Aquí podría ir tu web. Dime tu idea y lo implementamos.",                            status: "soon",      href: null,               cta: "En construcción" },
  { id: "rpncalc",     num: "06", type: "app",        title: "Calculadora RPN",       description: "Para los que piensan en pila.",                                                       status: "available", href: "/apps/RPNcalc",     cta: "Abrir →" },
  { id: "fluidos",     num: "07", type: "app",        title: "Fluidos",               description: "Agua, fuego, tierra. Controla los elementos.",                                        status: "available", href: "/apps/fluidos",     cta: "Abrir →" },
  { id: "orbitas",     num: "08", type: "app",        title: "Órbitas",               description: "Lanza cuerpos y míralos orbitar, chocar y escapar.",                                  status: "available", href: "/apps/orbitas",     cta: "Abrir →" },
  { id: "observatorio", num: "09", type: "app",       title: "Observatorio",          description: "Qué se ve en el cielo esta noche.",                                                   status: "available", href: "/apps/observatorio", cta: "Abrir →" },
  { id: "espiral",     num: "10", type: "juego",      title: "Espiral",               description: "Dos caminos distintos, una sola decisión.",                                        status: "available", href: "/juegos/espiral",   cta: "Jugar →" },
  { id: "laberinto",   num: "11", type: "juego",      title: "Laberinto",             description: "Inclina el móvil o usa el ratón.",                                                    status: "available", href: "/juegos/laberinto", cta: "Jugar →" },
  { id: "circulo",     num: "12", type: "truco",      title: "Círculo perfecto",      description: "Dibuja el círculo más perfecto que puedas.",                                          status: "available", href: "/trucos/circulo",   cta: "Probar →" },
  { id: "magia",       num: "13", type: "truco",      title: "Magia de la buena",     description: "Piensa en una carta. No me la digas.",                                                status: "available", href: "/trucos/magia",     cta: "Probar →" },
  { id: "letras",      num: "14", type: "easter-egg", title: "Las letras caen",       description: "Algo pasa si sabes dónde pinchar.",                                                   status: "hidden",    href: "/",                cta: "Ir a probarlo →" },
  { id: "color",       num: "15", type: "easter-egg", title: "Cambio de tema",        description: `Cambio de tema dinámico en el diseño "Original".`,                                                               status: "hidden", href: "/home/original", cta: "Ir a probarlo →" },
  { id: "guestbook",   num: "16", type: "easter-egg", title: "Libro de firmas",       description: "Deja tu firma. Como los de toda la vida.",                                            status: "available", href: "/guestbook",       cta: "Firmar →" },
];

// Orden y etiqueta plural de cada grupo. El orden manda el de aparición en ITEMS.
const GROUPS: { type: string; label: string }[] = [
  { type: "web",        label: "webs" },
  { type: "app",        label: "apps" },
  { type: "juego",      label: "juegos" },
  { type: "truco",      label: "trucos" },
  { type: "easter-egg", label: "easter-eggs" },
];

const CMD = "ls ~/lab --group --fold";

// Altura máxima del grupo abierto: fija para poder animar el max-height (truco CSS de
// acordeón). Holgada para los grupos actuales (≤5 items = 3 filas); si un grupo crece
// mucho, subir este valor.
const OPEN_MAXH = 760;

// ─── Subcomponents ────────────────────────────────────────────────────────────

function PromptRow({ cmd }: { cmd: string }) {
  const { typed: displayed, execMs } = useTypewriter(cmd);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "44px 1fr auto",
      gap: "0 12px", padding: "18px 28px 8px", alignItems: "baseline",
    }} className="t-prompt">
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)" }} className="t-prompt-num">000</span>
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 13.5 }} className="t-prompt-cmd">
        <span style={{ color: "var(--t-accent2)" }}>pacres</span>
        <span style={{ color: "var(--t-ink3)" }}>@resume</span>
        <span style={{ color: "var(--t-ink2)" }}>:~/lab</span>
        <span style={{ color: "var(--t-ink3)" }}>$ </span>
        <span style={{ color: "var(--t-ink)" }}>{displayed}</span>
      </span>
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)", visibility: execMs !== null ? "visible" : "hidden" }}>
        ↳ {execMs ?? 0}ms
      </span>
    </div>
  );
}

function StatusTag({ status }: { status: LabStatus }) {
  const cfg = {
    available: { label: "● live",    color: "var(--t-accent2)" },
    hidden:    { label: "◌ hidden",  color: "var(--t-ink4)"    },
    soon:      { label: "○ soon",    color: "var(--t-ink3)"    },
    private:   { label: "◌ private", color: "var(--t-ink3)"    },
  }[status];
  return <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: cfg.color }}>{cfg.label}</span>;
}

function ItemCard({ item }: { item: LabItem }) {
  const router = useRouter();
  const clickable = item.status === "available" && item.href;
  const live = item.status === "available";
  return (
    <div
      className="t-lab-card"
      onClick={() => {
        if (clickable) router.push(item.href!);
        else if (item.secretHref) router.push(item.secretHref);
      }}
      style={{
        borderRadius: 11, padding: "13px 14px 12px", background: "var(--t-paper)",
        cursor: clickable ? "pointer" : "default",
      }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
        <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)" }}>{item.num}</span>
        <span style={{ flex: 1 }} />
        <StatusTag status={item.status} />
      </div>
      <div style={{ fontFamily: "var(--t-sans)", fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px", lineHeight: 1.25, color: live ? "var(--t-ink)" : "var(--t-ink3)" }}>{item.title}</div>
      <div style={{ fontFamily: "var(--t-sans)", fontSize: 12.5, lineHeight: 1.4, color: "var(--t-ink2)", marginTop: 4, minHeight: 34 }}>{item.description}</div>
    </div>
  );
}

function Group({ label, items, open, onToggle }: {
  label: string; items: LabItem[]; open: boolean; onToggle: () => void;
}) {
  const live  = items.filter(i => i.status === "available").length;
  const other = items.length - live;
  return (
    <div style={{ border: "1px solid var(--t-rule)", borderRadius: 12, overflow: "hidden", background: "var(--t-paper2)" }}>
      <div className="t-lab-ghead" onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 15px", cursor: "pointer", userSelect: "none" }}>
        <span style={{ color: "var(--t-accent2)", fontFamily: "var(--t-mono)", fontSize: 12, width: 12 }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontFamily: "var(--t-mono)", fontSize: 14, fontWeight: 500, letterSpacing: "0.3px", color: "var(--t-ink)" }}>{label}</span>
        <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)", background: "var(--t-paper)", border: "1px solid var(--t-rule)", borderRadius: 20, padding: "1px 8px" }}>{items.length}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-accent2)" }}>{live} live</span>
        {other > 0 && <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)" }}>· {other} off</span>}
      </div>
      <div style={{ overflow: "hidden", transition: "max-height 0.4s cubic-bezier(.4,0,.2,1), opacity 0.3s ease", maxHeight: open ? OPEN_MAXH : 0, opacity: open ? 1 : 0 }}>
        <div style={{ padding: "4px 14px 15px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
          {items.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Laboratorio() {
  const router = useRouter();
  const [contentReady, setContentReady] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState(0); // cuántas cajas se han revelado (aparición secuencial)
  const [openType, setOpenType] = useState<string | null>("web"); // solo un grupo abierto a la vez; web al aterrizar (colapsado en móvil, ver effect)

  useEffect(() => {
    const delay = 120 + CMD.length * 26 + 200;
    let iv: ReturnType<typeof setInterval>;
    const t = setTimeout(() => {
      // En móvil arrancamos con todo colapsado. Nota: en un tab de fondo (o el iframe del
      // preview) innerWidth puede ser 0 aún; 0 no es un móvil real, así que solo colapsamos
      // con un ancho válido ≤700. El contenido sigue oculto hasta contentReady: sin saltos.
      const w = window.innerWidth;
      if (w > 0 && w <= 700) setOpenType(null);
      setContentReady(true);
      let count = 0;
      iv = setInterval(() => {
        count++;
        setVisibleGroups(count);
        if (count >= GROUPS.length) clearInterval(iv);
      }, 80);
    }, delay);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const toggle = (type: string) => setOpenType(prev => (prev === type ? null : type));

  const available = ITEMS.filter(i => i.status === "available").length;
  const off = ITEMS.length - available;

  return (
    <>
      <style>{`
        /* Base del borde en la clase (le gana al inline); hover solo con ratón, :active para tacto. */
        .t-lab-card  { border: 1px solid var(--t-rule); transition: transform .13s ease, border-color .13s ease, box-shadow .13s ease; }
        .t-lab-ghead { transition: background .15s ease; }
        @media (hover: hover) {
          .t-lab-card:hover  { border-color: var(--t-accent); box-shadow: 0 6px 18px -8px rgba(0,0,0,.25); transform: translateY(-2px); }
          .t-lab-ghead:hover { background: var(--t-paper); }
        }
        .t-lab-card:active { border-color: var(--t-accent); }

        @media (max-width: 700px) {
          .t-content { padding: 0 16px 24px 16px !important; }
          .t-prompt  { padding: 16px 16px 6px !important; }
          .t-prompt-num { font-size: 10px !important; }
          .t-prompt-cmd { font-size: 12px !important; }
        }
      `}</style>

      <ChromeWindow
        title="lab"
        closeTo="/"
        restoreHeightKey="/lab"
        tabs={[
          { label: "~/cv",      active: false, onClick: () => router.push("/cv") },
          { label: "~/lab",     active: true },
          { label: "~/designs", active: false, onClick: () => router.push("/designs") },
        ]}
      >
        <PromptRow cmd={CMD} />

        <div className={`t-content-wrap${contentReady ? " t-in" : ""}`}>
          <div className="t-content" style={{ padding: "14px 28px 32px 86px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {GROUPS.map((g, idx) => {
                const revealed = idx < visibleGroups;
                return (
                  <div key={g.type} className={revealed ? "t-row-in" : undefined} style={{ visibility: revealed ? undefined : "hidden" }}>
                    <Group label={g.label}
                      items={ITEMS.filter(i => i.type === g.type)}
                      open={openType === g.type} onToggle={() => toggle(g.type)} />
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)" }}>
              ↳ <span style={{ color: "var(--t-accent2)" }}>{available} disponibles</span> · {off} off
            </div>
          </div>
        </div>

        <div style={{ padding: "0.4rem 28px 1.5rem", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink4)" }}>
            ↳ pacr.es/lab
          </span>
        </div>
      </ChromeWindow>
    </>
  );
}
