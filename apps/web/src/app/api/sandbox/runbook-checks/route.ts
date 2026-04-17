import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  listRunbookChecks,
  upsertRunbookCheck,
} from "@/lib/sections/runbook-checks-store";

export const runtime = "nodejs";

const payloadSchema = z.object({
  profile: z.enum(["ops", "admin", "dev"]),
  status: z.enum(["pass", "fail"]),
  durationSeconds: z.number().int().min(1).max(3600),
  notes: z.array(z.string().min(1).max(200)).min(1).max(8),
});

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const data = await listRunbookChecks();
  return NextResponse.json({ status: "ok", ...data });
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = await upsertRunbookCheck(parsed.data);
  return NextResponse.json({ status: "ok", ...data });
}
