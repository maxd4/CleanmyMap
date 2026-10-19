import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicSectionBreakdown } from "@/lib/sections/public-section-snapshot-contract";

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));
const swrState = vi.hoisted(() => ({
  data: undefined as PublicSectionBreakdown | undefined,
  error: undefined as Error | undefined,
  isLoading: false,
  isValidating: false,
}));
const swrCalls = vi.hoisted(() => [] as Array<{ key: string | null; options: Record<string, unknown> }>);

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => authState,
}));

vi.mock("swr", () => ({
  default: (key: string | null, _fetcher: unknown, options: Record<string, unknown>) => {
    swrCalls.push({ key, options });
    return swrState;
  },
}));

import { RecyclingBreakdownDetails } from "./recycling-breakdown-details";

const snapshot: PublicSectionBreakdown = {
  totalKg: 6,
  wasteCoverageRate: 66.7,
  lines: [{ category: "recyclables", kg: 3, sharePercent: 50, entries: 1 }],
  triQuality: { elevee: 1, moyenne: 0, faible: 0 },
  generatedAt: "2026-10-19T12:00:00.000Z",
};

function lastCall() {
  return swrCalls.at(-1);
}

describe("RecyclingBreakdownDetails", () => {
  beforeEach(() => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    swrState.data = undefined;
    swrState.error = undefined;
    swrState.isLoading = false;
    swrState.isValidating = false;
    swrCalls.length = 0;
  });

  it("keeps the private SWR key inactive and offers sign-in to anonymous visitors", () => {
    const markup = renderToStaticMarkup(<RecyclingBreakdownDetails fr onLoaded={vi.fn()} />);

    expect(lastCall()?.key).toBeNull();
    expect(markup).toContain("Connectez-vous pour consulter les flux privés");
    expect(markup).toContain("Voir la répartition détaillée des déchets");
    expect(markup).not.toContain("Répartition détaillée disponible depuis le snapshot réel");
  });

  it("activates one cached SWR view only after an authorized click", () => {
    authState.isSignedIn = true;
    swrState.data = snapshot;

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<RecyclingBreakdownDetails fr onLoaded={vi.fn()} />);
    });
    expect(lastCall()?.key).toBeNull();

    const trigger = renderer.root.findAllByType("button").find((button) =>
      String(button.props.children).includes("Voir la répartition détaillée"),
    );
    expect(trigger).toBeDefined();

    act(() => trigger?.props.onClick());

    expect(lastCall()?.key).toBe("section-recycling-breakdown");
    expect(lastCall()?.options).toMatchObject({
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
    });
    expect(lastCall()?.options.dedupingInterval).toBe(60_000);
    expect(renderer.root.findByProps({ "data-breakdown-state": "success" })).toBeDefined();
  });

  it("keeps an unavailable result distinct from zero", () => {
    authState.isSignedIn = true;
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<RecyclingBreakdownDetails fr onLoaded={vi.fn()} />);
    });

    const trigger = renderer.root.findAllByType("button").find((button) =>
      String(button.props.children).includes("Voir la répartition détaillée"),
    );
    act(() => trigger?.props.onClick());

    expect(renderer.root.findAllByType("button").some((button) => String(button.props.children).includes("Réessayer"))).toBe(true);
    expect(renderer.root.findAllByType("p").some((paragraph) => String(paragraph.props.children).includes("aucune valeur inconnue n’est présentée comme zéro"))).toBe(true);
  });
});
