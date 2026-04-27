import { describe, expect, it } from"vitest";
import {
 buildExportQuery,
 parseAdminApiError,
} from"./use-admin-workflow";

describe("useAdminWorkflow helpers", () => {
 it("buildExportQuery includes optional filters only when required", () => {
 const query = buildExportQuery({
 status:"approved",
 days: 90,
 limit: 250,
 scopeKind:"association",
 scopeValue:"Association Test",
 association:"Association Test",
 });

 const params = new URLSearchParams(query);
 expect(params.get("days")).toBe("90");
 expect(params.get("limit")).toBe("250");
 expect(params.get("types")).toBe("all");
 expect(params.get("status")).toBe("approved");
 expect(params.get("scopeKind")).toBe("association");
 expect(params.get("scopeValue")).toBe("Association Test");
 expect(params.get("association")).toBeNull();

 const queryWithoutOptional = buildExportQuery({
 status:"all",
 days: 30,
 limit: 120,
 scopeKind:"global",
 scopeValue:"",
 association:"all",
 });
 const withoutOptional = new URLSearchParams(queryWithoutOptional);
 expect(withoutOptional.get("status")).toBeNull();
 expect(withoutOptional.get("association")).toBeNull();
 expect(withoutOptional.get("scopeKind")).toBeNull();
 expect(withoutOptional.get("scopeValue")).toBeNull();
 });

 it("parseAdminApiError builds a detailed message when structured payload is present", () => {
 const message = parseAdminApiError(
 {
 error:"Import refuse",
 code:"dry_run_required",
 hint:"Lancer un dry-run",
 operationId:"op-123",
 },
"Erreur par defaut",
 );

 expect(message).toContain("Import refuse");
 expect(message).toContain("[dry_run_required]");
 expect(message).toContain("Conseil: Lancer un dry-run");
 expect(message).toContain("Op: op-123");
 });

 it("parseAdminApiError falls back when payload is malformed", () => {
 expect(parseAdminApiError(null,"Fallback")).toBe("Fallback");
 expect(parseAdminApiError("oops","Fallback")).toBe("Fallback");
 });
});
