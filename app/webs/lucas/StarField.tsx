'use client';
import { useEffect, useRef } from 'react';

const STAR_COUNT = 22;
const FADE_MS = 3000;
const HOLD_MIN = 5000;
const HOLD_MAX = 10000;

export default function StarField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    function reposition(el: HTMLDivElement) {
      const size = 1.5 + Math.random() * 1.2;
      const maxOpacity = 0.3 + Math.random() * 0.35;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      el.dataset.max = String(maxOpacity);
    }

    function cycle(el: HTMLDivElement, initialDelay: number) {
      const t = setTimeout(function run() {
        reposition(el);
        // small tick so reposition applies before transition kicks in
        const t2 = setTimeout(() => {
          el.style.opacity = el.dataset.max ?? '0.15';
          const hold = HOLD_MIN + Math.random() * (HOLD_MAX - HOLD_MIN);
          const t3 = setTimeout(() => {
            el.style.opacity = '0';
            const t4 = setTimeout(() => {
              const t5 = setTimeout(run, 0);
              timers.push(t5);
            }, FADE_MS + 300);
            timers.push(t4);
          }, hold);
          timers.push(t3);
        }, 50);
        timers.push(t2);
      }, initialDelay);
      timers.push(t);
    }

    const stars: HTMLDivElement[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(180,210,240,1);
        pointer-events: none;
        opacity: 0;
        transition: opacity ${FADE_MS}ms ease;
        will-change: opacity;
      `;
      container.appendChild(el);
      stars.push(el);
      cycle(el, Math.random() * 18000);
    }

    return () => {
      timers.forEach(clearTimeout);
      stars.forEach(el => el.remove());
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
