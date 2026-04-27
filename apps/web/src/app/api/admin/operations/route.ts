import { NextResponse } from"next/server";
import { requireAdminAccess } from"@/lib/authz";
import { listAdminOperationAudit } from"@/lib/admin/operation-audit";
import { adminErrorResponse, newOperationId } from"@/lib/admin/response";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";

export const runtime ="nodejs";

function parsePositiveInteger(
 raw: string | null,
 min: number,
 max: number,
 fallback: number,
): number {
 if (raw === null || raw.trim() ==="") {
 return fallback;
 }
 const parsed = Number(raw);
 if (!Number.isFinite(parsed)) {
 return fallback;
 }
 return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(request: Request) {
 const operationId = newOperationId();
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access, operationId);
 }

 const url = new URL(request.url);
 const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 500, 50);

 try {
 const items = await listAdminOperationAudit(limit);
 return NextResponse.json({ status:"ok", count: items.length, items });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";
 return adminErrorResponse({
 status: 500,
 code:"server_error",
 message,
 hint:"Reessaye dans quelques secondes ou verifie le stockage local d'audit.",
 operationId,
 });
 }
}
