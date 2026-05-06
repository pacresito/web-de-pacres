"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "idle" | "playing" | "lost" | "won";

const TARGET_R = 28;
const LERP_ALPHAS = [0.08, 0.06, 0.04];
const FLEE_RADIUS = 180;
const FLEE_FORCE = 14;
const HOLD_MS = 500;
const ARC_C = 2 * Math.PI * (TARGET_R - 4);

function CursorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ display: "block" }}>
      <path
        d="M4 2L4 18L8 14L12 21L14.5 20L10.5 13L17 13Z"
        fill="#111827"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CuatroCursores() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const stateRef = useRef<GameState>("idle");
  const [isMobile, setIsMobile] = useState(false);
  const isMobileRef = useRef(false);

  const mouse = useRef({ x: -200, y: -200 });
  const fakes = useRef([
    { x: -200, y: -200 },
    { x: -200, y: -200 },
    { x: -200, y: -200 },
  ]);

  const cursorRealEl = useRef<HTMLDivElement>(null);
  const fake1El = useRef<HTMLDivElement>(null);
  const fake2El = useRef<HTMLDivElement>(null);
  const fake3El = useRef<HTMLDivElement>(null);
  const fakeEls = [fake1El, fake2El, fake3El];

  const winkEl = useRef<HTMLDivElement>(null);
  const winkingIdxRef = useRef(-1);
  const [winkingIdx, setWinkingIdx] = useState(-1);

  const celebrationEmojiEl = useRef<HTMLDivElement>(null);

  const targetEl = useRef<HTMLDivElement>(null);
  const targetAngle = useRef(0);
  const targetPos = useRef({ x: 0, y: 0 });

  // Mobile-specific
  const touchPos = useRef<{ x: number; y: number } | null>(null);
  const targetVel = useRef({ x: 0, y: 0 });
  const holdStart = useRef<number | null>(null);
  const holdArcEl = useRef<SVGCircleElement>(null);

  const animRef = useRef(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const mobile = "ontouchstart" in window && window.matchMedia("(pointer: coarse)").matches;
    setIsMobile(mobile);
    isMobileRef.current = mobile;
  }, []);

  useEffect(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    mouse.current = { x: cx, y: cy };
    fakes.current = [{ x: cx, y: cy }, { x: cx, y: cy }, { x: cx, y: cy }];
    targetPos.current = { x: cx, y: cy };
  }, []);

  function go(s: GameState) {
    stateRef.current = s;
    setGameState(s);
  }

  const loop = useCallback(() => {
    const s = stateRef.current;

    if (cursorRealEl.current) {
      cursorRealEl.current.style.left = mouse.current.x + "px";
      cursorRealEl.current.style.top = mouse.current.y + "px";
    }

    if (s === "won") {
      if (celebrationEmojiEl.current) {
        celebrationEmojiEl.current.style.left = mouse.current.x + 18 + "px";
        celebrationEmojiEl.current.style.top = mouse.current.y - 8 + "px";
      }
      animRef.current = requestAnimationFrame(loop);
      return;
    }

    if (s === "playing" || s === "idle") {
      if (isMobileRef.current) {
        // Target flees from finger
        const tp = touchPos.current;
        if (tp) {
          const dx = targetPos.current.x - tp.x;
          const dy = targetPos.current.y - tp.y;
          const dist = Math.hypot(dx, dy);
          if (dist < FLEE_RADIUS && dist > 1) {
            const strength = (1 - dist / FLEE_RADIUS) * FLEE_FORCE;
            targetVel.current.x += (dx / dist) * strength;
            targetVel.current.y += (dy / dist) * strength;
          }
        } else {
          // No touch: drift back to center
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          targetVel.current.x += (cx - targetPos.current.x) * 0.004;
          targetVel.current.y += (cy - targetPos.current.y) * 0.004;
        }
        targetVel.current.x *= 0.87;
        targetVel.current.y *= 0.87;
        targetPos.current.x += targetVel.current.x;
        targetPos.current.y += targetVel.current.y;

        // Bounce off walls
        const margin = TARGET_R + 8;
        if (targetPos.current.x < margin) { targetPos.current.x = margin; targetVel.current.x = Math.abs(targetVel.current.x) * 0.8; }
        if (targetPos.current.x > window.innerWidth - margin) { targetPos.current.x = window.innerWidth - margin; targetVel.current.x = -Math.abs(targetVel.current.x) * 0.8; }
        if (targetPos.current.y < margin) { targetPos.current.y = margin; targetVel.current.y = Math.abs(targetVel.current.y) * 0.8; }
        if (targetPos.current.y > window.innerHeight - margin) { targetPos.current.y = window.innerHeight - margin; targetVel.current.y = -Math.abs(targetVel.current.y) * 0.8; }

        if (targetEl.current) {
          targetEl.current.style.left = targetPos.current.x + "px";
          targetEl.current.style.top = targetPos.current.y + "px";
        }

        // Hold detection
        if (tp && s === "playing") {
          const onTarget = Math.hypot(tp.x - targetPos.current.x, tp.y - targetPos.current.y) < TARGET_R;
          if (onTarget) {
            if (!holdStart.current) holdStart.current = Date.now();
            const progress = Math.min((Date.now() - holdStart.current) / HOLD_MS, 1);
            if (holdArcEl.current) holdArcEl.current.style.strokeDasharray = `${progress * ARC_C} ${ARC_C}`;
            if (progress >= 1) {
              touchPos.current = null;
              holdStart.current = null;
              explodeAt(targetPos.current.x, targetPos.current.y);
              go("won");
              animRef.current = requestAnimationFrame(loop);
              return;
            }
          } else {
            holdStart.current = null;
            if (holdArcEl.current) holdArcEl.current.style.strokeDasharray = `0 ${ARC_C}`;
          }
        } else {
          holdStart.current = null;
          if (holdArcEl.current) holdArcEl.current.style.strokeDasharray = `0 ${ARC_C}`;
        }
      } else {
        // Desktop: lerp fakes + lissajous target
        const t = Date.now() / 1000;
        fakes.current.forEach((f, i) => {
          f.x += (mouse.current.x - f.x) * LERP_ALPHAS[i];
          f.y += (mouse.current.y - f.y) * LERP_ALPHAS[i];
          const el = fakeEls[i].current;
          if (el) {
            let ox = 0, oy = 0;
            if (i === 0) {
              ox = Math.sin(t * 1.5) * 20;
              oy = Math.cos(t * 1.1 + 0.8) * 20;
            } else if (i === 1) {
              ox = Math.sin(t * 0.9 + 1.0) * 20;
              oy = Math.cos(t * 1.4) * 20;
            } else {
              ox = Math.sin(t * 1.2 + 2.1) * 20;
              oy = Math.cos(t * 0.8 + 0.5) * 20;
            }
            el.style.left = (f.x + ox) + "px";
            el.style.top = (f.y + oy) + "px";
          }
        });

        targetAngle.current += 0.007;
        const a = targetAngle.current;
        const rx = Math.min(window.innerWidth * 0.28, 220);
        const ry = Math.min(window.innerHeight * 0.22, 160);
        const tx = window.innerWidth / 2 + Math.cos(a) * rx;
        const ty = window.innerHeight / 2 + Math.sin(a * 2) * ry;
        targetPos.current = { x: tx, y: ty };
        if (targetEl.current) {
          targetEl.current.style.left = tx + "px";
          targetEl.current.style.top = ty + "px";
        }
      }
    }

    // Wink tooltip follows the winking fake
    const wi = winkingIdxRef.current;
    if (wi >= 0 && winkEl.current) {
      const f = fakes.current[wi];
      winkEl.current.style.left = f.x + 18 + "px";
      winkEl.current.style.top = f.y - 8 + "px";
    }

    animRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [loop]);

  async function explodeAt(x: number, y: number) {
    let M: any;
    try {
      const mod = await import("matter-js");
      M = (mod as any).default ?? mod;
    } catch { return; }
    const { Engine, Bodies, Body, World, Runner } = M;

    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;

    const engine = Engine.create({ gravity: { x: 0, y: 2 } });
    World.add(engine.world, Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 30, window.innerWidth * 3, 60, { isStatic: true }));

    const pieces: { body: any; w: number; h: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 4 + Math.random() * 7;
      const w = 5 + Math.random() * 8;
      const h = 5 + Math.random() * 8;
      const b = Bodies.rectangle(x, y, w, h, { restitution: 0.5, friction: 0.4 });
      Body.setVelocity(b, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 3 });
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.4);
      World.add(engine.world, b);
      pieces.push({ body: b, w, h });
    }

    const runner = Runner.create();
    Runner.run(runner, engine);
    const start = Date.now();
    let frame: number;

    const draw = () => {
      const elapsed = Date.now() - start;
      const alpha = Math.max(0, 1 - elapsed / 1800);
      if (alpha <= 0) { cancelAnimationFrame(frame); Runner.stop(runner); canvas.remove(); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = alpha;
      for (const { body: b, w, h } of pieces) {
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.fillStyle = "#1e40af";
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    draw();
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      const src = e instanceof MouseEvent ? e : e.touches[0];
      if (!src) return;
      mouse.current = { x: src.clientX, y: src.clientY };
      if (isMobileRef.current) touchPos.current = { x: src.clientX, y: src.clientY };
      if (stateRef.current === "idle") go("playing");
    }

    function onTouchStart(e: TouchEvent) {
      const src = e.touches[0];
      if (!src) return;
      mouse.current = { x: src.clientX, y: src.clientY };
      touchPos.current = { x: src.clientX, y: src.clientY };
      if (stateRef.current === "idle") go("playing");
    }

    function onTouchEnd() {
      touchPos.current = null;
      holdStart.current = null;
      if (holdArcEl.current) holdArcEl.current.style.strokeDasharray = `0 ${ARC_C}`;
    }

    function onClick(e: MouseEvent | TouchEvent) {
      if (isMobileRef.current) return;
      if (stateRef.current !== "playing") return;
      const src = e instanceof MouseEvent ? e : (e as TouchEvent).changedTouches[0];
      if (!src) return;
      const { x: tx, y: ty } = targetPos.current;
      const realDist = Math.hypot(src.clientX - tx, src.clientY - ty);

      if (realDist <= TARGET_R) {
        const fakeOnTarget = fakes.current.some(
          f => Math.hypot(f.x - tx, f.y - ty) < TARGET_R * 0.8
        );
        if (fakeOnTarget) {
          let closest = -1, closestD = Infinity;
          fakes.current.forEach((f, i) => {
            const d = Math.hypot(f.x - tx, f.y - ty);
            if (d < closestD) { closestD = d; closest = i; }
          });
          if (closest >= 0) {
            winkingIdxRef.current = closest;
            setWinkingIdx(closest);
            setAttempts(n => n + 1);
            go("lost");
            setTimeout(() => {
              winkingIdxRef.current = -1;
              setWinkingIdx(-1);
              go("playing");
            }, 2000);
          }
          return;
        }
        cancelAnimationFrame(animRef.current);
        fakes.current.forEach(f => explodeAt(f.x, f.y));
        go("won");
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      let closestIdx = -1;
      let closestDist = Infinity;
      fakes.current.forEach((f, i) => {
        const d = Math.hypot(f.x - tx, f.y - ty);
        if (d <= TARGET_R && d < closestDist) { closestDist = d; closestIdx = i; }
      });

      if (closestIdx >= 0) {
        winkingIdxRef.current = closestIdx;
        setWinkingIdx(closestIdx);
        setAttempts(n => n + 1);
        go("lost");
        setTimeout(() => {
          winkingIdxRef.current = -1;
          setWinkingIdx(-1);
          go("playing");
        }, 2000);
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [loop]);

  function playAgain() {
    cancelAnimationFrame(animRef.current);
    fakes.current = fakes.current.map(() => ({ ...mouse.current }));
    setAttempts(0);
    winkingIdxRef.current = -1;
    setWinkingIdx(-1);
    touchPos.current = null;
    holdStart.current = null;
    targetVel.current = { x: 0, y: 0 };
    if (holdArcEl.current) holdArcEl.current.style.strokeDasharray = `0 ${ARC_C}`;
    go("playing");
    animRef.current = requestAnimationFrame(loop);
  }

  return (
    <div style={{ background: "#fff", width: "100vw", height: "100dvh", position: "relative", overflow: "hidden", cursor: isMobile ? "auto" : "none" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; overflow: hidden; }
        @keyframes winkBounce {
          0%   { transform: scale(1)   rotate(-8deg); }
          50%  { transform: scale(1.3) rotate(0deg);  }
          100% { transform: scale(1)   rotate(8deg);  }
        }
        @keyframes winkFade {
          from { opacity: 0; transform: translateY(4px) scale(0.8); }
          to   { opacity: 1; transform: translateY(0)   scale(1);   }
        }
        @keyframes emojiFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      {/* Moving target */}
      {(gameState === "playing" || gameState === "lost") && (
        <div
          ref={targetEl}
          style={{
            position: "fixed", left: -200, top: -200,
            transform: "translate(-50%, -50%)",
            width: TARGET_R * 2, height: TARGET_R * 2,
            borderRadius: "50%",
            border: "2px solid rgba(96,165,250,0.55)",
            pointerEvents: "none", zIndex: 100,
          }}
        >
          <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "28%", background: "rgba(96,165,250,0.45)", transform: "translateX(-50%)" }} />
          <div style={{ position: "absolute", left: "50%", bottom: 0, width: 1, height: "28%", background: "rgba(96,165,250,0.45)", transform: "translateX(-50%)" }} />
          <div style={{ position: "absolute", top: "50%", left: 0, height: 1, width: "28%", background: "rgba(96,165,250,0.45)", transform: "translateY(-50%)" }} />
          <div style={{ position: "absolute", top: "50%", right: 0, height: 1, width: "28%", background: "rgba(96,165,250,0.45)", transform: "translateY(-50%)" }} />
          {/* Hold arc — mobile only */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
            viewBox={`0 0 ${TARGET_R * 2} ${TARGET_R * 2}`}
          >
            <circle
              ref={holdArcEl}
              cx={TARGET_R}
              cy={TARGET_R}
              r={TARGET_R - 4}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray={`0 ${ARC_C}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${TARGET_R} ${TARGET_R})`}
            />
          </svg>
        </div>
      )}

      {/* Real cursor — desktop only */}
      {!isMobile && (
        <div ref={cursorRealEl} style={{ position: "fixed", left: -200, top: -200, pointerEvents: "none", zIndex: 9998 }}><CursorIcon /></div>
      )}

      {/* Fakes — hidden during celebration, desktop only */}
      {gameState !== "won" && !isMobile && (
        <>
          <div ref={fake1El} style={{ position: "fixed", left: -200, top: -200, pointerEvents: "none", zIndex: 9997 }}><CursorIcon /></div>
          <div ref={fake2El} style={{ position: "fixed", left: -200, top: -200, pointerEvents: "none", zIndex: 9996 }}><CursorIcon /></div>
          <div ref={fake3El} style={{ position: "fixed", left: -200, top: -200, pointerEvents: "none", zIndex: 9995 }}><CursorIcon /></div>
        </>
      )}

      {/* Celebration emoji on the real cursor when won */}
      {gameState === "won" && (
        <div
          ref={celebrationEmojiEl}
          style={{
            position: "fixed", left: -200, top: -200,
            fontSize: "1.4rem", pointerEvents: "none", zIndex: 9999,
            animation: "winkFade 0.15s ease, emojiFadeOut 0.3s 1s ease forwards",
          }}
        >
          😎
        </div>
      )}

      {/* Wink emoji on the fake that fooled the user */}
      {winkingIdx >= 0 && (
        <div
          ref={winkEl}
          style={{
            position: "fixed", left: -200, top: -200,
            fontSize: "1.4rem", pointerEvents: "none", zIndex: 9999,
            animation: "winkBounce 0.25s ease infinite alternate, winkFade 0.15s ease",
          }}
        >
          😏
        </div>
      )}

      {/* Idle */}
      {gameState === "idle" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", pointerEvents: "none" }}>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>Cuatro cursores</p>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)" }}>
            {isMobile ? "Toca la pantalla para empezar" : "Mueve el ratón para empezar"}
          </p>
        </div>
      )}

      {/* Hint during play */}
      {(gameState === "playing" || gameState === "lost") && (
        <div style={{ position: "absolute", top: "2rem", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", pointerEvents: "none" }}>
          {isMobile ? (
            <p style={{ fontSize: "0.78rem", color: "#d1d5db", fontFamily: "var(--font-geist-mono, monospace)" }}>
              Mantén el dedo sobre la diana
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.78rem", color: "#d1d5db", fontFamily: "var(--font-geist-mono, monospace)" }}>
                Haz clic en el objetivo con el cursor correcto
              </p>
              {attempts === 1 && <p style={{ fontSize: "0.68rem", color: "#d1d5db", fontFamily: "var(--font-geist-mono, monospace)" }}>Tienes que estar solo en el objetivo...</p>}
              {attempts === 2 && <p style={{ fontSize: "0.68rem", color: "#d1d5db", fontFamily: "var(--font-geist-mono, monospace)" }}>Muévete rápido. Deja a las réplicas atrás.</p>}
              {attempts >= 3 && <p style={{ fontSize: "0.68rem", color: "#d1d5db", fontFamily: "var(--font-geist-mono, monospace)" }}>El cursor real debe llegar solo al objetivo.</p>}
            </>
          )}
        </div>
      )}

      {/* Won */}
      {gameState === "won" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#3b82f6", letterSpacing: "-0.03em" }}>
            {isMobile ? "¡La atrapaste!" : "¡Lo encontraste!"}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textAlign: "center", maxWidth: "32ch", lineHeight: 1.65 }}>
            {isMobile
              ? "Sabías que tenías que aguantarla. Lo difícil era que no escapara."
              : "Sabías cuál era. Lo difícil era llegar solo."}
          </p>
          <button onClick={playAgain} style={{ marginTop: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono, monospace)" }}>
            Otra vez →
          </button>
        </div>
      )}

      <a
        href="/extras"
        style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", zIndex: 10, transition: "color 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
      >
        pacr.es
      </a>
    </div>
  );
}
