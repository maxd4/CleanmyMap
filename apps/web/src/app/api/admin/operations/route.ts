import { NextResponse } from"next/server";
import { requireAdminAccess } from"@/lib/authz";
import { listAdminOperationAuditPage, projectAdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import { adminErrorResponse, newOperationId } from"@/lib/admin/response";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { parsePositiveInteger } from "@/lib/http/query-params";

export const runtime ="nodejs";

export async function GET(request: Request) {
 const operationId = newOperationId();
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access, operationId);
 }

 const url = new URL(request.url);
 const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 500, 50);
 const from = url.searchParams.get("from")?.trim() || null;
 const to = url.searchParams.get("to")?.trim() || null;
 if ((from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to)))) {
   return NextResponse.json({ error: "Invalid audit period" }, { status: 400 });
 }

 try {
 const page = await listAdminOperationAuditPage(limit, {
   actorUserId: url.searchParams.get("actorUserId"),
   operationType: (url.searchParams.get("operationType") as "moderation" | "import_dry_run" | "import_confirm" | "role_management" | "admin_operation" | "spogomi_team_name_rename" | null),
   operation: url.searchParams.get("operation"),
   outcome: (url.searchParams.get("outcome") as "success" | "error" | null),
   targetId: url.searchParams.get("targetId"),
   from,
   to,
   cursor: url.searchParams.get("cursor"),
 });
 const items = page.items.map(projectAdminOperationAuditEntry);
 return NextResponse.json({ status:"ok", count: items.length, items, hasMore: page.hasMore, nextCursor: page.nextCursor });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";
 console.error("[Admin Operations] Listing failed", {
  operationId,
  message,
 });
  return adminErrorResponse({
    status: 500,
    code:"server_error",
    message:"La lecture des opérations a échoué.",
    hint:"Reessaye dans quelques secondes ou verifie le stockage local d'audit.",
    operationId,
  });
 }
}
