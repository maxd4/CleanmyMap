import { describe, expect, it } from"vitest";
import {
 fetchAdminOperationAudit,
 runImportConfirm,
 runImportDryRun,
} from"./services";

describe("admin workflow services", () => {
 it("runImportDryRun returns summary on success", async () => {
 const fetchImpl = (async () =>
 new Response(
 JSON.stringify({
 status:"dry_run",
 count: 2,
 stats: {
 withCoordinates: 1,
 missingCoordinates: 1,
 totalWasteKg: 10,
 totalButts: 20,
 totalVolunteers: 3,
 dateMin:"2026-04-01",
 dateMax:"2026-04-02",
 },
 }),
 { status: 200, headers: {"Content-Type":"application/json" } },
 )) as typeof fetch;

 const result = await runImportDryRun({
 importPayload: '{"items":[]}',
 fetchImpl,
 });
 expect(result.status).toBe("dry_run");
 expect(result.count).toBe(2);
 });

 it("runImportDryRun surfaces API error details", async () => {
 const fetchImpl = (async () =>
 new Response(
 JSON.stringify({
 error:"Dry run refuse",
 code:"invalid_payload",
 }),
 { status: 400, headers: {"Content-Type":"application/json" } },
 )) as typeof fetch;

 await expect(
 runImportDryRun({ importPayload: '{"items":[]}', fetchImpl }),
 ).rejects.toThrow("Dry run refuse");
 });

 it("runImportConfirm returns operation metadata", async () => {
 const fetchImpl = (async () =>
 new Response(JSON.stringify({ count: 5, operationId:"op-55" }), {
 status: 200,
 headers: {"Content-Type":"application/json" },
 })) as typeof fetch;

 const result = await runImportConfirm({
 importPayload: '{"items":[]}',
 dryRunProof:"token-1",
 confirmPhrase:"CONFIRMER IMPORT",
 fetchImpl,
 });
 expect(result.count).toBe(5);
 expect(result.operationId).toBe("op-55");
 });

 it("fetchAdminOperationAudit returns audit items", async () => {
 const fetchImpl = (async () =>
 new Response(
 JSON.stringify({
 items: [
 {
 operationId:"op-1",
 at:"2026-04-10T00:00:00.000Z",
 actorUserId:"u1",
 operationType:"moderation",
 outcome:"success",
 details: {},
 },
 ],
 }),
 { status: 200, headers: {"Content-Type":"application/json" } },
 )) as typeof fetch;

 const result = await fetchAdminOperationAudit(fetchImpl, 10);
 expect(result.items?.length).toBe(1);
 expect(result.items?.[0]?.operationId).toBe("op-1");
 });
});
