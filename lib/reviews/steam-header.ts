// Steam's CDN serves the standard header image at this path for any
// public app, so we don't need to burn Steam API quota fetching it.
export function steamHeaderUrl(
  steamAppId: number | null | undefined,
): string | null {
  if (!steamAppId || !Number.isFinite(steamAppId)) return null;
  return `https://shared.cdn.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/header.jpg`;
}
