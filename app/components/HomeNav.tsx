"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const VARIANTS = [
  { label: "·", href: "/", title: "minimalista" },
  { label: "·", href: "/home/dark", title: "dark" },
  { label: "·", href: "/home/neon", title: "neon" },
];

const ACTIVE_HREFS = new Set(["/", "/home", "/home/minimalista"]);

export default function HomeNav() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  const current = ACTIVE_HREFS.has(pathname ?? "") ? "/" : (pathname ?? "");

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.2rem",
        right: "1.2rem",
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        zIndex: 9999,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {VARIANTS.map((v) => {
        const isActive = v.href === current;
        return (
          <Link
            key={v.href}
            href={v.href}
            title={v.title}
            style={{
              fontSize: hovered ? "0.65rem" : "1.1rem",
              lineHeight: 1,
              color: isActive
                ? "rgba(180,180,180,0.9)"
                : hovered
                ? "rgba(140,140,140,0.7)"
                : "rgba(100,100,100,0.35)",
              textDecoration: "none",
              transition: "color 0.2s, font-size 0.15s",
              letterSpacing: hovered ? "0.05em" : 0,
              fontFamily: "var(--font-geist-mono, monospace)",
              userSelect: "none",
            }}
          >
            {hovered ? v.title : "·"}
          </Link>
        );
      })}
    </div>
  );
}
