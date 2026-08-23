import { ImageResponse } from "next/og";

// El icono de acceso directo de la portada (/): corazón naranja, como su favicon. El resto del
// sitio hereda el lima de app/apple-icon.tsx, que es donde está el porqué de que este archivo
// exista aparte del favicon.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="176" height="176" viewBox="2 3 20 18.4" fill="#ff6a35">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
