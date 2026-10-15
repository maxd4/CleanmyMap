import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(new URL("./preparation-service.ts", import.meta.url), "utf8");
const creationService = readFileSync(new URL("./preparation-creation-service.ts", import.meta.url), "utf8");
const importCompleteness = readFileSync(new URL("./import-completeness.ts", import.meta.url), "utf8");
const compositionMutationService = readFileSync(new URL("./composition-mutation-service.ts", import.meta.url), "utf8");
const eventService = readFileSync(new URL("./preparation-event-service.ts", import.meta.url), "utf8");

describe("SPOGOMI preparation service STATIC_CONTRACT", () => {
  it("reserves the creation intent before calling the canonical action service", () => {
    const reservation = creationService.indexOf('from("spogomi_event_creation_attempts").insert');
    const irreversibleAction = creationService.indexOf("createAction(supabase");
    expect(reservation).toBeGreaterThanOrEqual(0);
    expect(irreversibleAction).toBeGreaterThan(reservation);
    expect(creationService).toContain("intention_fingerprint");
    expect(creationService).toContain("processing_token");
    expect(creationService).not.toContain('from("spogomi_event_creation_attempts").upsert');
    expect(creationService).not.toContain("canonical.casualTeamSize");
    expect(creationService).toContain("legacyCreationFingerprint");
    expect(creationService).toContain('proof.source === "legacy"');
    expect(creationService).toContain('public_visibility: "private"');
  });

  it("replays roster bytes on confirmation and verifies persisted source rows", () => {
    expect(service).toContain("previewRosterFile(params.file, params.importOptions ? { mapping: params.mapping");
    expect(service).toContain("verifyImportedRosterCompleteness");
    expect(service).toContain('"event_id,roster_import_id,source_row_number"');
    expect(service).toContain('.order("source_row_number", { ascending: true })');
    expect(importCompleteness).toContain(".range(from, from + IMPORT_VERIFICATION_PAGE_SIZE - 1)");
    expect(importCompleteness).toContain("seen.has(row.source_row_number)");
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
    expect(service).toContain("reconcileCachanTicketRows");
    expect(service).toContain('.eq("source_system", preview.sourceSystem)');
    expect(service).toContain("source_proof_status");
    expect(service).toContain("conflictRowNumbers");
    expect(service).toContain("ticket_cancellation_conflict");
    expect(service).toContain("ticket_composition_lock_conflict");
  });

  it("routes manual moves and locks through revision-controlled server procedures", () => {
    expect(compositionMutationService).toContain('rpc("spogomi_move_participant_to_team"');
    expect(compositionMutationService).toContain('rpc("spogomi_lock_team_composition"');
    expect(compositionMutationService).toContain("actorClerkId");
    expect(service).not.toContain('.from("spogomi_participants").update({ team_id');
    expect(service).not.toContain('.from("spogomi_teams").update({ composition_state: "locked"');
  });

  it("routes event metadata through the revision-controlled rule boundary", () => {
    expect(eventService).toContain('rpc("spogomi_update_event_metadata"');
    expect(eventService).toContain("p_expected_revision");
    expect(eventService).toContain("const teamSizeConfig = input.casualTeamSize === undefined");
    expect(eventService).toContain("...event.team_size_config");
    expect(eventService).not.toContain("minMembers: casualTeamSize, maxMembers: casualTeamSize");
  });
});
