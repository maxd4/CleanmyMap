// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profil/engagement",
}));

import { EngagementDossierPage } from "./engagement-dossier-page";

const MOCK_PROJECTION = {
  status: "available",
  generatedAt: "2026-07-15T10:00:00.000Z",
  ownerUserId: "user-1",
  participations: {
    status: "available",
    value: [
      {
        actionId: "action-1",
        actionDate: "2026-05-10",
        actionTitle: "Nettoyage Canal",
        locationLabel: "Paris 10e",
        departmentCode: "75",
        departmentName: "Paris",
        actionContext: "citizen",
        presence: {
          status: "confirmed",
          confirmedAt: "2026-05-10T17:00:00Z",
          participationSource: "post_action_claim",
          provenanceTable: "action_participants",
        },
        organization: {
          status: "available",
          value: {
            organizationKey: "association:canal",
            name: "Association Canal",
            organizerType: "association",
            organizerTypeLabel: "Association",
            provenance: "organizer_name",
          },
          reason: null,
        },
        attestedMissions: [
          {
            missionId: "action_role:att-1",
            actionId: "action-1",
            actionDate: "2026-05-10",
            roleCode: "group_lead",
            roleLabel: "Responsable du groupe",
            missionCategory: "accompaniment_awareness_logistics",
            source: "action_role_attestation",
            responsibilityProvenance: "planned_assignment",
            verificationStatus: "confirmed",
            decidedAt: "2026-05-11T09:00:00Z",
            revision: 1,
            evidenceReference: "action_role_attestation:att-1:r1",
            collectionAttributed: false,
            skillsCertificationClaimed: false,
          },
        ],
        verifiedHours: {
          status: "unavailable",
          totalHours: null,
          reason: "action_duration_not_individual_proof",
        },
        personalDeclaration: {
          status: "unavailable",
          value: null,
          reason: "no_individual_declaration_recorded",
        },
        collectiveResults: {
          actionDurationMinutes: { status: "available", value: 120, reason: null },
          volunteersCount: { status: "available", value: 12, reason: null },
          collectiveWasteKg: { status: "available", value: 30, reason: null },
          collectiveCigaretteButtsCount: { status: "unavailable", value: null, reason: "missing" },
          individualAttributionAllowed: false,
        },
        communicableReference: {
          referenceCode: "CMM-ENG-20260510-ABCDEF123456",
          actionId: "action-1",
          actionDate: "2026-05-10",
          locationLabel: "Paris 10e",
          organizationName: "Association Canal",
          presenceConfirmed: true,
          attestedMissionCodes: ["group_lead"],
          sourceRevisionFingerprint: "fp-1",
        },
      },
    ],
    reason: null,
  },
};

describe("EngagementDossierPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("loads documented participations, accepts optional fields, and downloads the Markdown dossier", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_PROJECTION,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "Content-Disposition": 'attachment; filename="dossier-benevolat-2026-07-15.md"',
        }),
        text: async () => "# Dossier personnel de bénévolat",
      });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(<EngagementDossierPage />);
    });

    expect(container.textContent).toContain("Nettoyage Canal");
    expect(container.textContent).toContain("Mission attestée : Responsable du groupe");

    const nameInput = container.querySelector<HTMLInputElement>("#dossier-holder-name");
    expect(nameInput).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(nameInput, "Camille Martin");
      nameInput!.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const downloadButton = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Télécharger le dossier"),
    );
    expect(downloadButton).toBeDefined();

    await act(async () => {
      downloadButton!.click();
    });

    expect(container.textContent).toContain("Dossier Markdown privé téléchargé.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/account/engagement-proofs/export",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("renders an explicit retryable error alert when the projection fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ status: "error", errorReason: "supabase_down" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(<EngagementDossierPage />);
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("supabase_down");
  });
});
