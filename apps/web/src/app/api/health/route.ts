import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "cleanmymap-web",
    timestamp: new Date().toISOString(),
  });
}
