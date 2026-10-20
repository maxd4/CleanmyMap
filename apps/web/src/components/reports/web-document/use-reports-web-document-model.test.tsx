import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import {
  buildActionDataContract,
  type ActionDataContract,
  type BuildActionContractParams,
} from "@/lib/actions/data-contract";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";
import {
  REPORT_ADVANCED_FILTER_DEFAULTS,
  type ReportAdvancedFilters,
} from "@/lib/reports/report-advanced-filters";
import { useReportsWebDocumentModel } from "./use-reports-web-document-model";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type HookOptions = NonNullable<Parameters<typeof useReportsWebDocumentModel>[0]>;
type HookResult = ReturnType<typeof useReportsWebDocumentModel>;

function makeContract(
  id: string,
  overrides: Partial<BuildActionContractParams> = {},
): ActionDataContract {
  return buildActionDataContract({
    id,
    type: "action",
    status: "approved",
    source: "web_form",
    observedAt: "2026-04-08",
    createdAt: "2026-04-07T09:00:00.000Z",
    validatedAt: "2026-04-09T09:00:00.000Z",
    locationLabel: "Paris 10e",
    latitude: 48.8701,
    longitude: 2.3612,
    departmentCode: "75",
    departmentName: "Paris",
    wasteKg: 10,
    cigaretteButts: 100,
    volunteersCount: 4,
    durationMinutes: 60,
    actorName: "Alice",
    associationName: "Nettoyage Paris",
    createdByClerkId: "user-alice",
    wasteBreakdown: {
      megotsKg: 1,
      plastiqueKg: 2,
      verreKg: 0,
      metalKg: 0,
      mixteKg: 0,
    },
    ...overrides,
  });
}

function renderHook(initialOptions: HookOptions) {
  let result!: HookResult;
  let renderer!: ReactTestRenderer;

  function Harness(options: HookOptions) {
    result = useReportsWebDocumentModel(options);
    return null;
  }

  act(() => {
    renderer = create(React.createElement(Harness, initialOptions));
  });

  return {
    get result() {
      return result;
    },
    update(options: HookOptions) {
      act(() => {
        renderer.update(React.createElement(Harness, options));
      });
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

function baseOptions(contracts: ActionDataContract[]): HookOptions {
  return {
    initialContracts: contracts,
    initialCommunityEvents: [],
    initialNow: new Date("2026-04-15T12:00:00.000Z"),
  };
}

describe("useReportsWebDocumentModel", () => {
  it("construit le rapport réel, le profil déchets et l'export depuis les contrats canoniques", () => {
    const approved = makeContract("approved");
    const pending = makeContract("pending", { status: "pending", wasteBreakdown: null });
    const otherType = makeContract("spot", { type: "spot", status: "approved", wasteBreakdown: null });
    const rejected = makeContract("rejected", { status: "rejected", wasteBreakdown: null });
    const hook = renderHook(baseOptions([approved, pending, otherType, rejected]));

    expect(hook.result.report.totals.actions).toBe(1);
    expect(hook.result.report.moderation).toMatchObject({
      approved: 2,
      pending: null,
      rejected: null,
      conversion: null,
    });
    expect(hook.result.wasteProfile).toMatchObject({
      dominantLabel: "Plastique",
      dominantKg: 2,
      coveragePercent: 25,
    });
    expect(hook.result.wasteProfile.categories).toEqual([
      { key: "plastiqueKg", label: "Plastique", kg: 2, actions: 1 },
      { key: "megotsKg", label: "Mégots", kg: 1, actions: 1 },
    ]);

    const impact = computeActionImpactKpis(approved);
    expect(hook.result.exportRows).toHaveLength(4);
    const approvedRow = hook.result.exportRows.find((row) => row.Date === "2026-04-08");
    expect(approvedRow).toMatchObject({
      Date: "2026-04-08",
      Lieu: "Paris 10e",
      Type: "action",
      Masse_Kg_Declaree: approved.metadata.wasteKg,
      Masse_Kg_Impact: impact.wasteKg,
      CO2e_Proxy_Kg: impact.co2AvoidedKg,
      Bénévoles: 4,
    });
    expect(hook.result.report.totals.actions).toBe(1);
    expect(hook.result.exportRows.map((row) => row.Type)).toEqual([
      "action",
      "action",
      "other",
      "action",
    ]);
    hook.unmount();
  });

  it("filtre un périmètre géographique puis réinitialise une valeur devenue invalide", () => {
    const tenth = makeContract("tenth", {
      locationLabel: "Paris 10e",
      createdByClerkId: "user-alice",
      associationName: "Nettoyage Paris",
    });
    const eleventh = makeContract("eleventh", {
      locationLabel: "Paris 11e",
      createdByClerkId: "user-bob",
      actorName: "Bob",
      associationName: "Autre association",
    });
    const hook = renderHook({
      ...baseOptions([tenth, eleventh]),
      initialScope: { kind: "arrondissement", value: "10" },
    });

    expect(hook.result.scopeKind).toBe("arrondissement");
    expect(hook.result.scopeValue).toBe("10");
    expect(hook.result.report.totals.actions).toBe(1);
    expect(hook.result.exportRows).toHaveLength(1);
    expect(hook.result.activeScopeLabel).toContain("Paris 10e");

    act(() => hook.result.setScopeKind("account"));
    expect(hook.result.scopeValue).toBe("");
    expect(hook.result.report.totals.actions).toBe(2);

    act(() => hook.result.setScopeValue("user-bob"));
    expect(hook.result.scopeValue).toBe("user-bob");
    expect(hook.result.report.totals.actions).toBe(1);
    expect(hook.result.exportRows[0]?.Compte).toBe("user-bob");
    hook.unmount();
  });

  it("gère les jeux vides, non admissibles et les valeurs réelles à zéro sans inventer de données", () => {
    const noBreakdown = makeContract("no-breakdown", {
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 0,
      latitude: null,
      longitude: null,
      wasteBreakdown: null,
    });
    const pending = makeContract("pending-only", { status: "pending", wasteBreakdown: null });
    const hook = renderHook(baseOptions([noBreakdown, pending]));

    expect(hook.result.report.totals.actions).toBe(1);
    expect(hook.result.report.totals.kg).toBe(0);
    expect(hook.result.report.totals.volunteers).toBe(0);
    expect(hook.result.wasteProfile).toMatchObject({
      categories: [],
      dominantLabel: "Déchets non typés",
      dominantKg: 0,
      coveragePercent: 0,
    });
    expect(hook.result.exportRows).toHaveLength(2);
    const zeroRow = hook.result.exportRows.find((row) => row.Date === "2026-04-08");
    expect(zeroRow?.Masse_Kg_Declaree).toBe(0);
    expect(zeroRow?.Masse_Kg_Impact).toBe(0);
    expect(hook.result.report.map.points).toBe(0);

    const empty = renderHook(baseOptions([]));
    expect(empty.result.report.totals.actions).toBe(0);
    expect(empty.result.exportRows).toEqual([]);
    expect(empty.result.wasteProfile.categories).toEqual([]);
    hook.unmount();
    empty.unmount();
  });

  it("réutilise le filtre avancé canonique et conserve les limites de disponibilité", () => {
    const matching = makeContract("matching", {
      wasteBreakdown: { recyclablesKg: 2, glassKg: 0, householdWasteKg: 0, otherWasteKg: 0 },
    });
    const excluded = makeContract("excluded", {
      wasteBreakdown: { recyclablesKg: 0, glassKg: 2, householdWasteKg: 0, otherWasteKg: 0 },
    });
    const filters: ReportAdvancedFilters = {
      ...REPORT_ADVANCED_FILTER_DEFAULTS,
      wasteCategory: "recyclables",
    };
    const hook = renderHook({
      ...baseOptions([matching, excluded]),
      advancedFilters: filters,
      initialIsTruncated: true,
      initialCommunityEventsAvailability: "unavailable",
      initialSourceHealth: {
        partial: true,
        failedSources: ["actions"],
        availableSources: ["spots"],
        warnings: ["actions indisponibles"],
      },
    });

    expect(hook.result.filteredContracts.map((contract) => contract.id)).toEqual(["matching"]);
    expect(hook.result.exportRows).toHaveLength(1);
    expect(hook.result.dataAvailability).toMatchObject({
      isTruncated: true,
      communityEventsAvailability: "unavailable",
      sourceHealth: { partial: true },
    });
    expect(hook.result.isLoading).toBe(false);
    expect(hook.result.hasError).toBe(false);
    hook.unmount();
  });

  it("recalcule le modèle sur une nouvelle réponse et ne double-compte pas une action", () => {
    const first = makeContract("first");
    const second = makeContract("second", { locationLabel: "Paris 12e" });
    const hook = renderHook(baseOptions([first]));

    expect(hook.result.report.totals.actions).toBe(1);
    expect(hook.result.exportRows).toHaveLength(1);
    hook.update(baseOptions([second]));
    expect(hook.result.report.totals.actions).toBe(1);
    expect(hook.result.exportRows).toHaveLength(1);
    expect(hook.result.exportRows[0]?.Lieu).toBe("Paris 12e");
    expect(hook.result.report.map.points).toBe(1);
    hook.unmount();
  });
});
