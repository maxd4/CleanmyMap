import { describe, expect, it } from "vitest";
import { buildActionUpdateNotes } from "./action-update-notes";
import { extractActionMetadataFromNotes } from "./metadata";
import { buildPersistedNotes } from "./persistence/notes";

describe("collection attribution version persistence", () => {
  it("persists collector count provenance through edits and backup serialization", () => {
    const created = buildPersistedNotes({
      notes: "Création",
      collectorsCount: 12,
      collectorsCountProvenance: "participant_total_default",
    });
    const reopened = extractActionMetadataFromNotes(created);
    const edited = buildActionUpdateNotes({
      body: { notes: "Édition" },
      currentMetadata: reopened,
      hasButtsMeasurementUpdate: false,
      nextCigaretteButtsMeasurements: null,
      nextVolunteerParticipation: null,
    });

    expect(reopened.collectorsCountProvenance).toBe("participant_total_default");
    expect(extractActionMetadataFromNotes(edited ?? null).collectorsCountProvenance)
      .toBe("participant_total_default");
  });

  it("persists explicit acceptance of a historical total default", () => {
    const created = buildPersistedNotes({
      notes: "Bilan historique accepté",
      collectorsCount: 12,
      collectorsCountProvenance: "historical_default_accepted",
    });
    expect(extractActionMetadataFromNotes(created).collectorsCountProvenance)
      .toBe("historical_default_accepted");
  });

  it("clears collector provenance when the collector count is explicitly cleared", () => {
    const existing = extractActionMetadataFromNotes(buildPersistedNotes({
      notes: "Bilan",
      collectorsCount: 12,
      collectorsCountProvenance: "user_confirmed",
    }));
    const updated = buildActionUpdateNotes({
      body: { collectorsCount: null },
      currentMetadata: existing,
      hasButtsMeasurementUpdate: false,
      nextCigaretteButtsMeasurements: null,
      nextVolunteerParticipation: null,
    });

    expect(extractActionMetadataFromNotes(updated).collectorsCountProvenance).toBeNull();
  });

  it("keeps collectors-v1 through creation, edit, reopen, save, and backup note restoration", () => {
    const created = buildPersistedNotes({ notes: "Création", collectorsCount: 12 });
    const reopened = extractActionMetadataFromNotes(created);
    const edited = buildActionUpdateNotes({
      body: { notes: "Édition" },
      currentMetadata: reopened,
      hasButtsMeasurementUpdate: false,
      nextCigaretteButtsMeasurements: null,
      nextVolunteerParticipation: null,
    });
    const restored = extractActionMetadataFromNotes(edited ?? null);
    const saved = buildActionUpdateNotes({
      body: { associationName: "Collectif" },
      currentMetadata: restored,
      hasButtsMeasurementUpdate: false,
      nextCigaretteButtsMeasurements: null,
      nextVolunteerParticipation: null,
    });
    const backupPayload = JSON.stringify({ tables: { actions: [{ notes: saved }] } });
    const restoredBackup = JSON.parse(backupPayload) as { tables: { actions: Array<{ notes: string }> } };

    expect(reopened.collectionAttributionVersion).toBe("collectors-v1");
    expect(restored.collectionAttributionVersion).toBe("collectors-v1");
    expect(extractActionMetadataFromNotes(restoredBackup.tables.actions[0].notes).collectionAttributionVersion)
      .toBe("collectors-v1");
  });

  it("does not upgrade an old action merely because it is edited", () => {
    const legacy = extractActionMetadataFromNotes("Note historique");
    const edited = buildActionUpdateNotes({
      body: { notes: "Note historique modifiée", collectorsCount: 3 },
      currentMetadata: legacy,
      hasButtsMeasurementUpdate: false,
      nextCigaretteButtsMeasurements: null,
      nextVolunteerParticipation: null,
    });

    expect(extractActionMetadataFromNotes(edited ?? null).collectionAttributionVersion).toBeNull();
  });
});
