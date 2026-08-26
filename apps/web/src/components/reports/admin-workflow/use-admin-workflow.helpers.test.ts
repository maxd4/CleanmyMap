import { describe, expect, it } from"vitest";
import {
 buildExportQuery,
 parseAdminApiError,
} from"./use-admin-workflow";
import { resolveAdminSelectedRecordType } from "./helpers";
import {
 ADMIN_SIGNALEMENTS_MODERATION_HREF,
 adminRecordTypeFilterToActionTypes,
 parseAdminModerationParam,
} from "./helpers";
import { formatPreviewRecordType } from "./step-preview";
import { resolveAdminWorkflowInitialValues } from "./state";
import type { ActionListItem } from "@/lib/actions/types";

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

 it("parses only the supported moderation deep-link and preserves the default otherwise", () => {
  expect(parseAdminModerationParam("signalements")).toBe("signalements");
  expect(parseAdminModerationParam(["signalements"])).toBe("signalements");
  expect(parseAdminModerationParam("actions")).toBeNull();
  expect(parseAdminModerationParam(undefined)).toBeNull();
  expect(ADMIN_SIGNALEMENTS_MODERATION_HREF).toBe(
   "/admin?moderation=signalements#workflow-administration",
  );
 });

 it("maps the UI record filters to the existing fetchActions type contract", () => {
  expect(adminRecordTypeFilterToActionTypes("all")).toBe("all");
  expect(adminRecordTypeFilterToActionTypes("actions")).toBe("action");
  expect(adminRecordTypeFilterToActionTypes("signalements")).toEqual([
   "spot",
   "clean_place",
  ]);
  expect(adminRecordTypeFilterToActionTypes("spot")).toBe("spot");
  expect(adminRecordTypeFilterToActionTypes("clean_place")).toBe("clean_place");
 });

 it("initializes the signalement deep-link once without changing later defaults", () => {
  const initial = resolveAdminWorkflowInitialValues({
   initialStatus: "pending",
   initialRecordTypeFilter: "signalements",
  });
  expect(initial).toEqual({ status: "pending", recordTypeFilter: "signalements" });

  const manuallyChanged = { ...initial, status: "approved" as const, recordTypeFilter: "spot" as const };
  expect(manuallyChanged).toEqual({ status: "approved", recordTypeFilter: "spot" });
 });

 it("serializes the deep-link filter in export queries without adding a new API contract", () => {
  const query = new URLSearchParams(
   buildExportQuery({
    status: "pending",
    days: 90,
    limit: 250,
    scopeKind: "global",
    scopeValue: "",
    association: "all",
    recordTypeFilter: "signalements",
   }),
  );
  expect(query.get("types")).toBe("spot,clean_place");
  expect(query.get("status")).toBe("pending");
 });

 it.each([
  ["action", "Action"],
  ["spot", "Spot"],
  ["clean_place", "Lieu propre"],
 ] as const)("keeps the selected canonical record type for %s", (type, expected) => {
  const item = {
   source: type === "action" ? "actions" : "trash_spotter_spots",
   contract: { type },
  } as unknown as ActionListItem;

  expect(resolveAdminSelectedRecordType(item)).toBe(
   type === "action" ? "action" : type,
  );
  expect(formatPreviewRecordType(item)).toBe(expected);
 });
});
