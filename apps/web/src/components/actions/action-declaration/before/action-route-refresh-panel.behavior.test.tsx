// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionRouteRefreshPanel } from "./action-route-refresh-panel";

const fetchActionMock = vi.hoisted(() => vi.fn());
const fetchSignalsMock = vi.hoisted(() => vi.fn());
const applyVersionMock = vi.hoisted(() => vi.fn());
const fetchRecommendationMock = vi.hoisted(() => vi.fn());
const buildSubmissionMock = vi.hoisted(() => vi.fn());
const buildProposalMock = vi.hoisted(() => vi.fn());
const compareRefreshMock = vi.hoisted(() => vi.fn());
const guidedRefreshReasonMock = vi.hoisted(() => vi.fn<() => string | null>(() => null));

vi.mock("@/lib/actions/http", () => ({ fetchActionById: fetchActionMock }));
vi.mock("@/lib/actions/route-version-http", () => ({
  fetchActionRouteRefreshSignals: fetchSignalsMock,
  applyActionRouteVersion: applyVersionMock,
}));
vi.mock("@/components/sections/rubriques/route/route-request", () => ({
  fetchRouteRecommendation: fetchRecommendationMock,
}));
vi.mock("@/lib/route/route-refresh", () => ({
  buildRouteRefreshProposal: buildProposalMock,
  buildRouteRefreshSubmission: buildSubmissionMock,
  compatibleRouteGroupCounts: (volunteers: number) => volunteers >= 2 ? [2, 3] : [],
  compareRouteRefresh: compareRefreshMock,
  guidedRouteRefreshUnavailableReason: guidedRefreshReasonMock,
}));
vi.mock("@/lib/route/route-refresh-signals", () => ({
  addRouteRefreshGroupReason: (signals: RouteRefreshSignals, groupCount: number) => ({
    ...signals,
    recommended: true,
    reasons: [...signals.reasons, ...(groupCount === signals.groupCount ? [] : ["group_count_changed"])],
  }),
}));

type RouteRefreshSignals = {
  activeAppliedAt: string;
  participants: { used: number; confirmed: number | null };
  groupCount: number;
  freshness: { status: "current" | "newer" | "unknown"; latestSourceAt: string | null };
  weather: { status: "unchanged" | "degraded" | "unknown"; message: string | null };
  recommended: boolean;
  reasons: string[];
};

const signals: RouteRefreshSignals = {
  activeAppliedAt: "2026-10-20T08:00:00.000Z",
  participants: { used: 4, confirmed: 6 },
  groupCount: 1,
  freshness: { status: "newer", latestSourceAt: "2026-10-21T08:00:00.000Z" },
  weather: { status: "unchanged", message: null },
  recommended: true,
  reasons: ["participants_changed", "newer_route_data"],
};

const currentCalculation = {
  snapshotHash: "old-hash",
  parameters: { volunteers: 4, groupCount: 1 },
  metrics: { distanceKm: 1.2, walkingMinutes: 30, collectionMinutes: 45, totalMinutes: 75 },
  stops: [],
};
const proposal = {
  response: {},
  plannerSnapshot: {},
  plannerProof: {},
  operationalRoute: {},
  calculation: {
    snapshotHash: "new-hash",
    parameters: { volunteers: 6, groupCount: 2 },
    metrics: { distanceKm: 1.4, walkingMinutes: 32, collectionMinutes: 48, totalMinutes: 80 },
    stops: [],
  },
};

const action = {
  id: "action-route-refresh",
  actionDate: "2026-10-21",
  eventStartTime: "09:00",
  eventEndTime: "11:00",
  latitude: 48.85,
  longitude: 2.35,
  preparationData: { routeVersioning: { active: { calculation: currentCalculation } } },
} as never;

const guidedAction = Object.assign({}, action as object, {
  preparationData: {
    routeVersioning: {
      active: {
        calculation: {
          ...currentCalculation,
          parameters: {
            volunteers: 10,
            groupCount: 2,
            planningMode: {
              type: "territorial-guided",
              version: "route-territorial-guided-v2",
              budget: {
                totalMinutes: 90,
                organizationMarginMinutes: 15,
                minimumCollectionMinutes: 45,
                travelMaxMinutes: 30,
              },
              groups: [1, 2].map((index) => ({
                label: `Secteur ${index}`,
                sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 },
                waypoints: [{ id: `waypoint-${index}`, label: `Passage ${index}`, latitude: 48.85, longitude: 2.35 }],
              })),
            },
          },
        },
      },
    },
  },
}) as never;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(item = action) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<ActionRouteRefreshPanel action={item} />));
  return host;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function button(label: string): HTMLButtonElement {
  const candidate = [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.includes(label));
  expect(candidate, `button containing ${label}`).toBeTruthy();
  return candidate!;
}

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.clearAllMocks();
  guidedRefreshReasonMock.mockReset();
  guidedRefreshReasonMock.mockReturnValue(null);
});

describe("ActionRouteRefreshPanel behavior", () => {
  it("shows a proposal without mutating the active route and keeps an explicit group choice", async () => {
    fetchSignalsMock.mockResolvedValue(signals);
    fetchRecommendationMock.mockResolvedValue({});
    buildSubmissionMock.mockReturnValue({ submission: true });
    buildProposalMock.mockReturnValue(proposal);
    compareRefreshMock.mockReturnValue({
      identical: false,
      current: currentCalculation,
      proposal: proposal.calculation,
      keptStopIds: [],
      addedStopIds: [],
      removedStopIds: [],
      priorityChanges: [],
    });
    const mounted = mount();
    await flush();

    expect(mounted.textContent).toContain("Actualisation recommandée");
    const split = [...mounted.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((input) => input.parentElement?.textContent?.includes("Diviser"));
    expect(split).toBeTruthy();
    act(() => split?.click());
    await act(async () => {
      button("Actualiser l'itinéraire").click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(buildSubmissionMock).toHaveBeenCalledWith(action, { volunteers: 6, groupCount: 2 });
    expect(mounted.textContent).toContain("Nouvelle proposition");
    expect(applyVersionMock).not.toHaveBeenCalled();
    expect(fetchActionMock).not.toHaveBeenCalled();

    await act(async () => {
      button("Conserver l'itinéraire actuel").click();
    });
    expect(mounted.textContent).toContain("L'itinéraire actuel est conservé.");
    expect(applyVersionMock).not.toHaveBeenCalled();
  });

  it("refreshes signals after an explicit proposal application and preserves unchanged status", async () => {
    fetchSignalsMock.mockResolvedValue(signals);
    fetchRecommendationMock.mockResolvedValue({});
    buildSubmissionMock.mockReturnValue({ submission: true });
    buildProposalMock.mockReturnValue(proposal);
    compareRefreshMock.mockReturnValue({
      identical: true,
      current: currentCalculation,
      proposal: { ...proposal.calculation, snapshotHash: "old-hash" },
      keptStopIds: [],
      addedStopIds: [],
      removedStopIds: [],
      priorityChanges: [],
    });
    applyVersionMock.mockResolvedValue({ status: "unchanged" });
    fetchActionMock.mockResolvedValue(action);
    const mounted = mount();
    await flush();

    await act(async () => {
      button("Actualiser l'itinéraire").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      button("Utiliser le nouvel itinéraire").click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(applyVersionMock).toHaveBeenCalledWith("action-route-refresh", expect.objectContaining({ plannerProof: proposal.plannerProof }));
    expect(fetchActionMock).toHaveBeenCalledWith("action-route-refresh");
    expect(fetchSignalsMock).toHaveBeenCalledTimes(2);
    expect(mounted.textContent).toContain("Aucune version supplémentaire n'a été créée");
  });

  it("keeps guided groups fixed, proposes a balanced refresh, and allows explicit refusal", async () => {
    const guidedSignals = {
      ...signals,
      participants: { used: 10, confirmed: 12 },
      groupCount: 2,
    };
    fetchSignalsMock.mockResolvedValue(guidedSignals);
    fetchRecommendationMock.mockResolvedValue({});
    buildSubmissionMock.mockReturnValue({ submission: true });
    buildProposalMock.mockReturnValue(proposal);
    compareRefreshMock.mockReturnValue({
      identical: false,
      current: currentCalculation,
      proposal: proposal.calculation,
      keptStopIds: [],
      addedStopIds: [],
      removedStopIds: [],
      priorityChanges: [],
    });
    const mounted = mount(guidedAction);
    await flush();

    expect(mounted.textContent).toContain("conservera 2 groupe(s)");
    expect(mounted.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    await act(async () => {
      button("Actualiser l'itinéraire").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(buildSubmissionMock).toHaveBeenCalledWith(guidedAction, { volunteers: 12, groupCount: 2 });
    expect(mounted.textContent).toContain("Nouvelle proposition");

    await act(async () => {
      button("Conserver l'itinéraire actuel").click();
    });
    expect(applyVersionMock).not.toHaveBeenCalled();
    expect(mounted.textContent).toContain("L'itinéraire actuel est conservé.");
  });

  it("blocks a non-representable guided refresh before transport", async () => {
    guidedRefreshReasonMock.mockReturnValue("Le recalcul territorial guidé conserve 2 groupe(s) : aucun éditeur de nouveaux secteurs et passages n'est disponible ici.");
    fetchSignalsMock.mockResolvedValue({
      ...signals,
      participants: { used: 10, confirmed: 12 },
      groupCount: 2,
    });
    const mounted = mount(guidedAction);
    await flush();

    expect(mounted.textContent).toContain("aucun éditeur de nouveaux secteurs");
    expect(button("Actualiser l'itinéraire").disabled).toBe(true);
    expect(fetchRecommendationMock).not.toHaveBeenCalled();
    expect(buildSubmissionMock).not.toHaveBeenCalled();
  });

  it("surfaces a route engine failure without replacing the active action", async () => {
    fetchSignalsMock.mockRejectedValue(new Error("Route indisponible"));
    buildSubmissionMock.mockReturnValue({ submission: true });
    fetchRecommendationMock.mockRejectedValue(new Error("Moteur hors ligne"));
    const mounted = mount();
    await flush();

    await act(async () => {
      button("Actualiser l'itinéraire").click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mounted.querySelector('[role="alert"]')?.textContent).toContain("Moteur hors ligne");
    expect(applyVersionMock).not.toHaveBeenCalled();
    expect(fetchActionMock).not.toHaveBeenCalled();
  });
});
