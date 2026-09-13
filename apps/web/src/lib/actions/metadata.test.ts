import { describe, expect, it } from "vitest";
import {
  appendActionMetadataToNotes,
  extractActionMetadataFromNotes,
  setActionGroupJoinEnabledInNotes,
} from "./metadata";
import { normalizeCigaretteButtsMeasurements } from "@/lib/waste/cigarette-butts";

describe("action metadata notes", () => {
  it("appends and extracts submission mode and waste breakdown", () => {
    const notes = appendActionMetadataToNotes("Observation terrain", {
      submissionMode: "complete",
      associationName: "Collectif Nettoyons Paris",
      placeType: "Bois/Parc/Jardin/Square/Sentier",
      routeStyle: "souple",
      routeAdjustmentMessage: "Contourner l'avenue principale",
      wasteMeasurementMethod: "balance_suspendue",
      cigaretteButtsKg: 0,
      wasteBreakdown: {
        recyclablesKg: 2.4,
        glassKg: null,
        householdWasteKg: 0,
        otherWasteKg: null,
      },
    });
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cleanNotes).toBe("Observation terrain");
    expect(parsed.submissionMode).toBe("complete");
    expect(parsed.associationName).toBe("Collectif Nettoyons Paris");
    expect(parsed.placeType).toBe("Bois/Parc/Jardin/Square/Sentier");
    expect(parsed.routeStyle).toBe("souple");
    expect(parsed.routeAdjustmentMessage).toBe("Contourner l'avenue principale");
    expect(parsed.wasteMeasurementMethod).toBe("balance_suspendue");
    expect(parsed.cigaretteButtsKg).toBe(0);
    expect(parsed.wasteBreakdown?.recyclablesKg).toBe(2.4);
    expect(parsed.wasteBreakdown?.householdWasteKg).toBe(0);
  });

  it("keeps plain notes when no metadata is provided", () => {
    const notes = appendActionMetadataToNotes("Simple note", {});
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cleanNotes).toBe("Simple note");
    expect(parsed.submissionMode).toBeNull();
    expect(parsed.associationName).toBeNull();
    expect(parsed.wasteBreakdown).toBeNull();
    expect(parsed.groupJoinEnabled).toBe(false);
  });

  it("persists an open group form flag in metadata", () => {
    const notes = appendActionMetadataToNotes("Simple note", {
      groupJoinEnabled: true,
    });
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cleanNotes).toBe("Simple note");
    expect(parsed.groupJoinEnabled).toBe(true);
  });

  it("persists a closed group form flag in metadata", () => {
    const notes = appendActionMetadataToNotes("Simple note", {
      groupJoinEnabled: false,
    });
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cleanNotes).toBe("Simple note");
    expect(parsed.groupJoinEnabled).toBe(false);
  });

  it("extracts legacy association line and strips it from plain notes", () => {
    const parsed = extractActionMetadataFromNotes(
      "Observation locale\nAssociation: AEBCPEV",
    );
    expect(parsed.cleanNotes).toBe("Observation locale");
    expect(parsed.associationName).toBe("AEBCPEV");
  });

  it("drops the ingestion sync marker from clean notes", () => {
    const parsed = extractActionMetadataFromNotes(
      "Observation locale\n[google-sheet-sync]",
    );
    expect(parsed.cleanNotes).toBe("Observation locale");
  });

  it("toggles the persisted group join flag in-place", () => {
    const closedNotes = appendActionMetadataToNotes("Observation terrain", {
      submissionMode: "complete",
      groupJoinEnabled: false,
    });
    const reopenedNotes = setActionGroupJoinEnabledInNotes(closedNotes, true);
    const parsed = extractActionMetadataFromNotes(reopenedNotes);

    expect(parsed.cleanNotes).toBe("Observation terrain");
    expect(parsed.submissionMode).toBe("complete");
    expect(parsed.groupJoinEnabled).toBe(true);
  });

  it("round-trips raw, derived and provenance fields without collapsing them", () => {
    const cigaretteButtsMeasurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsMassKg: 1.2,
      cigaretteButtsCondition: "propre",
      deriveMissingFromMassOrCount: true,
    });
    const notes = appendActionMetadataToNotes("Observation terrain", {
      cigaretteButtsMeasurements,
    });
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cigaretteButtsMeasurements).toEqual(
      cigaretteButtsMeasurements,
    );
    expect(parsed.cigaretteButtsMeasurements?.cigaretteButtsMassKg).toBe(1.2);
    expect(parsed.cigaretteButtsMeasurements?.cigaretteButtsCount).toBe(3_000);
    expect(parsed.cigaretteButtsMeasurements?.cigaretteButtsCountProvenance).toBe(
      "weight_converted",
    );
    expect(parsed.cigaretteButtsKg).toBe(1.2);
  });

  it("keeps a measured volume and leaves unavailable derivatives null", () => {
    const notes = appendActionMetadataToNotes(undefined, {
      cigaretteButtsMeasurements: normalizeCigaretteButtsMeasurements({
        cigaretteButtsVolumeLiters: 2,
      }),
    });
    const parsed = extractActionMetadataFromNotes(notes);

    expect(parsed.cigaretteButtsMeasurements?.cigaretteButtsVolumeLiters).toBe(2);
    expect(parsed.cigaretteButtsMeasurements?.cigaretteButtsMassKg).toBeNull();
    expect(parsed.cigaretteButtsMeasurements?.cigaretteButtsCount).toBeNull();
  });
});
