"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChromeBar, MinimizedBar, TabsBar } from "./Chrome";
import type { ChromeTab } from "./Chrome";
import { saveRestoredHeight } from "@/lib/utils";

// Ventana macOS con su máquina de estado (normal / minimizado / maximizado) y las
// animaciones de cerrar, minimizar, maximizar y restaurar. Estaba triplicada idéntica
// en cv, lab y designs (I 1.2). Cada página pasa su title, sus tabs y su contenido como
// children; el <style> con las media queries del contenido se queda en cada página.
export default function ChromeWindow({
  title,
  closeTo,
  tabs,
  restoreHeightKey,
  children,
}: {
  title: string;
  closeTo: string;               // destino del botón cerrar (vía startViewTransition)
  tabs: ChromeTab[];
  restoreHeightKey?: string;     // si se pasa, publica la altura restaurada (hoy solo /lab)
  children: ReactNode;
}) {
  const router = useRouter();
  const [windowState, setWindowState] = useState<"normal" | "minimized" | "maximized">("normal");
  const [animClass, setAnimClass] = useState("");
  const [dockAnimOut, setDockAnimOut] = useState(false);
  const winRef = useRef<HTMLDivElement>(null);

  // Guardar la altura de la ventana restaurada para que la animación de "atrás" de las
  // páginas de item (TerminalShell) termine a esta misma altura, sin salto.
  useEffect(() => {
    if (!restoreHeightKey) return;
    const el = winRef.current;
    if (!el || windowState !== "normal" || animClass) return;
    const store = () => saveRestoredHeight(restoreHeightKey, el.offsetHeight);
    store();
    const ro = new ResizeObserver(store);
    ro.observe(el);
    return () => ro.disconnect();
  }, [restoreHeightKey, windowState, animClass]);

  const handleClose = () => {
    const nav = () => {
      if ("startViewTransition" in document) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => router.push(closeTo));
      } else { router.push(closeTo); }
    };
    if (windowState === "minimized") {
      setDockAnimOut(true);
      setTimeout(() => {
        document.body.style.transition = "background 0.3s ease";
        document.body.style.background = "#f7f4ed";
        setTimeout(nav, 300);
      }, 220);
      return;
    }
    document.body.style.background = "#f7f4ed";
    setAnimClass("t-win-closing");
    setTimeout(nav, 500);
  };
  const handleMinimize = () => {
    setAnimClass("t-win-minimizing");
    setTimeout(() => { setWindowState("minimized"); setAnimClass(""); }, 390);
  };
  const handleMaximize = () => {
    if (animClass.includes("maximiz")) return;
    if (windowState !== "maximized") {
      if (winRef.current) winRef.current.style.setProperty("--start-h", `${winRef.current.clientHeight}px`);
      setAnimClass("t-win-maximizing");
      setTimeout(() => { setWindowState("maximized"); setAnimClass(""); }, 1020);
    } else {
      setAnimClass("t-win-unmaximizing");
      setTimeout(() => { setWindowState("normal"); setAnimClass(""); }, 1020);
    }
  };
  const handleRestore = () => {
    setDockAnimOut(true);
    setTimeout(() => {
      setWindowState("normal");
      setAnimClass("t-win-restoring");
      setDockAnimOut(false);
      setTimeout(() => setAnimClass(""), 640);
    }, 220);
  };
  const handleRestoreMaximized = () => {
    setDockAnimOut(true);
    setTimeout(() => {
      setWindowState("maximized");
      setAnimClass("t-win-restoring");
      setDockAnimOut(false);
      setTimeout(() => setAnimClass(""), 640);
    }, 220);
  };

  const isMax = windowState === "maximized";
  const isMin = windowState === "minimized";

  return (
    <>
      {isMin && <MinimizedBar title={title} onRestore={handleRestore} onMaximize={handleRestoreMaximized} onClose={handleClose} animatingOut={dockAnimOut} />}

      <div className={`t-bg${animClass === "t-win-maximizing" ? " t-outer-maximizing" : animClass === "t-win-unmaximizing" ? " t-outer-unmaximizing" : ""}`} style={{
        minHeight: "100vh",
        background: "#ece9e0",
        padding: isMax ? 0 : "2rem 1rem 3rem",
        display: (isMin && !animClass) ? "none" : "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "var(--t-sans)",
        transition: "padding 1.1s ease",
        animation:
          animClass === "t-win-closing"    ? "t-bg-fade-out 0.2s ease-out  forwards" :
          animClass === "t-win-minimizing" ? "t-bg-fade-out 0.38s ease-in   forwards" :
          animClass === "t-win-restoring"  ? "t-bg-fade-in  0.6s  ease-out"           :
          undefined,
      }}>
        <div ref={winRef} className={animClass} style={{
          "--win-w": "100vw",
          width: isMax ? "100vw" : "min(920px, 100%)",
          maxWidth: "none",
          minHeight: isMax ? "100vh" : undefined,
          background: "var(--t-paper)",
          borderRadius: isMax ? 0 : 12,
          border: isMax ? "none" : "1px solid var(--t-rule)",
          boxShadow: isMax ? "none" : "0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
          marginBottom: isMax ? 0 : "3rem",
          transformOrigin: (animClass === "t-win-minimizing" || animClass === "t-win-restoring") ? "bottom center" : "center center",
        } as React.CSSProperties}>
          <ChromeBar title={title} onClose={handleClose} onMinimize={handleMinimize} onMaximize={handleMaximize}
            isMaximized={windowState === "maximized" || animClass === "t-win-maximizing"} />
          <TabsBar tabs={tabs} />
          {children}
        </div>
      </div>
    </>
  );
}
