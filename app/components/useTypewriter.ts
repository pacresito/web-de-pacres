"use client";

import { useEffect, useRef, useState } from "react";

// Teclea un comando carácter a carácter y, al terminar, fija un execMs simulado
// (`↳ Nms`). Centraliza el bloque setTimeout→setInterval que estaba copiado en cv,
// lab, designs, manifesto y TerminalShell, con el cleanup CORRECTO: un único return
// del effect que limpia el timeout de arranque, el intervalo de tecleo y el timeout
// del execMs. Antes el `return () => clearInterval(iv)` vivía dentro del callback de
// setTimeout y se descartaba, dejando timers vivos si el componente se desmontaba a
// mitad de tecleo (I1).
export function useTypewriter(
  text: string,
  opts: {
    active?: boolean;     // si false no arranca (cv lo usa hasta que toca su turno)
    startDelay?: number;  // espera antes del primer carácter
    charMs?: number;      // ms por carácter
    postDelay?: number;   // espera entre fin de tecleo y aparición del execMs
    execBase?: number;    // execMs = text.length*execBase + rand(0..30) - 15
    onDone?: () => void;  // se dispara cuando se fija el execMs (fin real)
  } = {},
): { typed: string; done: boolean; execMs: number | null } {
  const {
    active = true,
    startDelay = 120,
    charMs = 26,
    postDelay = 90,
    execBase = 3,
    onDone,
  } = opts;

  const [typed, setTyped] = useState("");
  const [execMs, setExecMs] = useState<number | null>(null);

  // Guarda el onDone más reciente sin re-disparar el effect de tecleo (TerminalShell
  // pasa un arrow inline que cambia en cada render).
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) return;
    let i = 0;
    let iv: ReturnType<typeof setInterval>;
    let post: ReturnType<typeof setTimeout>;
    const init = setTimeout(() => {
      iv = setInterval(() => {
        i++;
        setTyped(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(iv);
          const ms = text.length * execBase + Math.floor(Math.random() * 31) - 15;
          post = setTimeout(() => {
            setExecMs(ms);
            onDoneRef.current?.();
          }, postDelay);
        }
      }, charMs);
    }, startDelay);
    return () => {
      clearTimeout(init);
      clearInterval(iv);
      clearTimeout(post);
    };
  }, [text, active, startDelay, charMs, postDelay, execBase]);

  const done = text.length > 0 && typed.length >= text.length;
  return { typed, done, execMs };
}
