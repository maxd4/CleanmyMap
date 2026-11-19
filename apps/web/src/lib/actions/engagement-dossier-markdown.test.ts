import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderEngagementDossierMarkdown } from "./engagement-dossier-markdown";
import { buildPersonalEngagementProofProjectionFromSources } from "./engagement-proof-projection";

describe("engagement-dossier-markdown", () => {
  it("renders all 8 template sections from live canonical proofs, preserves warnings/section 8, and escapes special characters", () => {
    const projection = buildPersonalEngagementProofProjectionFromSources({
      userId: "user-1",
      now: new Date("2026-07-15T10:30:00Z"),
      sources: {
        participantRows: [
          {
            id: "p-1",
            action_id: "action-1",
            user_id: "user-1",
            joined_at: "2026-05-10T17:00:00Z",
            participation_status: "confirmed",
            participation_source: "post_action_claim",
            individual_waste_kg: 4.2,
            individual_waste_condition: "sec",
            individual_cigarette_butts_count: 120,
            individual_cigarette_butts_provenance: "counted",
          },
          {
            id: "p-2",
            action_id: "action-2",
            user_id: "user-1",
            joined_at: "2026-06-20T17:00:00Z",
            participation_status: "confirmed",
            participation_source: "post_action_claim",
          },
        ],
        actions: [
          {
            id: "action-1",
            created_at: "2026-05-10T14:00:00Z",
            action_date: "2026-05-10",
            location_label: "Quai | Valmy <Paris>",
            organizer_name: "Asso *Canal* Vivant",
            organizer_type: "association",
            status: "approved",
            action_phase: "post_action_complete",
            published_at: "2026-05-10T16:00:00Z",
            moderation_visibility: "visible",
            access_mode: "public",
            data_provenance: "real",
            duration_minutes: 180,
            waste_kg: 90,
            preparation_data: {
              actionTitle: "Collecte [Printemps] #1",
              durationMinutesDeclared: true,
            },
          },
          {
            id: "action-2",
            created_at: "2026-06-20T14:00:00Z",
            action_date: "2026-06-20",
            location_label: "Parc Monceau",
            organizer_name: null,
            organizer_type: "spontaneous",
            status: "approved",
            action_phase: "post_action_complete",
            published_at: "2026-06-20T16:00:00Z",
            moderation_visibility: "visible",
            access_mode: "public",
            data_provenance: "real",
            duration_minutes: 120,
          },
        ],
        roleAttestations: [
          {
            id: "att-1",
            action_id: "action-1",
            user_id: "user-1",
            role_code: "group_lead",
            verification_status: "confirmed",
            decided_at: "2026-05-11T09:00:00Z",
            responsibility_provenance: "planned_assignment",
            provenance_snapshot: {},
            revision: 1,
          },
        ],
        spogomiParticipants: [],
        spogomiEvents: [],
        spogomiAttestations: [],
      },
    });

    const markdown = renderEngagementDossierMarkdown({
      projection,
      input: {
        holderName: "Camille | <Martin>\nTest",
        selectedActionIds: ["action-1", "action-2", "revoked-action-id"],
        personalPresentation: {
          motivations: "Accueil des nouveaux | coordination *terrain*",
          perceivedSkills: null,
          observations: "RAS <script>alert(1)</script>",
        },
        complementaryDocuments: {
          attestationReferences: "ATT-ASSO-2026-01",
          publicLinks: null,
          otherDocuments: null,
        },
      },
    });

    // No unreplaced template placeholders
    expect(markdown).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);

    // All 8 headings present
    for (let index = 1; index <= 8; index += 1) {
      expect(markdown).toContain(`## ${index}. `);
    }

    // Escaped special characters and intact table rows
    expect(markdown).toContain("Camille \\| \\<Martin\\> Test");
    expect(markdown).toContain("Collecte \\[Printemps\\] \\#1");
    expect(markdown).toContain("Quai \\| Valmy \\<Paris\\>");
    expect(markdown).toContain("Asso \\*Canal\\* Vivant");
    expect(markdown).toContain("\\<script\\>alert\\(1\\)\\</script\\>");

    // Distinct counts (revoked-action-id ignored, 2 confirmed actions, 1 attested mission)
    expect(markdown).toContain("**Nombre d'actions distinctes avec présence finale confirmée** : 2");
    expect(markdown).toContain("**Missions formellement attestées** : 1");
    expect(markdown).toContain("**Volume d'heures individuelles vérifié** : non documenté");
    expect(markdown).not.toContain("180");
    expect(markdown).not.toContain("90 kg");

    // Personal declaration clearly marked uncertified
    expect(markdown).toContain("Déclarations individuelles enregistrées (non certifiées)");
    expect(markdown).toContain("4.2 kg déclarés");

    // Absent optional fields fallback
    expect(markdown).toContain("**Savoir-faire perçus ou développés** : non documenté");
    expect(markdown).toContain("Justificatifs ou pages d'action accessibles au destinataire : non documentés");

    // Section 8 preserved verbatim
    expect(markdown).toContain(
      "CleanMyMap n'envoie pas automatiquement le dossier à une intelligence artificielle ou à un destinataire tiers.",
    );
  });

  it("handles empty selection cleanly without inventing numbers or hours", () => {
    const projection = buildPersonalEngagementProofProjectionFromSources({
      userId: "user-1",
      now: new Date("2026-07-15T10:30:00Z"),
      sources: {
        participantRows: [],
        actions: [],
        roleAttestations: [],
        spogomiParticipants: [],
        spogomiEvents: [],
        spogomiAttestations: [],
      },
    });

    const markdown = renderEngagementDossierMarkdown({
      projection,
      input: {},
    });

    expect(markdown).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
    expect(markdown).toContain("**Nombre d'actions distinctes avec présence finale confirmée** : 0");
    expect(markdown).toContain("**Structures organisatrices identifiées** : non documentées");
    expect(markdown).toContain("Aucune participation confirmée sélectionnée");
  });
});
