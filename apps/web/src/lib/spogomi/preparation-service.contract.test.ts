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
    expect(service).toContain("previewRosterFile(params.file, params.mapping)");
    expect(service).toContain("importIsComplete");
    expect(service).toContain('onConflict: "event_id,roster_import_id,source_row_number"');
    expect(service).toContain("failed_recoverable");
  });
});
