import { ImageResponse } from "next/og";
import { getCreationDetail } from "@/lib/db/queries";

export const alt = "Scrap Mechanic Search";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const KIND_LABEL: Record<string, string> = {
  blueprint: "Blueprint",
  mod: "Mod",
  world: "World",
  challenge: "Challenge",
  tile: "Tile",
  custom_game: "Custom Game",
  terrain_asset: "Terrain",
  other: "Other",
};

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCreationDetail(id);
  if (!detail || detail.creation.status !== "approved") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0b0f14",
            color: "#e5e7eb",
            fontSize: 56,
          }}
        >
          Scrap Mechanic Search
        </div>
      ),
      size,
    );
  }

  const { creation } = detail;
  const kindLabel = KIND_LABEL[creation.kind] ?? "Creation";
  const title = creation.title.length > 90 ? creation.title.slice(0, 87) + "…" : creation.title;
  const author = creation.authorName ?? "Unknown creator";
  const thumb = creation.thumbnailUrl;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "#0b0f14",
          color: "#e5e7eb",
          fontFamily: "sans-serif",
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.35)",
            }}
          />
        ) : null}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: "56px 64px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "#f59e0b",
                color: "#0b0f14",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              /S
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#f3f4f6" }}>
              Scrap Mechanic Search
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: 999,
                background: "#f59e0b",
                color: "#0b0f14",
                fontSize: 24,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {kindLabel}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 50 ? 64 : 80,
                fontWeight: 800,
                lineHeight: 1.05,
                color: "#ffffff",
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: "#cbd5e1" }}>by {author}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
