import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/lib/spogomi/volunteer.ts"), "utf8");

describe("SPOGOMI volunteer private-read contract", () => {
  it("resolves the participant link before loading event metadata", () => {
    const participantQuery = source.indexOf('from("spogomi_participants")');
    const eventQuery = source.indexOf('from("spogomi_events")');
    expect(participantQuery).toBeGreaterThanOrEqual(0);
    expect(eventQuery).toBeGreaterThan(participantQuery);
    expect(source).toContain('.eq("clerk_id", userId)');
    expect(source).toContain('.in("id", eventIds)');
  });
});
