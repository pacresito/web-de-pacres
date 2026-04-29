import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "linear-gradient(135deg, #0f0c29, #302b63)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: -0.5,
          fontFamily: "sans-serif",
        }}
      >
        ♥
      </div>
    ),
    { ...size }
  );
}
