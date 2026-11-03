import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(new URL("./consolidation-service.ts", import.meta.url), "utf8");

describe("SPOGOMI consolidation service STATIC_CONTRACT", () => {
  it("selects only the current certified team submission and verified attendance", () => {
    expect(service).toContain("certified_submission_id");
    expect(service).toContain("attendance_status");
    expect(service).toContain("registration_status");
    expect(service).toContain("certifiedSubmissionStatus");
    expect(service).toContain("certifiedSubmissionStatus");
  });

  it("preserves provenance, source hashing, the official reference route and the single action target", () => {
    expect(service).toContain("sourceHash");
    expect(service).toContain("spogomi_event_routes");
    expect(service).toContain("official_reference");
    expect(service).toContain("measurement_method");
    expect(service).toContain("source_reference");
    expect(service).toContain("consolidate_spogomi_event_to_action");
    expect(service).toContain("action_id");
    expect(service).not.toContain("createAction(");
  });

  it("reads every source page with one shared deterministic pagination owner", () => {
    expect(service).toContain("readAllSpogomiPages");
    expect(service).toContain('.range(from, to)');
    expect(service).toContain('.order("team_number", { ascending: true })');
    expect(service).toContain('.order("id", { ascending: true })');
    expect(service).toContain("updated_at");
    expect(service).toContain("sourceSnapshot");
    expect(service).toContain("eventMetadata");
  });
});
