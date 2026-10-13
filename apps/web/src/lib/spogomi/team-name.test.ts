import { describe, expect, it } from "vitest";
import { normalizeSpogomiTeamPublicName, spogomiTeamPublicNameKey } from "./team-name";

describe("SPOGOMI public team names", () => {
  it("normalizes spaces while preserving accents and a stable Unicode form", () => {
    expect(normalizeSpogomiTeamPublicName("  Les   Écureuils  ")).toBe("Les Écureuils");
    expect(spogomiTeamPublicNameKey("Équipe 3")).toBe(spogomiTeamPublicNameKey(" équipe   3 "));
  });

  it.each(["", "   ", "a\n b", "a\u0000b", "a".repeat(61)])("rejects invalid public names: %j", (value) => {
    expect(() => normalizeSpogomiTeamPublicName(value)).toThrow(/Validation/);
  });

  it("rejects malformed UTF-16 instead of persisting an unpaired surrogate", () => {
    expect(() => normalizeSpogomiTeamPublicName("Équipe\ud800")).toThrow(/Unicode invalide/);
  });

  it("keeps collision comparison independent from the event identity", () => {
    expect(spogomiTeamPublicNameKey("Les Écureuils")).toBe("les écureuils");
  });
});
