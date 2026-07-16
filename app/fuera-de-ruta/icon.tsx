import { ImageResponse } from "next/og";

// Favicon propio de /fuera-de-ruta/*: brújula plana verde sobre caja blanca. Misma idea
// (y misma caja blanca redondeada) que el corazón de app/icon.tsx y la cruz de
// farma, pero brújula porque esta ruta es la agencia de destinos. Next aplica este
// icon.tsx solo a /fuera-de-ruta/*.
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#2f7d4f">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
