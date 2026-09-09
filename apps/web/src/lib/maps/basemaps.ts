export type CartoBasemapId = "light" | "dark" | "voyager";

export type CartoBasemap = {
  attribution: string;
  url: string;
};

const CARTO_TILE_PATHS: Record<CartoBasemapId, string> = {
  light: "light_all",
  dark: "dark_all",
  voyager: "rastertiles/voyager",
};

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function buildCartoTileUrl(
  basemap: CartoBasemapId,
  apiKey = process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY,
): string {
  const baseUrl = `https://{s}.basemaps.cartocdn.com/${CARTO_TILE_PATHS[basemap]}/{z}/{x}/{y}{r}.png`;
  const normalizedApiKey = apiKey?.trim();

  return normalizedApiKey
    ? `${baseUrl}?key=${encodeURIComponent(normalizedApiKey)}`
    : baseUrl;
}

export const CARTO_BASEMAPS: Record<CartoBasemapId, CartoBasemap> = {
  light: { attribution: CARTO_ATTRIBUTION, url: buildCartoTileUrl("light") },
  dark: { attribution: CARTO_ATTRIBUTION, url: buildCartoTileUrl("dark") },
  voyager: { attribution: CARTO_ATTRIBUTION, url: buildCartoTileUrl("voyager") },
};
