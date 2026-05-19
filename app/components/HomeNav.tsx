"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const VARIANTS = [
  { href: "/home/original", title: "original" },
  { href: "/home/minimalista", title: "minimalista" },
  { href: "/home/dark", title: "dark" },
  { href: "/home/neon", title: "neon" },
  { href: "/home/timeline", title: "timeline" },
];

const MINIMALISTA_HREFS = new Set(["/", "/home", "/home/original"]);

export default function HomeNav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false); // mobile tap state
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  const current = MINIMALISTA_HREFS.has(pathname ?? "") ? "/home/original" : (pathname ?? "");
  const isOpen = hovered || expanded;

  // Click outside → collapse (mobile)
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [expanded]);

  const handleMouseEnter = () => {
    clearTimeout(leaveTimer.current);
    setHovered(true);
  };

  // Debounce collapse to prevent vibration at the boundary
  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 250);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        bottom: "1.2rem",
        right: "1.2rem",
        zIndex: 9999,
        padding: "0.5rem",  // buffer zone — prevents vibration at edges
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {VARIANTS.map((v) => {
          const isActive = v.href === current;
          return (
            <Link
              key={v.href}
              href={v.href}
              title={v.title}
              onClick={(e) => {
                // Mobile: first tap expands, second tap navigates
                if (!isOpen) {
                  e.preventDefault();
                  setExpanded(true);
                } else {
                  setExpanded(false);
                }
              }}
              style={{
                fontSize: isOpen ? "0.65rem" : "1rem",
                lineHeight: 1,
                color: isActive
                  ? isOpen ? "rgba(220,220,220,0.98)" : "rgba(180,180,180,0.7)"
                  : isOpen
                  ? "rgba(150,150,150,0.8)"
                  : "rgba(160,160,160,0.5)",
                textDecoration: "none",
                transition: "color 0.2s, font-size 0.15s",
                letterSpacing: isOpen ? "0.04em" : 0,
                fontFamily: "var(--font-geist-mono, monospace)",
                userSelect: "none",
                whiteSpace: "nowrap",
              }}
            >
              {isOpen ? v.title : "·"}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
