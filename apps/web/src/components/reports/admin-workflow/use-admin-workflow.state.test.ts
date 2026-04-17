import { describe, expect, it } from "vitest";
import {
  appendModerationJournal,
  deriveCanConfirmImport,
} from "./state";
import type { ModerationJournalEntry } from "./types";

describe("admin workflow state helpers", () => {
  it("deriveCanConfirmImport returns true only when all guards are satisfied", () => {
    const base = {
      importPreview: {
        status: "dry_run" as const,
        count: 1,
        dryRunProof: {
          token: "token-1",
          expiresAt: "2026-04-20T00:00:00.000Z",
          payloadHash: "hash-1",
        },
        stats: {
          withCoordinates: 1,
          missingCoordinates: 0,
          totalWasteKg: 1,
          totalButts: 0,
          totalVolunteers: 1,
          dateMin: "2026-04-01",
          dateMax: "2026-04-01",
        },
      },
      importPreviewSignature: '{"items":[]}',
      importPayload: '{"items":[]}',
      importConfirmationText: "CONFIRMER IMPORT",
    };

    expect(deriveCanConfirmImport(base)).toBe(true);
    expect(
      deriveCanConfirmImport({
        ...base,
        importConfirmationText: "confirmer",
      }),
    ).toBe(false);
    expect(
      deriveCanConfirmImport({
        ...base,
        importPreviewSignature: '{"items":[1]}',
      }),
    ).toBe(false);
  });

  it("appendModerationJournal keeps most recent 12 entries", () => {
    const seed: ModerationJournalEntry[] = Array.from({ length: 12 }).map(
      (_, index) => ({
        at: `2026-04-10T00:00:${index.toString().padStart(2, "0")}.000Z`,
        entityType: "action",
        id: `id-${index}`,
        targetStatus: "approved",
        outcome: "success",
        message: "ok",
      }),
    );
    const next = appendModerationJournal(seed, {
      at: "2026-04-11T00:00:00.000Z",
      entityType: "clean_place",
      id: "new-id",
      targetStatus: "validated",
      outcome: "error",
      message: "ko",
    });

    expect(next.length).toBe(12);
    expect(next[0]?.id).toBe("new-id");
    expect(next.some((entry) => entry.id === "id-11")).toBe(false);
  });
});
