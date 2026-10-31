import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { rendererText } from "@/__tests__/support/action-behavior-test-helpers";
import { TrashSpotterSection } from "./trash-spotter-section";

const trashState = vi.hoisted(() => ({
  current: {
    isLoading: true,
    error: null as unknown,
    quality: { received: 0, approved: 0, withCoords: 0, recent: [] as ActionMapItem[] },
  },
}));

vi.mock("./use-trash-spotter", () => ({
  useTrashSpotter: () => trashState.current,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/sections/trash-spotter",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children?: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/actions/map-feed/actions-map-feed", () => ({
  ActionsMapFeed: () => React.createElement("div", { "data-testid": "controlled-map-feed" }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function renderSection(locale: "fr" | "en" = "fr"): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      React.createElement(
        SitePreferencesProvider,
        { initialLocale: locale } as React.ComponentProps<typeof SitePreferencesProvider>,
        React.createElement(TrashSpotterSection),
      ),
    );
  });
  return renderer;
}

function spot(overrides: Partial<ActionMapItem> = {}): ActionMapItem {
  return {
    id: "spot-1",
    action_date: "2099-01-01",
    location_label: "Paris",
    latitude: null,
    longitude: null,
    waste_kg: null,
    cigarette_butts: null,
    waste_pollution_score: null,
    cigarette_butts_pollution_score: null,
    post_action_pollution_score: null,
    status: "approved",
    created_by_clerk_id: null,
    record_type: "spot",
    ...overrides,
  } as ActionMapItem;
}

afterEach(() => {
  trashState.current = {
    isLoading: true,
    error: null,
    quality: { received: 0, approved: 0, withCoords: 0, recent: [] },
  };
  vi.clearAllMocks();
});

describe("TrashSpotterSection behavior", () => {
  it("renders loading, empty data and zero-coverage urgency without leaking controls", () => {
    const renderer = renderSection();
    expect(rendererText(renderer)).toContain("Chargement des données de suivi…");

    act(() => {
      trashState.current = {
        isLoading: false,
        error: null,
        quality: { received: 0, approved: 0, withCoords: 0, recent: [] },
      };
      renderer.update(
        React.createElement(
          SitePreferencesProvider,
          { initialLocale: "fr" } as React.ComponentProps<typeof SitePreferencesProvider>,
          React.createElement(TrashSpotterSection),
        ),
      );
    });

    expect(rendererText(renderer)).toContain("0 %");
    expect(rendererText(renderer)).toContain("À surveiller");
    expect(rendererText(renderer)).toContain("Aucun signalement récent pour le moment.");
    expect(renderer.root.findAllByProps({ "data-testid": "controlled-map-feed" })).toHaveLength(1);
    expect(rendererText(renderer)).not.toContain("Créer");
  });

  it("shows the controlled error state and keeps invalid coordinates harmless", () => {
    const renderer = renderSection();
    act(() => {
      trashState.current = {
        isLoading: false,
        error: new Error("Flux indisponible"),
        quality: { received: 2, approved: 1, withCoords: 0, recent: [spot({ latitude: null, longitude: null })] },
      };
      renderer.update(React.createElement(SitePreferencesProvider, { initialLocale: "fr" } as React.ComponentProps<typeof SitePreferencesProvider>, React.createElement(TrashSpotterSection)));
    });

    expect(rendererText(renderer)).toContain("Flux indisponible");
    expect(rendererText(renderer)).toContain("0 %");
    expect(rendererText(renderer)).toContain("À surveiller");
    expect(rendererText(renderer)).toContain("Sans coordonnées");
    expect(rendererText(renderer)).toContain("Validé");
  });

  it("publishes moderate and high coverage thresholds in both locales", () => {
    const renderer = renderSection();
    act(() => {
      trashState.current = {
        isLoading: false,
        error: null,
        quality: { received: 2, approved: 2, withCoords: 1, recent: [spot({ latitude: 48.8566, longitude: 2.3522 })] },
      };
      renderer.update(React.createElement(SitePreferencesProvider, { initialLocale: "fr" } as React.ComponentProps<typeof SitePreferencesProvider>, React.createElement(TrashSpotterSection)));
    });
    expect(rendererText(renderer)).toContain("50 %");
    expect(rendererText(renderer)).toContain("Modérée");

    act(() => {
      trashState.current = {
        isLoading: false,
        error: null,
        quality: { received: 10, approved: 1, withCoords: 7, recent: [] },
      };
      renderer.update(
        React.createElement(
          React.Fragment,
          { key: "en" },
          React.createElement(SitePreferencesProvider, { initialLocale: "en" } as React.ComponentProps<typeof SitePreferencesProvider>, React.createElement(TrashSpotterSection)),
        ),
      );
    });
    expect(rendererText(renderer)).toContain("70 %");
    expect(rendererText(renderer)).toContain("High");
    expect(rendererText(renderer)).toContain("1 approved point");
  });
});
