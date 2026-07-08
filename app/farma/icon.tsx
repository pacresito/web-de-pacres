import { ImageResponse } from "next/og";

// Favicon propio de /farma/*: cruz verde de farmacia sobre fondo blanco. Misma idea
// (y misma caja blanca redondeada) que el corazón naranja de app/icon.tsx, pero como
// esta ruta es la herramienta de farmacia. Next aplica este icon.tsx solo a /farma/*.
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#00A94F">
          <rect x="8.5" y="3.5" width="7" height="17" rx="1.5" />
          <rect x="3.5" y="8.5" width="17" height="7" rx="1.5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
