import { ImageResponse } from "next/og";

export const alt = "Scrap Mechanic Search Engine — a searchable directory of Steam Workshop creations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default 1200×630 OG card, used for every page that doesn't define its
// own `opengraph-image.tsx` (home, /new, /search, /[kind], /creators,
// /suggestions, etc.). The dynamic image path is content-hashed per
// build so Discord / Facebook / Twitter cache busts cleanly whenever the
// artwork changes — a plain static `/logo-square.png` reference would
// stay cached in Discord's CDN for a day or more after we changed it.
//
// The logo file is served from /logo-square.png in the public directory;
// we fetch it relative to the deployment's base URL and embed it as a
// data URL so ImageResponse doesn't need an extra network round-trip
// per render.
async function loadLogo(): Promise<string | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL;
    if (!base) return null;
    const res = await fetch(new URL("/logo-square.png", base).toString(), {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const logo = await loadLogo();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #0b0f14 0%, #1a1f2e 50%, #0b0f14 100%)",
          color: "#e5e7eb",
          fontFamily: "sans-serif",
          padding: "64px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                width={140}
                height={140}
                style={{
                  borderRadius: 24,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 140,
                  height: 140,
                  borderRadius: 24,
                  background: "#f59e0b",
                  color: "#0b0f14",
                  fontSize: 80,
                  fontWeight: 800,
                }}
              >
                /S
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 64,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.05,
                }}
              >
                Scrap Mechanic
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 64,
                  fontWeight: 800,
                  color: "#f59e0b",
                  lineHeight: 1.05,
                }}
              >
                Search Engine
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 36,
                color: "#cbd5e1",
                lineHeight: 1.3,
              }}
            >
              A free, searchable directory of every kind of Scrap Mechanic
              Workshop creation.
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {[
                "Blueprints",
                "Mods",
                "Worlds",
                "Challenges",
                "Tiles",
                "Custom Games",
              ].map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "flex",
                    padding: "8px 18px",
                    borderRadius: 999,
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "2px solid #f59e0b",
                    color: "#fcd34d",
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
