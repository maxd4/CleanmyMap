import { NextResponse } from "next/server";

export const runtime = "nodejs";

type BrandAssetKey = "logo-cleanmymap-officiel.svg" | "logo-cleanmymap.svg" | "nouveau-logo.svg" | "pictogramme-cleanmymap.svg";

const BRAND_SVG = {
  "logo-cleanmymap-officiel.svg": {
    width: 640,
    height: 180,
    markup: `
      <rect width="640" height="180" rx="36" fill="#0f172a"/>
      <circle cx="96" cy="90" r="50" fill="#10b981"/>
      <circle cx="96" cy="90" r="26" fill="#ecfeff" opacity="0.9"/>
      <text x="176" y="82" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">CleanMyMap</text>
      <text x="176" y="124" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="22">Plateforme citoyenne de dépollution</text>
    `,
  },
  "logo-cleanmymap.svg": {
    width: 1200,
    height: 630,
    markup: `
      <rect width="1200" height="630" rx="48" fill="#0f172a"/>
      <rect x="58" y="58" width="1084" height="514" rx="36" fill="none" stroke="#34d399" stroke-width="6" opacity="0.55"/>
      <circle cx="210" cy="315" r="114" fill="#059669"/>
      <path d="M210 230c-48 0-86 38-86 85s38 85 86 85 86-38 86-85-38-85-86-85Zm0 40c25 0 46 20 46 45s-21 45-46 45-46-20-46-45 21-45 46-45Z" fill="#ecfeff"/>
      <text x="390" y="292" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="66" font-weight="800">CleanMyMap</text>
      <text x="390" y="360" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="30">Carte citoyenne de dépollution, de coordination et d’impact</text>
      <text x="390" y="414" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="24">Version générée par le code, sans dossier public statique</text>
    `,
  },
  "nouveau-logo.svg": {
    width: 1200,
    height: 630,
    markup: `
      <rect width="1200" height="630" rx="48" fill="#052e2b"/>
      <circle cx="170" cy="315" r="100" fill="#14b8a6"/>
      <circle cx="170" cy="315" r="52" fill="#f0fdfa" opacity="0.95"/>
      <text x="320" y="278" fill="#ecfeff" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800">CleanMyMap</text>
      <text x="320" y="342" fill="#99f6e4" font-family="Arial, Helvetica, sans-serif" font-size="26">Logo alternatif généré côté serveur</text>
      <text x="320" y="388" fill="#ccfbf1" font-family="Arial, Helvetica, sans-serif" font-size="22">Utilisé pour les métadonnées et les aperçus</text>
    `,
  },
  "pictogramme-cleanmymap.svg": {
    width: 128,
    height: 128,
    markup: `
      <rect width="128" height="128" rx="32" fill="#134e4a"/>
      <circle cx="64" cy="64" r="34" fill="#2dd4bf"/>
      <text x="64" y="77" text-anchor="middle" fill="#022c22" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">CM</text>
    `,
  },
} satisfies Record<BrandAssetKey, { width: number; height: number; markup: string }>;

function buildSvg(key: BrandAssetKey) {
  const asset = BRAND_SVG[key];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${asset.width} ${asset.height}" role="img" aria-label="CleanMyMap">${asset.markup}</svg>`,
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string[] }> },
) {
  const { asset } = await context.params;
  const key = asset.join("/") as BrandAssetKey;

  if (!(key in BRAND_SVG)) {
    return NextResponse.json({ status: "error", error: "Asset introuvable." }, { status: 404 });
  }

  return buildSvg(key);
}

