import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b0b0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <div style={{ width: 14, height: 30, background: "#c6ff3d", borderRadius: 5 }} />
        <div style={{ width: 18, height: 60, background: "#c6ff3d", borderRadius: 6 }} />
        <div style={{ width: 40, height: 14, background: "#c6ff3d", borderRadius: 4 }} />
        <div style={{ width: 18, height: 60, background: "#c6ff3d", borderRadius: 6 }} />
        <div style={{ width: 14, height: 30, background: "#c6ff3d", borderRadius: 5 }} />
      </div>
    ),
    size,
  );
}
