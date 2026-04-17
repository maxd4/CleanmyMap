import { describe, expect, it } from "vitest";
import {
  appendActionMetadataToNotes,
  extractActionMetadataFromNotes,
} from "./metadata";

describe("action metadata notes", () => {
  it("appends and extracts submission mode and waste breakdown", () => {
    const notes = appendActionMetadataToNotes("Observation terrain", {
      submissionMode: "complete",
      associationName: "Collectif Nettoyons Paris",
      wasteBreakdown: { plastiqueKg: 2.4, triQuality: "elevee" },
    });
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cleanNotes).toBe("Observation terrain");
    expect(parsed.submissionMode).toBe("complete");
    expect(parsed.associationName).toBe("Collectif Nettoyons Paris");
    expect(parsed.wasteBreakdown?.plastiqueKg).toBe(2.4);
    expect(parsed.wasteBreakdown?.triQuality).toBe("elevee");
  });

  it("keeps plain notes when no metadata is provided", () => {
    const notes = appendActionMetadataToNotes("Simple note", {});
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cleanNotes).toBe("Simple note");
    expect(parsed.submissionMode).toBeNull();
    expect(parsed.associationName).toBeNull();
    expect(parsed.wasteBreakdown).toBeNull();
  });

  it("extracts legacy association line and strips it from plain notes", () => {
    const parsed = extractActionMetadataFromNotes(
      "Observation locale\nAssociation: AEBCPEV",
    );
    expect(parsed.cleanNotes).toBe("Observation locale");
    expect(parsed.associationName).toBe("AEBCPEV");
  });
});
