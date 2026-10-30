import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import { deriveActionFormalitiesFacts } from "./formalities-facts";
import { qualifyActionFormalities } from "./formalities-qualification";
import { buildFormalitiesTerritoryFingerprint } from "./formalities-rules";
import { buildFormalitiesWorkflowState } from "./formalities-workflow";
import { validateActionFormalitiesForPublication } from "./formalities-publication-validation";

const resolveActionTerritoryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/geo/action-territory-resolver", () => ({
  resolveActionTerritory: resolveActionTerritoryMock,
}));

const parisFacts = deriveActionFormalitiesFacts({
  departmentCode: "75",
  departmentName: "Paris",
});
const factsWithRequiredFormality = {
  ...parisFacts,
  publicSpace: "public_domain" as const,
  manager: { kind: "paris_city" as const, label: "Ville de Paris" },
  hasInstallations: true as const,
  requiresPhysicalOccupation: true as const,
};
const qualification = qualifyActionFormalities(factsWithRequiredFormality);

function buildAction(workflow: unknown, actionDate = "2026-12-01") {
  return {
    id: "action-1",
    action_phase: "pre_action",
    organizer_type: "association",
    department_code: "75",
    department_name: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: '{"type":"LineString","coordinates":[[2.35,48.85],[2.36,48.86]]}',
    location_label: "Paris",
    action_date: actionDate,
    preparation_data: {
      formalitiesContext: factsWithRequiredFormality,
      formalitiesWorkflow: workflow,
    },
  } as unknown as ActionRow;
}

function buildWorkflow(previous?: ReturnType<typeof buildFormalitiesWorkflowState>) {
  return buildFormalitiesWorkflowState({
    facts: factsWithRequiredFormality,
    qualification,
    previous,
    actionDependencies: {
      locationLabel: "Paris",
      actionDate: "2026-12-01",
      territoryFingerprint: buildFormalitiesTerritoryFingerprint(factsWithRequiredFormality.territory),
    },
    now: "2026-10-30T10:00:00.000Z",
  });
}

describe("validateActionFormalitiesForPublication", () => {
  beforeEach(() => {
    resolveActionTerritoryMock.mockResolvedValue(null);
  });

  it("blocks approval when a required formalité is not sent", async () => {
    const workflow = buildWorkflow();
    const result = await validateActionFormalitiesForPublication(buildAction(workflow));

    expect(result).toEqual({
      ok: false,
      blockedFormalityIds: expect.arrayContaining(["paris-city-public-domain-aot"]),
    });
  });

  it("accepts a current workflow whose required formalities are sent", async () => {
    const prepared = buildWorkflow();
    const sent = {
      ...prepared,
      progress: prepared.progress.map((item) => item.formalityId === "paris-city-public-domain-aot"
        ? { ...item, userStatus: "sent" as const, validForQualification: true }
        : item),
    };
    const result = await validateActionFormalitiesForPublication(buildAction(sent));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.formalitiesWorkflow.progress.find((item) => item.formalityId === "paris-city-public-domain-aot")?.userStatus).toBe("sent");
  });

  it("requalifies and blocks a workflow when action dependencies changed", async () => {
    const prepared = buildWorkflow();
    const sent = {
      ...prepared,
      progress: prepared.progress.map((item) => ({ ...item, userStatus: "sent" as const, validForQualification: true })),
    };
    const result = await validateActionFormalitiesForPublication(buildAction(sent, "2026-12-02"));

    expect(result).toEqual({
      ok: false,
      blockedFormalityIds: expect.arrayContaining(["paris-city-public-domain-aot"]),
    });
  });

  it("does not invent a required formalité for a historical not-required action", async () => {
    const historical = {
      ...buildAction(null),
      organizer_type: "company",
      action_phase: "pre_action",
      review_state: "not_required",
      department_code: null,
      department_name: null,
      preparation_data: {},
    } as unknown as ActionRow;
    const result = await validateActionFormalitiesForPublication(historical);

    expect(result.ok).toBe(true);
  });
});
