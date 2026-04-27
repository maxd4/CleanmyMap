import { auth } from"@clerk/nextjs/server";
import { z } from"zod";
import { NextResponse } from"next/server";
import {
 getChecklistProgress,
 upsertChecklistProgress,
} from"@/lib/sections/checklist-progress-store";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";

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

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json(
 { error:"Invalid JSON payload" },
 { status: 400 },
 );
 }

 const parsed = payloadSchema.safeParse(payload);
 if (!parsed.success) {
 return NextResponse.json(
 { error:"Invalid payload", details: parsed.error.flatten().fieldErrors },
 { status: 400 },
 );
 }

 const entry = await upsertChecklistProgress(
 userId,
 parsed.data.checklistId,
 parsed.data.checks,
 );
 return NextResponse.json({ status:"ok", entry });
}
