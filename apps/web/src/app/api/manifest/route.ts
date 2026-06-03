import { NextResponse } from "next/server";

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
      icons: [],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    },
  );
}

