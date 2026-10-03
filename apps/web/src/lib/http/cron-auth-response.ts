import { NextResponse } from "next/server";

export function cronUnauthorizedResponse() {
  return NextResponse.json(
    {
      status: "error",
      error: "Unauthorized",
      hint: "Configure CRON_SECRET in Vercel and keep the cron route private.",
    },
    { status: 401 },
  );
}
