import { ImageResponse } from "next/og";

// Favicon propio de /webs/lagartijas: la mascota lagartija (rosa #ff5ca8) sobre la
// misma caja blanca redondeada que el resto de iconos (app/icon.tsx, farma,
// fuera-de-ruta). Silueta simplificada de la Lizard de la página. Solo /webs/lagartijas.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#ffffff",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 120 130" fill="none">
          {/* cola */}
          <path d="M60 92 q 34 20 15 52 q -6 18 -22 10" stroke="#ff5ca8" strokeWidth={13} strokeLinecap="round" />
          {/* patas */}
          <path d="M44 44 L18 30 M76 44 L102 30 M44 82 L16 96 M76 82 L104 96" stroke="#ff5ca8" strokeWidth={12} strokeLinecap="round" />
          {/* cuerpo y cabeza */}
          <ellipse cx={60} cy={62} rx={26} ry={40} fill="#ff5ca8" />
          <circle cx={60} cy={22} r={22} fill="#ff5ca8" />
          {/* ojos */}
          <circle cx={51} cy={19} r={4.5} fill="#fff" />
          <circle cx={69} cy={19} r={4.5} fill="#fff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
