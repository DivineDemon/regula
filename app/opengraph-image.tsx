import { ImageResponse } from "next/og";

export const alt =
  "Regula — AI-powered regulatory compliance monitoring for FinTech";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 72,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "#f8fafc",
          letterSpacing: "-0.02em",
        }}
      >
        Regula
      </div>
      <div
        style={{
          fontSize: 28,
          color: "#94a3b8",
          marginTop: 20,
          maxWidth: 920,
          lineHeight: 1.35,
        }}
      >
        AI-powered regulatory compliance monitoring for emerging-market FinTechs
      </div>
    </div>,
    { ...size },
  );
}
