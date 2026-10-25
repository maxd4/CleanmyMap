import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  qualifyActionFormalities,
  type ActionFormality,
} from "@/lib/actions/formalities-qualification";
import {
  actionFormalitiesFactsSchema,
  buildFormalitiesWorkflowState,
  deriveActionFormalitiesFacts,
  type ActionFormalitiesWorkflowState,
} from "@/lib/actions/formalities-workflow";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities-qualification";
import type { ActionRow } from "@/types/database";
import { buildFormalitiesTerritoryFingerprint } from "@/lib/actions/formalities-rules";
import { GET, PATCH } from "./route";

const authMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/authz").requireAuthenticatedAccess>(),
);
const identityMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/authz").getCurrentUserIdentity>(),
);
const loadActionMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/actions/store").loadActionById>(),
);
const loadOrganizersMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/actions/participation/organizers").loadCanonicalActionOrganizerIdsForAction>(),
);
const resolveActionTerritoryMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/geo/action-territory-resolver").resolveActionTerritory>(),
);
type FormalitiesUpdateQuery = {
  eq: (column: string, value: unknown) => {
    select: () => { single: () => Promise<{ data: { id: string } | null; error: Error | null }> };
  };
};
type FormalitiesSupabase = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => FormalitiesUpdateQuery;
  };
};
type FormalitiesUpdate = (values: Record<string, unknown>) => FormalitiesUpdateQuery;
const supabaseMock = vi.hoisted(() => vi.fn<() => FormalitiesSupabase>());
const handleApiErrorMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/http/api-errors").handleApiError>(),
);
const validationErrorMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/http/api-errors").validationErrorResponse>(),
);
const unauthorizedMock = vi.hoisted(() =>
  vi.fn<typeof import("@/lib/http/auth-responses").unauthorizedJsonResponse>(),
);

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authMock,
  getCurrentUserIdentity: identityMock,
}));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: loadOrganizersMock,
}));
vi.mock("@/lib/geo/action-territory-resolver", () => ({
  resolveActionTerritory: resolveActionTerritoryMock,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: supabaseMock }));
vi.mock("@/lib/http/api-errors", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-errors")>(
    "@/lib/http/api-errors",
  );
  return {
    ...actual,
    handleApiError: handleApiErrorMock,
    validationErrorResponse: validationErrorMock,
  };
});
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedMock,
}));

const action = (): ActionRow => ({
  id: "action-42",
  created_at: "2026-09-01T00:00:00.000Z",
  created_by_clerk_id: "user-1",
  actor_name: "Alice",
  action_date: "2026-09-01",
  location_label: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
  derived_geometry_kind: "point",
  derived_geometry_geojson: null,
  geometry_confidence: null,
  waste_kg: null,
  cigarette_butts: null,
  volunteers_count: null,
  duration_minutes: 0,
  notes: null,
  status: "pending",
  action_phase: "pre_action",
  department_code: "75",
  department_name: "Paris",
  preparation_data: {
    plannedObjective: "nettoyage",
  },
});

const formalitiesRequest = (init?: RequestInit) =>
  new Request("http://localhost/api/actions/action-42/formalities", init);

const formalitiesFacts = (overrides: Record<string, unknown> = {}) => ({
  territory: { countryCode: "FR", code: "FR-75", label: "Paris (75)" },
  publicSpace: "public_domain",
  manager: { kind: "paris_city", label: null },
  isCleanwalk: true,
  isPublicRoadwayActivity: false,
  isItinerant: false,
  isClaiming: false,
  hasInstallations: true,
  requiresPhysicalOccupation: true,
  localCustomaryUse: false,
  largeCrowdOrComplexInstallations: false,
  ...overrides,
});

const identity = (userId: string) => ({
  userId,
  displayName: "Test user",
  handle: "test-user",
  firstName: "Test",
  username: "test-user",
  email: null,
  currentLevel: 1,
  actorNameOptions: ["Test user"],
  role: "benevole" as const,
  activeRole: "benevole" as const,
  activeProfile: "benevole" as const,
  badges: [],
});

const responseFormalitySchema = z.object({
  id: z.string(),
  requirementStatus: z.enum(["required", "recommended", "not_required", "unknown"]),
  procedureKind: z.enum(["city_aot", "police_declaration", "other_manager", "information_only", "none", "unknown"]),
  source: z.object({ verifiedOn: z.literal("2026-09-17") }).nullable(),
});
const formalitiesResponseSchema = z.object({
  facts: actionFormalitiesFactsSchema,
  qualification: z.object({ formalities: z.array(responseFormalitySchema) }),
  workflow: z.object({
    progress: z.array(z.object({
      formalityId: z.string(),
      userStatus: z.enum(["not_started", "prepared", "sent"]),
      validForQualification: z.boolean(),
      invalidatedAt: z.string().nullable(),
    })),
    trace: z.object({
      verifiedOn: z.string().nullable(),
      actionDependencyFingerprint: z.string(),
    }),
  }),
});
type FormalitiesResponse = {
  facts: ActionFormalitiesFacts;
  qualification: {
    formalities: Array<Pick<ActionFormality, "id" | "requirementStatus" | "procedureKind"> & {
      source: Pick<NonNullable<ActionFormality["source"]>, "verifiedOn"> | null;
    }>;
  };
  workflow: {
    progress: Array<Pick<ActionFormalitiesWorkflowState["progress"][number], "formalityId" | "userStatus" | "validForQualification" | "invalidatedAt">>;
    trace: Pick<ActionFormalitiesWorkflowState["trace"], "verifiedOn" | "actionDependencyFingerprint">;
  };
};

async function readFormalitiesResponse(response: Response): Promise<FormalitiesResponse> {
  const parsed = formalitiesResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Malformed formalities response");
  }
  return parsed.data;
}

describe("/api/actions/:actionId/formalities", () => {
  let update: ReturnType<typeof vi.fn<FormalitiesUpdate>>;
  let from: FormalitiesSupabase["from"];

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, userId: "user-1" });
    identityMock.mockResolvedValue(identity("user-1"));
    loadActionMock.mockResolvedValue(action());
    loadOrganizersMock.mockResolvedValue(["user-1"]);
    resolveActionTerritoryMock.mockResolvedValue(null);
    update = vi.fn<FormalitiesUpdate>().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "action-42" }, error: null }),
        }),
      }),
    });
    from = vi.fn().mockReturnValue({ update });
    supabaseMock.mockReturnValue({ from });
    validationErrorMock.mockImplementation((details) => NextResponse.json({
      error: "Validation error",
      kind: "validation",
      referenceCode: "VAL-TEST",
      details,
      status: "validation_error",
    }, { status: 422 }));
    unauthorizedMock.mockImplementation(() => NextResponse.json({
      error: "unauthorized",
      kind: "permission",
      code: "unauthorized",
      hint: "Connectez-vous pour accéder à cette ressource.",
      referenceCode: "AUTH-TEST",
    }, { status: 401 }));
    handleApiErrorMock.mockImplementation(() => NextResponse.json({
      error: "server",
      kind: "server",
      referenceCode: "TEST-500",
      status: "error",
    }, { status: 500 }));
  });

  it("does not load a private action for an anonymous visitor", async () => {
    authMock.mockResolvedValueOnce({ ok: false, status: 401, error: "unauthorized" });

    const response = await GET(formalitiesRequest(), {
      params: Promise.resolve({ actionId: "action-42" }),
    });

    expect(response.status).toBe(401);
    expect(loadActionMock).not.toHaveBeenCalled();
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it("rejects an empty action id before loading any action", async () => {
    const response = await GET(formalitiesRequest(), {
      params: Promise.resolve({ actionId: "   " }),
    });

    expect(response.status).toBe(422);
    expect(validationErrorMock).toHaveBeenCalledWith({
      actionId: ["Identifiant d'action manquant."],
    });
    expect(loadActionMock).not.toHaveBeenCalled();
  });

  it("returns not found without resolving permissions for a missing action", async () => {
    loadActionMock.mockResolvedValueOnce(null);

    const response = await GET(formalitiesRequest(), {
      params: Promise.resolve({ actionId: "action-42" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Action introuvable." });
    expect(loadOrganizersMock).not.toHaveBeenCalled();
  });

  it("refuses a GET when the authenticated user cannot manage the action", async () => {
    authMock.mockResolvedValueOnce({ ok: true, userId: "other-user" });
    identityMock.mockResolvedValueOnce(identity("other-user"));
    loadOrganizersMock.mockResolvedValueOnce([]);
    const response = await GET(formalitiesRequest(), {
      params: Promise.resolve({ actionId: "action-42" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Vous n'êtes pas autorisé à consulter les formalités de cette action.",
    });
    expect(resolveActionTerritoryMock).not.toHaveBeenCalled();
  });

  it("keeps the GET contract limited to pre-actions", async () => {
    loadActionMock.mockResolvedValueOnce({ ...action(), action_phase: "post_action_complete" });

    const response = await GET(formalitiesRequest(), {
      params: Promise.resolve({ actionId: "action-42" }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Les formalités locales concernent uniquement une pré-action.",
    });
    expect(resolveActionTerritoryMock).not.toHaveBeenCalled();
  });

  it("returns an explainable unknown qualification when the manager is not known", async () => {
    const response = await GET(formalitiesRequest(), {
      params: Promise.resolve({ actionId: "action-42" }),
    });
    const body = await readFormalitiesResponse(response);

    expect(response.status).toBe(200);
    expect(body.qualification.formalities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementStatus: "unknown",
          procedureKind: "unknown",
        }),
      ]),
    );
    expect(body.workflow.progress[0].userStatus).toBe("not_started");
    expect(body.workflow.trace.verifiedOn).toBeNull();
  });

  it("qualifies and persists the user-owned context without accepting a forged sent state", async () => {
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({
          facts: formalitiesFacts(),
        }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );
    const body = await readFormalitiesResponse(response);

    expect(response.status).toBe(200);
    expect(body.qualification.formalities[0].requirementStatus).toBe("required");
    expect(body.qualification.formalities[0].source).toMatchObject({ verifiedOn: "2026-09-17" });
    expect(body.workflow.progress[0].userStatus).toBe("not_started");
    const persisted = update.mock.calls.at(-1)?.[0];
    if (!persisted) throw new Error("Expected formalities persistence payload");
    expect(persisted).toMatchObject({
      preparation_data: {
        formalitiesContext: { publicSpace: "public_domain" },
        formalitiesWorkflow: { progress: [{ userStatus: "not_started" }] },
      },
    });
  });

  it("rejects malformed JSON before loading the action", async () => {
    const response = await PATCH(
      formalitiesRequest({ method: "PATCH", body: "{" }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON payload" });
    expect(loadActionMock).not.toHaveBeenCalled();
  });

  it("rejects an empty patch before loading the action", async () => {
    const response = await PATCH(
      formalitiesRequest({ method: "PATCH", body: JSON.stringify({}) }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );

    expect(response.status).toBe(422);
    expect(loadActionMock).not.toHaveBeenCalled();
  });

  it("rejects a transition for a formality absent from the current qualification", async () => {
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({
          transition: { formalityId: "not-currently-applicable", kind: "mark_prepared" },
        }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      details: { transition: ["La formalité sélectionnée n'est plus applicable à ces faits."] },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns a server error when persisting the qualification fails", async () => {
    update = vi.fn<FormalitiesUpdate>().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ error: new Error("database failure") }),
        }),
      }),
    });
    from = vi.fn().mockReturnValue({ update });
    supabaseMock.mockReturnValue({ from });
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({ facts: formalitiesFacts() }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "server" });
    expect(handleApiErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "database failure" }),
      "PATCH /api/actions/:actionId/formalities",
    );
  });

  it("keeps PATCH limited to pre-actions", async () => {
    loadActionMock.mockResolvedValueOnce({ ...action(), action_phase: "post_action_complete" });

    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({ facts: formalitiesFacts() }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Les formalités locales concernent uniquement une pré-action.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("ignores a forged Paris territory while preserving other declarative facts", async () => {
    loadActionMock.mockResolvedValueOnce({
      ...action(),
      department_code: "92",
      department_name: "Hauts-de-Seine",
    });
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({
          facts: formalitiesFacts({
            territory: {
              countryCode: "FR",
              code: "FR-75",
              label: "Paris (75)",
              specialTerritory: { code: "FR-PARIS", label: "Paris" },
            },
          }),
        }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );
    const body = await readFormalitiesResponse(response);

    expect(response.status).toBe(200);
    expect(body.facts.territory).toEqual(
      expect.objectContaining({ code: "FR-92", label: "Hauts-de-Seine" }),
    );
    expect(body.facts.publicSpace).toBe("public_domain");
    expect(body.qualification.formalities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "paris-city-public-domain-aot" }),
        expect.objectContaining({ id: "paris-police-public-roadway-declaration" }),
      ]),
    );
    const persisted = update.mock.calls.at(-1)?.[0];
    if (!persisted) throw new Error("Expected formalities persistence payload");
    expect(persisted).toMatchObject({
      preparation_data: {
        formalitiesContext: {
          territory: { code: "FR-92" },
          publicSpace: "public_domain",
        },
      },
    });
  });

  it("keeps the territory resolved from the current action", async () => {
    resolveActionTerritoryMock.mockResolvedValueOnce({
      commune: { code: "92050", name: "Nanterre" },
      department: { code: "92", name: "Hauts-de-Seine" },
      region: { code: "11", name: "Île-de-France" },
      specialTerritory: null,
      source: "geo.api.gouv.fr",
    });
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({
          facts: formalitiesFacts({
            publicSpace: "private_domain",
            manager: { kind: "private", label: "Propriétaire" },
            hasInstallations: false,
            requiresPhysicalOccupation: false,
          }),
        }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );
    const body = await readFormalitiesResponse(response);

    expect(response.status).toBe(200);
    expect(body.facts.territory).toEqual({
      countryCode: "FR",
      code: "FR-92",
      label: "Nanterre",
      commune: { codeInsee: "92050", label: "Nanterre" },
      department: { code: "92", label: "Hauts-de-Seine" },
      region: { code: "11", label: "Île-de-France" },
      specialTerritory: null,
    });
  });

  it("preserves the stored territory fallback when resolution is unavailable", async () => {
    loadActionMock.mockResolvedValueOnce({
      ...action(),
      department_code: null,
      department_name: null,
      preparation_data: {
        plannedObjective: "nettoyage",
        formalitiesContext: {
          territory: {
            countryCode: "FR",
            code: "FR-92",
            label: "Hauts-de-Seine",
            department: { code: "92", label: "Hauts-de-Seine" },
            commune: null,
            region: null,
            specialTerritory: null,
          },
          publicSpace: "unknown",
          manager: { kind: "unknown", label: null },
          isCleanwalk: true,
          isPublicRoadwayActivity: "unknown",
          isItinerant: "unknown",
          isClaiming: "unknown",
          hasInstallations: "unknown",
          requiresPhysicalOccupation: "unknown",
          localCustomaryUse: "unknown",
          largeCrowdOrComplexInstallations: "unknown",
        },
      },
    });
    resolveActionTerritoryMock.mockResolvedValueOnce(null);
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({
          facts: formalitiesFacts({
            territory: { countryCode: "FR", code: "FR-75", label: "Paris (75)" },
            manager: { kind: "unknown", label: null },
            publicSpace: "public_domain",
            isPublicRoadwayActivity: false,
            isItinerant: false,
            isClaiming: false,
            hasInstallations: false,
            requiresPhysicalOccupation: false,
          }),
        }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );
    const body = await readFormalitiesResponse(response);

    expect(response.status).toBe(200);
    expect(body.facts.territory).toEqual(
      expect.objectContaining({ code: "FR-92", label: "Hauts-de-Seine" }),
    );
  });

  it("invalidates the workflow after a real action territory change", async () => {
    const previousFacts = deriveActionFormalitiesFacts({
      departmentCode: "92",
      departmentName: "Hauts-de-Seine",
      plannedObjective: "nettoyage",
    });
    const previousQualification = qualifyActionFormalities(previousFacts);
    const previousWorkflow = buildFormalitiesWorkflowState({
      facts: previousFacts,
      qualification: previousQualification,
      actionDependencies: {
        territoryFingerprint: buildFormalitiesTerritoryFingerprint(previousFacts.territory),
      },
      now: "2026-09-26T00:00:00.000Z",
    });
    previousWorkflow.progress = previousWorkflow.progress.map((item) => ({
      ...item,
      userStatus: "sent",
      validForQualification: true,
    }));
    loadActionMock.mockResolvedValueOnce({
      ...action(),
      department_code: "93",
      department_name: "Seine-Saint-Denis",
      preparation_data: {
        plannedObjective: "nettoyage",
        formalitiesWorkflow: previousWorkflow,
      },
    });
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({
          facts: formalitiesFacts({
            territory: { countryCode: "FR", code: "FR-75", label: "Paris (75)" },
            publicSpace: "unknown",
            manager: { kind: "unknown", label: null },
            isPublicRoadwayActivity: "unknown",
            isItinerant: "unknown",
            isClaiming: "unknown",
            hasInstallations: "unknown",
            requiresPhysicalOccupation: "unknown",
            localCustomaryUse: "unknown",
            largeCrowdOrComplexInstallations: "unknown",
          }),
        }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );
    const body = await readFormalitiesResponse(response);

    expect(response.status).toBe(200);
    expect(body.facts.territory.code).toBe("FR-93");
    expect(body.workflow.trace.actionDependencyFingerprint).not.toBe(
      previousWorkflow.trace.actionDependencyFingerprint,
    );
    const invalidatedProgress = body.workflow.progress.find(
      (item) => item.formalityId === previousWorkflow.progress[0].formalityId,
    );
    expect(invalidatedProgress).toMatchObject({
      userStatus: "sent",
      validForQualification: false,
    });
    expect(invalidatedProgress?.invalidatedAt).toBeTypeOf("string");
  });

  it("requires action management permission before changing formalities", async () => {
    identityMock.mockResolvedValueOnce(identity("other-user"));
    authMock.mockResolvedValueOnce({ ok: true, userId: "other-user" });
    loadOrganizersMock.mockResolvedValueOnce([]);
    const response = await PATCH(
      formalitiesRequest({
        method: "PATCH",
        body: JSON.stringify({ transition: { formalityId: "x", kind: "declare_sent" } }),
      }),
      { params: Promise.resolve({ actionId: "action-42" }) },
    );

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
