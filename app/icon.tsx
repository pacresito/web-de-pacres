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
          background: "#ffffff",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#3b82f6",
          fontSize: 20,
          fontFamily: "sans-serif",
        }}
      >
        ♥
      </div>
    ),
    { ...size }
  );
}
