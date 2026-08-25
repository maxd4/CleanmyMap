import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";

const BOT_ID_CHECK_OPTIONS = {
  advancedOptions: { checkLevel: "basic" as const },
};

export const BOT_ID_REJECTION_BODY = {
  error: "Access denied",
  code: "BOT_DETECTED",
} as const;

export async function requireBotIdHuman(): Promise<NextResponse | null> {
  const verification = await checkBotId(BOT_ID_CHECK_OPTIONS);

  if (!verification.isBot) {
    return null;
  }

  return NextResponse.json(BOT_ID_REJECTION_BODY, {
    status: 403,
    headers: { "Cache-Control": "no-store" },
  });
}
