import type {
 ActionListItem,
 ActionRecordType,
 ActionStatus,
} from"@/lib/actions/types";
import type { ReportScopeKind } from"@/lib/reports/scope";
import type { AdminRecordTypeFilter, AdminSelectedRecordType } from "./types";

export const ADMIN_SIGNALEMENTS_MODERATION_HREF =
 "/admin?moderation=signalements#workflow-administration";

export function parseAdminModerationParam(value: unknown): "signalements" | null {
 const candidate = Array.isArray(value) ? value[0] : value;
 return candidate === "signalements" ? "signalements" : null;
}

export function adminRecordTypeFilterToActionTypes(
 filter: AdminRecordTypeFilter,
): "all" | ActionRecordType | ActionRecordType[] {
 switch (filter) {
  case "actions":
   return "action";
  case "signalements":
   return ["spot", "clean_place"];
  case "spot":
   return "spot";
  case "clean_place":
   return "clean_place";
  default:
   return "all";
 }
}

export function resolveAdminSelectedRecordType(
 item: ActionListItem,
): AdminSelectedRecordType | null {
 const type = item.contract?.type;
 if (
  item.source === "trash_spotter_spots" &&
  (type === "spot" || type === "clean_place")
 ) {
  return type;
 }
 return type === "action" ? "action" : null;
}

export function buildExportQuery(params: {
 status: ActionStatus |"all";
 days: number;
 limit: number;
 scopeKind: ReportScopeKind;
 scopeValue: string;
 association: string |"all";
 recordTypeFilter?: AdminRecordTypeFilter;
}): string {
 const query = new URLSearchParams();
 query.set("days", String(params.days));
 query.set("limit", String(params.limit));
 const types = adminRecordTypeFilterToActionTypes(params.recordTypeFilter ?? "all");
 query.set("types", Array.isArray(types) ? types.join(",") : types);
 if (params.status !=="all") {
 query.set("status", params.status);
 }
 if (params.scopeKind !=="global" && params.scopeValue.trim().length > 0) {
 query.set("scopeKind", params.scopeKind);
 query.set("scopeValue", params.scopeValue.trim());
 } else if (params.association !=="all") {
 query.set("association", params.association);
 }
 return query.toString();
}

export async function parseJsonSafely(response: Response): Promise<unknown> {
 try {
 return await response.json();
 } catch {
 return null;
 }
}

export function parseAdminApiError(body: unknown, fallback: string): string {
 if (!body || typeof body !=="object") {
 return fallback;
 }
 const normalized = body as {
 error?: unknown;
 message?: unknown;
 code?: unknown;
 hint?: unknown;
 operationId?: unknown;
 };
 const message =
 typeof normalized.error ==="string"
 ? normalized.error
 : typeof normalized.message ==="string"
 ? normalized.message
 : fallback;
 const code = typeof normalized.code ==="string" ? normalized.code : null;
 const hint = typeof normalized.hint ==="string" ? normalized.hint : null;
 const operationId =
 typeof normalized.operationId ==="string" ? normalized.operationId : null;

 const parts = [message];
 if (code) parts.push(`[${code}]`);
 if (hint) parts.push(`Conseil: ${hint}`);
 if (operationId) parts.push(`Op: ${operationId}`);
 return parts.join(" |");
}

export function parseImportPayload(importPayload: string): unknown {
 let parsed: unknown;
 try {
 parsed = JSON.parse(importPayload);
 } catch {
 throw new Error("Le JSON saisi est invalide.");
 }

 return Array.isArray(parsed) ? { items: parsed } : parsed;
}
