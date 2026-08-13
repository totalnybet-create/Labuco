import { ImageResponse } from "next/og";
import { getStoreDescription, getStoreName } from "@/lib/store";

export const runtime = "edge";

export function GET() {
  const storeName = getStoreName();
  const description = getStoreDescription();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        color: "#ecfdf5",
        background:
          "linear-gradient(135deg, #022c22 0%, #064e3b 58%, #047857 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg width="112" height="112" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="12" fill="#34d399" />
          <path
            d="M20 29V17.5"
            fill="none"
            stroke="#022c22"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M19.8 20.5c-5.6 0-9.2-3.3-9.2-8.4 5.7-.3 9.1 2.5 9.2 8.4Z"
            fill="none"
            stroke="#022c22"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M20.2 17.7c.1-5.6 3.5-8.5 9.2-8.2 0 5.1-3.6 8.3-9.2 8.2Z"
            fill="none"
            stroke="#022c22"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: "-6px",
          }}
        >
          {storeName}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            display: "flex",
            color: "#6ee7b7",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "5px",
            textTransform: "uppercase",
          }}
        >
          Growshop • uprawa indoor
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 980,
            color: "#d1fae5",
            fontSize: 38,
            lineHeight: 1.25,
          }}
        >
          {description}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
