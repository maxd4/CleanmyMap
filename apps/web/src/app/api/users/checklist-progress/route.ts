import { auth } from"@clerk/nextjs/server";
import { z } from"zod";
import { NextResponse } from"next/server";
import {
 getChecklistProgress,
 upsertChecklistProgress,
} from"@/lib/sections/checklist-progress-store";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { parseJsonBodyWithSchema } from"@/lib/security/validation";

export const runtime ="nodejs";

const payloadSchema = z.object({
 checklistId: z.string().min(1).max(120),
 checks: z.record(z.string(), z.boolean()),
});

export async function GET(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }
 const url = new URL(request.url);
 const checklistId = url.searchParams.get("checklistId");
 if (!checklistId) {
 return NextResponse.json(
 { error:"checklistId is required" },
 { status: 400 },
 );
 }
 const entry = await getChecklistProgress(userId, checklistId);
 return NextResponse.json({ status:"ok", entry });
}

export async function POST(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 const parsed = await parseJsonBodyWithSchema(request, payloadSchema);
 if (!parsed.ok) return parsed.response;

 const entry = await upsertChecklistProgress(
 userId,
 parsed.data.checklistId,
 parsed.data.checks,
 );
 return NextResponse.json({ status:"ok", entry });
}
