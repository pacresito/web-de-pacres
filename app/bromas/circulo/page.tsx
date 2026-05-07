"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "drawing" | "score" | "alive" | "caught";

const THRESHOLD = 0.88;

function computeScore(pts: { x: number; y: number }[]): number {
  if (pts.length < 20) return 0;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const dists = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
  const mean = dists.reduce((s, d) => s + d, 0) / dists.length;
  if (mean < 20) return 0;
  const std = Math.sqrt(dists.reduce((s, d) => s + (d - mean) ** 2, 0) / dists.length);
  const roundness = Math.max(0, 1 - std / mean);
  const d0 = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
  const closure = Math.max(0, 1 - d0 / (mean * 1.5));
  return Math.min(1, roundness * 0.7 + closure * 0.3);
}

export default function CirculoPerfecto() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const ptsRef = useRef<{ x: number; y: number }[]>([]);
  const [displayScore, setDisplayScore] = useState(0);
  const certNumRef = useRef(0);

  // Circle in screen coordinates during alive phase
  const circRef = useRef({ x: 0, y: 0, r: 60, vx: 1.2, vy: 1.0 });
  const mouseScreenRef = useRef({ x: -9999, y: -9999 });
  const animRef = useRef(0);
  const aliveOverlayRef = useRef<HTMLCanvasElement | null>(null);

  const [sz, setSz] = useState(0);

  useEffect(() => {
    certNumRef.current = Math.floor(Math.random() * 900000) + 100000;
  }, []);

  function go(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  useEffect(() => {
    function calc() {
      const s = Math.min(480, Math.floor(window.innerWidth * 0.9), Math.floor(window.innerHeight * 0.62));
      setSz(s);
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || sz === 0) return;
    c.width = sz;
    c.height = sz;
    c.style.width = sz + "px";
    c.style.height = sz + "px";
    if (phaseRef.current === "idle") drawIdle(c);
  }, [sz]);

  // Cleanup overlay on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      aliveOverlayRef.current?.remove();
    };
  }, []);

  function drawIdle(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const r = canvas.width * 0.28;
    ctx.save();
    ctx.strokeStyle = "rgba(96,165,250,0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 11]);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPoints(canvas: HTMLCanvasElement, pts: { x: number; y: number }[]) {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function drawAliveFrame(canvas: HTMLCanvasElement) {
    const { x, y, r } = circRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(59,130,246,0.09)";
    ctx.fill();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(59,130,246,0.35)";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `600 ${Math.max(9, Math.round(r * 0.20))}px monospace`;
    ctx.fillStyle = "rgba(59,130,246,0.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ATRÁPAME", x, y);
  }

  const aliveLoop = useCallback(() => {
    const canvas = aliveOverlayRef.current;
    if (!canvas || phaseRef.current !== "alive") return;
    const c = circRef.current;
    const m = mouseScreenRef.current;

    const dx = c.x - m.x;
    const dy = c.y - m.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 160 && dist > 0) {
      const f = 5 * (1 - dist / 160);
      c.vx += (dx / dist) * f;
      c.vy += (dy / dist) * f;
    }

    const speed = Math.hypot(c.vx, c.vy);
    if (speed > 7) { c.vx *= 7 / speed; c.vy *= 7 / speed; }
    if (speed < 0.8 && speed > 0) { c.vx *= 0.8 / speed; c.vy *= 0.8 / speed; }

    c.x += c.vx;
    c.y += c.vy;

    const m2 = c.r + 5;
    if (c.x < m2) { c.x = m2; c.vx = Math.abs(c.vx); }
    if (c.x > canvas.width - m2) { c.x = canvas.width - m2; c.vx = -Math.abs(c.vx); }
    if (c.y < m2) { c.y = m2; c.vy = Math.abs(c.vy); }
    if (c.y > canvas.height - m2) { c.y = canvas.height - m2; c.vy = -Math.abs(c.vy); }

    // Corner avoidance: push toward center when trapped near two walls
    const cm = c.r * 1.8;
    const nearH = c.x < cm || c.x > canvas.width - cm;
    const nearV = c.y < cm || c.y > canvas.height - cm;
    if (nearH && nearV) {
      const toCx = canvas.width / 2 - c.x;
      const toCy = canvas.height / 2 - c.y;
      const d = Math.hypot(toCx, toCy) || 1;
      c.vx += (toCx / d) * 1.2;
      c.vy += (toCy / d) * 1.2;
    }

    drawAliveFrame(canvas);
    animRef.current = requestAnimationFrame(aliveLoop);
  }, []);

  function launchAlive(canvasCx: number, canvasCy: number, r: number) {
    const baseCanvas = canvasRef.current!;
    const rect = baseCanvas.getBoundingClientRect();
    // Limpiar el dibujo
    const ctx = baseCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);

    circRef.current = {
      x: rect.left + canvasCx,
      y: rect.top + canvasCy,
      r,
      vx: 1.2 * (Math.random() > 0.5 ? 1 : -1),
      vy: 1.0 * (Math.random() > 0.5 ? 1 : -1),
    };

    const overlay = document.createElement("canvas");
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;cursor:crosshair;";
    document.body.appendChild(overlay);
    aliveOverlayRef.current = overlay;

    const isMobileDevice = "ontouchstart" in window && window.matchMedia("(pointer: coarse)").matches;

    if (isMobileDevice) {
      let holdTimer: ReturnType<typeof setTimeout> | null = null;
      let holdTouchPos = { x: 0, y: 0 };

      const onTouchStart = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        const c = circRef.current;
        holdTouchPos = { x: t.clientX, y: t.clientY };
        if (Math.hypot(t.clientX - c.x, t.clientY - c.y) <= c.r + 14) {
          holdTimer = setTimeout(() => {
            const cc = circRef.current;
            if (Math.hypot(holdTouchPos.x - cc.x, holdTouchPos.y - cc.y) <= cc.r + 14) {
              cancelAnimationFrame(animRef.current);
              overlay.remove();
              aliveOverlayRef.current = null;
              go("caught");
            }
          }, 500);
        }
      };
      const cancelHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
      const onTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        holdTouchPos = { x: t.clientX, y: t.clientY };
        const c = circRef.current;
        if (holdTimer && Math.hypot(t.clientX - c.x, t.clientY - c.y) > c.r + 14) cancelHold();
      };

      overlay.addEventListener("touchstart", onTouchStart, { passive: true });
      overlay.addEventListener("touchmove", onTouchMove, { passive: true });
      overlay.addEventListener("touchend", cancelHold);
      overlay.addEventListener("touchcancel", cancelHold);
    } else {
      overlay.addEventListener("click", (e) => {
        const c = circRef.current;
        if (Math.hypot(e.clientX - c.x, e.clientY - c.y) <= c.r + 14) {
          cancelAnimationFrame(animRef.current);
          overlay.remove();
          aliveOverlayRef.current = null;
          go("caught");
        }
      });
    }

    go("alive");
    animRef.current = requestAnimationFrame(aliveLoop);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onMove(e: MouseEvent | TouchEvent) {
      const src = e instanceof TouchEvent ? (e.touches[0] ?? e.changedTouches[0]) : e;
      mouseScreenRef.current = { x: src.clientX, y: src.clientY };

      if (phaseRef.current === "drawing") {
        const rect = canvas!.getBoundingClientRect();
        const pos = { x: src.clientX - rect.left, y: src.clientY - rect.top };
        ptsRef.current.push(pos);
        drawPoints(canvas!, ptsRef.current);
      }
    }

    function onDown(e: MouseEvent | TouchEvent) {
      if (phaseRef.current !== "idle" && phaseRef.current !== "score") return;
      const src = e instanceof TouchEvent ? (e.touches[0] ?? e.changedTouches[0]) : e;
      const rect = canvas!.getBoundingClientRect();
      ptsRef.current = [{ x: src.clientX - rect.left, y: src.clientY - rect.top }];
      go("drawing");
    }

    function onUp() {
      if (phaseRef.current !== "drawing") return;
      const score = computeScore(ptsRef.current);
      setDisplayScore(score);
      go("score");

      if (score >= THRESHOLD) {
        setTimeout(() => {
          if (phaseRef.current !== "score") return;
          const pts = ptsRef.current;
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const dists = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
          const r = Math.max(30, Math.min(100, dists.reduce((s, d) => s + d, 0) / dists.length));
          launchAlive(cx, cy, r);
        }, 700);
      } else {
        setTimeout(() => {
          if (phaseRef.current !== "score") return;
          go("idle");
          const c = canvasRef.current;
          if (c) drawIdle(c);
        }, 2000);
      }
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [aliveLoop]);

  function reset() {
    cancelAnimationFrame(animRef.current);
    aliveOverlayRef.current?.remove();
    aliveOverlayRef.current = null;
    ptsRef.current = [];
    setDisplayScore(0);
    go("idle");
    const canvas = canvasRef.current;
    if (canvas) drawIdle(canvas);
  }

  const pct = Math.round(displayScore * 100);

  return (
    <div style={{ background: "#fff", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem", position: "relative" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #fff; }`}</style>

      <h1 style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
        Círculo perfecto
      </h1>

      <div style={{ position: "relative", width: sz || 480, height: sz || 480 }}>
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            border: "1px solid rgba(96,165,250,0.2)",
            borderRadius: "8px",
            cursor: "default",
            touchAction: "none",
            userSelect: "none",
          }}
        />

        {phase === "idle" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <p style={{ color: "#9ca3af", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono, monospace)" }}>
              Dibuja un círculo
            </p>
          </div>
        )}

        {phase === "score" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)", borderRadius: "8px" }}>
            <p style={{ fontSize: "4.5rem", fontWeight: 800, fontFamily: "var(--font-geist-mono, monospace)", color: displayScore >= THRESHOLD ? "#3b82f6" : "#111827", lineHeight: 1 }}>
              {pct}%
            </p>
            <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#9ca3af" }}>
              {displayScore >= THRESHOLD ? "Un momento..." : pct >= 65 ? "Casi, casi..." : "Inténtalo de nuevo"}
            </p>
          </div>
        )}

        {phase === "caught" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.97)", borderRadius: "8px", gap: "1.5rem" }}>
            <div style={{ border: "2px solid #3b82f6", borderRadius: "4px", padding: "1.75rem 2rem", width: "82%", maxWidth: "300px", textAlign: "center", position: "relative" }}>
              <div style={{ position: "absolute", inset: 5, border: "1px solid rgba(96,165,250,0.3)", borderRadius: "3px", pointerEvents: "none" }} />
              <p style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "var(--font-geist-mono, monospace)", color: "#3b82f6", marginBottom: "0.75rem" }}>
                Certificado oficial
              </p>
              <p style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#111827" }}>
                Círculo Perfecto
              </p>
              <p style={{ fontSize: "0.68rem", color: "#6b7280", margin: "0.75rem 0 1.25rem", lineHeight: 2.0, fontFamily: "var(--font-geist-mono, monospace)" }}>
                Se certifica que el portador<br />
                ha trazado un círculo<br />
                de precisión extraordinaria
              </p>
              <div style={{ borderTop: "1px solid rgba(96,165,250,0.25)", paddingTop: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <p style={{ fontSize: "0.58rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)" }}>
                  Nº {certNumRef.current}
                </p>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "0.88rem", color: "#374151" }}>
                    Pablo Crespo
                  </p>
                  <div style={{ width: 76, height: 1, background: "rgba(0,0,0,0.15)", margin: "0.15rem 0 0 auto" }} />
                  <p style={{ fontSize: "0.52rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", marginTop: "0.15rem" }}>
                    Autoridad certificadora
                  </p>
                </div>
              </div>
            </div>
            <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.78rem", fontFamily: "var(--font-geist-mono, monospace)", padding: "0.5rem" }}>
              Volver a intentarlo
            </button>
          </div>
        )}
      </div>

      {phase === "score" && displayScore < THRESHOLD && (
        <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.78rem", fontFamily: "var(--font-geist-mono, monospace)" }}>
          Reintentar →
        </button>
      )}

      <a
        href="/extras"
        style={{ position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", transition: "color 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
      >
        pacr.es
      </a>
    </div>
  );
}
