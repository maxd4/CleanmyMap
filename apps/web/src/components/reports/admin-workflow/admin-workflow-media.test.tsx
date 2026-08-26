import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AdminWorkflowController } from "./types";
import { StepConfirm } from "./step-confirm";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

function buildWorkflow(
  selectedRecordType: "action" | "spot" | "clean_place",
): AdminWorkflowController {
  const isSignalement = selectedRecordType !== "action";
  return {
    status: "all",
    days: 90,
    limit: 250,
    scopeKind: "global",
    scopeValue: "",
    association: "all",
    setStatus: vi.fn(),
    setDays: vi.fn(),
    setLimit: vi.fn(),
    setScopeKind: vi.fn(),
    setScopeValue: vi.fn(),
    setAssociation: vi.fn(),
    associationOptions: [],
    scopeOptions: { accounts: [], associations: [], arrondissements: [] },
    csvState: "idle",
    jsonState: "idle",
    importState: "idle",
    importDryRunState: "idle",
    moderationState: "idle",
    errorMessage: null,
    lastSuccessMessage: null,
    importPayload: '{"items":[]}',
    importPreview: null,
    importConfirmationText: "",
    setImportPayload: vi.fn(),
    setImportConfirmationText: vi.fn(),
    canConfirmImport: false,
    moderationEntityType: isSignalement ? "clean_place" : "action",
    moderationId: `moderation-${selectedRecordType}`,
    actionStatus: "approved",
    cleanPlaceStatus: "validated",
    moderationResult: null,
    moderationJournal: [],
    moderationConfirmed: false,
    moderationConfirmationText: "",
    moderationReason: "",
    moderationVisibility: "unchanged",
    selectedActionCreatorId: null,
    selectedRecordType,
    actionEditDraft: null,
    cleanPlaceEditDraft: isSignalement
      ? {
          label: "Quai de test",
          spotType: selectedRecordType === "spot" ? "spot" : "clean_place",
          latitude: "48.8566",
          longitude: "2.3522",
          notes: "",
        }
      : null,
    setModerationEntityType: vi.fn(),
    setModerationId: vi.fn(),
    setActionStatus: vi.fn(),
    setCleanPlaceStatus: vi.fn(),
    setModerationConfirmed: vi.fn(),
    setModerationConfirmationText: vi.fn(),
    setModerationReason: vi.fn(),
    setModerationVisibility: vi.fn(),
    setActionEditDraft: vi.fn(),
    setCleanPlaceEditDraft: vi.fn(),
    setSelectedActionCreatorId: vi.fn(),
    previewRows: [],
    previewLoading: false,
    previewError: false,
    reloadPreview: vi.fn(),
    selectActionForModeration: vi.fn(),
    auditItems: [],
    auditLoading: false,
    auditError: false,
    csvExportUrl: "",
    jsonExportUrl: "",
    onDownloadCsv: vi.fn(async () => undefined),
    onDownloadJson: vi.fn(async () => undefined),
    onImportDryRun: vi.fn(async () => undefined),
    onImportPastActions: vi.fn(async () => undefined),
    onModerateEntity: vi.fn(async () => undefined),
  };
}

describe("admin workflow signalement media", () => {
  it("does not render media for an action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(StepConfirm, { workflow: buildWorkflow("action") }),
    );

    expect(markup).not.toContain("Preuves terrain");
    expect(markup).not.toContain("Voir les preuves photo");
  });

  it.each(["spot", "clean_place"] as const)(
    "renders the media panel and explicit type for %s without fetching on selection",
    (type) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const markup = renderToStaticMarkup(
        React.createElement(StepConfirm, { workflow: buildWorkflow(type) }),
      );

      expect(markup).toContain("Preuves terrain");
      expect(markup).toContain("Voir les preuves photo");
      expect(markup).toContain(type === "spot" ? "Spot" : "Lieu propre");
      expect(fetchMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    },
  );
});
