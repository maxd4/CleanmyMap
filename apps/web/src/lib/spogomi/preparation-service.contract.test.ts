import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(new URL("./preparation-service.ts", import.meta.url), "utf8");

describe("SPOGOMI preparation service STATIC_CONTRACT", () => {
  it("reserves the creation intent before calling the canonical action service", () => {
    const reservation = service.indexOf('from("spogomi_event_creation_attempts").insert');
    const irreversibleAction = service.indexOf("createAction(supabase");
    expect(reservation).toBeGreaterThanOrEqual(0);
    expect(irreversibleAction).toBeGreaterThan(reservation);
    expect(service).toContain("intention_fingerprint");
    expect(service).toContain("processing_token");
    expect(service).not.toContain('from("spogomi_event_creation_attempts").upsert');
  });

  it("replays roster bytes on confirmation and verifies persisted source rows", () => {
    expect(service).toContain("previewRosterFile(params.file, params.importOptions ? { mapping: params.mapping");
    expect(service).toContain("verifyImportedRosterCompleteness");
    expect(service).toContain('"event_id,roster_import_id,source_row_number"');
    expect(service).toContain('.order("source_row_number", { ascending: true })');
    expect(service).toContain(".range(from, from + IMPORT_VERIFICATION_PAGE_SIZE - 1)");
    expect(service).toContain("seen.has(row.source_row_number)");
    expect(service).toContain("failed_recoverable");
  });

  it("previews composition and delegates confirmation to the atomic server contract", () => {
    expect(service).toContain("previewSpogomiTeams");
    expect(service).toContain("proposalFingerprint");
    expect(service).toContain("composition_revision");
    expect(service).toContain('rpc("spogomi_confirm_team_composition"');
    expect(service).not.toContain('.from("spogomi_teams").delete');
  });

  it("keeps the ticket source scope and advanced order reference in the import contract", () => {
    expect(service).toContain("order_alternative_reference");
    expect(service).toContain("event_id,source_system,external_reference");
    expect(service).toContain('.eq("source_system", preview.sourceSystem)');
  });
});
