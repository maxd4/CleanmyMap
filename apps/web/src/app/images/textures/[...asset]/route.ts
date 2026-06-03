import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TextureKey = "parchment.svg" | "bronze-map.svg" | "silver-map.svg" | "gold-topo.svg" | "diamond-holo.svg" | "cosmic-holo.svg";

const TEXTURES = {
  "parchment.svg": {
    markup: `
      <rect width="256" height="256" fill="#f5e6c8"/>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="5"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.10"/>
        </feComponentTransfer>
      </filter>
      <rect width="256" height="256" filter="url(#noise)" fill="#000"/>
    `,
  },
  "bronze-map.svg": {
    markup: `
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#9a3412"/>
          <stop offset="100%" stop-color="#c08457"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="url(#g)"/>
      <path d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256" stroke="#fff" stroke-opacity="0.08" stroke-width="2"/>
    `,
  },
  "silver-map.svg": {
    markup: `
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="url(#g)"/>
      <circle cx="64" cy="64" r="22" fill="#fff" fill-opacity="0.12"/>
      <circle cx="192" cy="192" r="32" fill="#fff" fill-opacity="0.10"/>
    `,
  },
  "gold-topo.svg": {
    markup: `
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#854d0e"/>
          <stop offset="100%" stop-color="#facc15"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="url(#g)"/>
      <path d="M0 32C48 16 96 16 144 32s96 16 112 0M0 96c48-16 96-16 144 0s96 16 112 0M0 160c48-16 96-16 144 0s96 16 112 0M0 224c48-16 96-16 144 0s96 16 112 0" fill="none" stroke="#fff" stroke-opacity="0.16" stroke-width="6"/>
    `,
  },
  "diamond-holo.svg": {
    markup: `
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#155e75"/>
          <stop offset="50%" stop-color="#22d3ee"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" fill="#0f172a"/>
      <path d="M128 24l72 72-72 136-72-136z" fill="url(#g)" fill-opacity="0.88"/>
      <path d="M128 48l46 46-46 86-46-86z" fill="#fff" fill-opacity="0.14"/>
    `,
  },
  "cosmic-holo.svg": {
    markup: `
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
      </defs>
      <rect width="256" height="256" fill="url(#g)"/>
      <circle cx="72" cy="76" r="6" fill="#cbd5e1" fill-opacity="0.5"/>
      <circle cx="172" cy="48" r="3" fill="#f8fafc" fill-opacity="0.8"/>
      <circle cx="196" cy="152" r="5" fill="#a5f3fc" fill-opacity="0.7"/>
      <circle cx="88" cy="184" r="4" fill="#34d399" fill-opacity="0.8"/>
    `,
  },
} satisfies Record<TextureKey, { markup: string }>;

function buildSvg(key: TextureKey) {
  const texture = TEXTURES[key];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" preserveAspectRatio="none">${texture.markup}</svg>`,
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
  const key = `${asset.join("/")}.svg` as TextureKey;

  if (!(key in TEXTURES)) {
    return NextResponse.json({ status: "error", error: "Texture introuvable." }, { status: 404 });
  }

  return buildSvg(key);
}

