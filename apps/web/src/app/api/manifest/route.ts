import { NextResponse } from "next/server";
import { BRAND_ASSET_PATHS } from "@/components/brand/brand-assets";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      name: "CleanMyMap",
      short_name: "CleanMyMap",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0f766e",
      icons: [
        {
          src: BRAND_ASSET_PATHS.compact,
          sizes: "any",
          type: "image/png",
          purpose: "any",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    },
  );
}
