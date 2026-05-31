"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  question: string;
  date?: string;
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
  style?: React.CSSProperties;
}

export default function WhyFooter({ question, date, children, onOpenChange, style }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
    if (next) setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }

  return (
    <div style={{ paddingTop: "1.5rem", paddingBottom: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", ...style }}>
      <button className="ts-why-btn" onClick={toggle}>
        {question}
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div ref={ref} className="ts-why-box" style={{ maxWidth: 420, textAlign: "left" }}>
          {children}
          {date && <p style={{ color: "var(--t-ink4)", fontSize: "0.72rem" }}>↳ Creado el {date}</p>}
        </div>
      )}
    </div>
  );
}
