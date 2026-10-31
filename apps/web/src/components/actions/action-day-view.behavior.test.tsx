// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionDayBriefing } from "@/lib/actions/day-briefing-http";
import { createReactDomHarness, deferred } from "@/__tests__/support/action-behavior-test-helpers";
import { ActionDayView } from "./action-day-view";

const fetchBriefingMock = vi.hoisted(() => vi.fn());
const requestWeatherMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/actions/day-briefing-http", () => ({
  fetchActionDayBriefing: fetchBriefingMock,
}));
vi.mock("./use-action-preparation-weather", () => ({
  useActionPreparationWeather: () => ({
    weatherContext: null,
    weatherRequest: null,
    weatherState: "idle",
    requestWeather: requestWeatherMock,
  }),
}));
vi.mock("./action-field-roles-panel", () => ({
  ActionFieldRolesPanel: () => <div data-testid="field-roles" />,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function briefing(actionId: string, overrides: Partial<ActionDayBriefing["action"]> = {}): ActionDayBriefing {
  return {
    status: "ok",
    actionId,
    access: "confirmed_volunteer",
    action: {
      status: "approved",
      publishedAt: "2026-10-20T08:00:00.000Z",
      actionPhase: "pre_action",
      title: `Action ${actionId}`,
      actionDate: "2026-10-21",
      locationLabel: "Parc central",
      meetingPoint: "Entrée nord",
      meetingTime: "09:00",
      eventStartTime: "09:00",
      eventEndTime: "11:00",
      organizerLabel: "Association locale",
      participantMessage: "Rendez-vous confirmé.",
      safetyInstructions: "Porter des gants.",
      recommendedMaterials: "Eau",
      materialsProvided: null,
      equipmentProvided: [],
      equipmentNotProvided: [],
      refreshmentsProvided: [],
      accessibility: null,
      accessibilityStatus: "not_evaluated",
      route: {
        topology: "point_to_point",
        departureLabel: "Entrée nord",
        arrivalLabel: "Quai sud",
        hasSelectedOperationalRoute: true,
        targetDistanceKm: 1.2,
        networkDistanceKm: 1.4,
      },
      map: {
        latitude: null,
        longitude: null,
        geometrySource: null,
        hasGeometry: false,
      },
      ...overrides,
    },
  };
}

const harness = createReactDomHarness();

function mount(actionId: string) {
  return harness.mount(<ActionDayView actionId={actionId} />);
}

afterEach(() => {
  harness.cleanup();
  vi.clearAllMocks();
});

describe("ActionDayView behavior", () => {
  it("keeps a late briefing from action A out of action B", async () => {
    const first = deferred<ActionDayBriefing>();
    const second = deferred<ActionDayBriefing>();
    fetchBriefingMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const mounted = mount("action-a");

    harness.render(<ActionDayView actionId="action-b" />);
    first.resolve(briefing("action-a"));
    await harness.flush();

    expect(mounted.querySelector('[role="status"]')?.textContent).toContain("Chargement");
    expect(mounted.textContent).not.toContain("Action action-a");

    second.resolve(briefing("action-b"));
    await harness.flush();

    expect(mounted.querySelector('[data-testid="action-day-view"]')?.textContent).toContain("Action action-b");
    expect(mounted.textContent).toContain("Coordonnées non disponibles");
    expect(mounted.querySelector('a[href*="openstreetmap"]')).toBeNull();
  });

  it("exposes a recoverable loading error and keeps clipboard failure local to the copy action", async () => {
    fetchBriefingMock.mockRejectedValueOnce(new Error("Briefing indisponible côté réseau"));
    const mounted = mount("action-error");
    await harness.flush();
    expect(mounted.querySelector('[role="alert"]')?.textContent).toContain("réseau");

    fetchBriefingMock.mockResolvedValueOnce(briefing("action-copy"));
    harness.render(<ActionDayView actionId="action-copy" />);
    await harness.flush();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("clipboard unavailable")) },
    });
    const copy = [...mounted.querySelectorAll("button")].find((button) => button.textContent?.includes("Copier"));
    expect(copy).toBeTruthy();
    await act(async () => {
      copy?.click();
      await Promise.resolve();
    });
    expect(mounted.querySelector('[role="status"]')?.textContent).toContain("Copie indisponible");
  });
});
