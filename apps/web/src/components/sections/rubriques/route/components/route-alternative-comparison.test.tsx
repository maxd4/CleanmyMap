import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { RouteResponse } from "../route-types";
import { RouteAlternativeComparison } from "./route-alternative-comparison";

function route(overrides: Partial<RouteResponse> = {}): RouteResponse {
  return {
    origin: { latitude: 48.8462, longitude: 2.3464, source: "address" },
    routeTopology: "loop",
    isLoop: true,
    travelDistanceKm: 2.4,
    travelMinutes: 24,
    pollutionRelevance: { score: 38 },
    ...overrides,
  } as unknown as RouteResponse;
}

function foundAlternative(): RouteResponse {
  return route({
    origin: { latitude: 48.8566, longitude: 2.3522, source: "planner" },
    travelDistanceKm: 2.8,
    travelMinutes: 28,
    pollutionRelevance: { score: 74 },
    nearestRelevantSearch: {
      status: "found",
      rendezvous: { latitude: 48.8566, longitude: 2.3522, source: "planner" },
      accessDistanceKm: 0.42,
      accessDurationMinutes: 6,
      routingStatus: "network",
    },
  } as Partial<RouteResponse>);
}

function button(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const candidate = renderer.root.findAllByType("button").find((item) => item.props["aria-label"] === label);
  if (!candidate) throw new Error("Button not found: " + label);
  return candidate;
}

describe("RouteAlternativeComparison", () => {
  it("compare les deux boucles et expose l'écart d'accès avant acceptation", () => {
    const markup = renderToStaticMarkup(
      <RouteAlternativeComparison
        current={route()}
        alternative={foundAlternative()}
        isLoading={false}
        onAccept={vi.fn()}
        onKeep={vi.fn()}
      />,
    );

    expect(markup).toContain("L’itinéraire actuel reste conservé jusqu’à votre choix.");
    expect(markup).toContain("Mon itinéraire");
    expect(markup).toContain("Alternative proposée");
    expect(markup).toContain("Distance supplémentaire");
    expect(markup).toContain("0.42 km · 6 min");
    expect(markup).toContain("Utiliser cet itinéraire");
    expect(markup).toContain("Conserver mon itinéraire");
    expect(markup).toContain("potentiel théorique relatif");
  });

  it("ne propose pas une alternative absente et conserve les actions de décision accessibles", () => {
    const onAccept = vi.fn();
    const onKeep = vi.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <RouteAlternativeComparison
          current={route()}
          alternative={route({ nearestRelevantSearch: { status: "not_found" } } as Partial<RouteResponse>)}
          isLoading={false}
          onAccept={onAccept}
          onKeep={onKeep}
        />,
      );
    });

    expect(renderer.toJSON()).toBeTruthy();
    expect(renderer.root.findAllByProps({ role: "status" }).some((item) => item.children.join("").includes("Aucune alternative"))).toBe(true);
    expect(renderer.root.findAllByType("button")).toHaveLength(1);
    act(() => { button(renderer, "Conserver mon itinéraire").props.onClick(); });
    expect(onKeep).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("déclenche exclusivement le choix explicite de l'utilisateur", () => {
    const onAccept = vi.fn();
    const onKeep = vi.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <RouteAlternativeComparison
          current={route()}
          alternative={foundAlternative()}
          isLoading={false}
          onAccept={onAccept}
          onKeep={onKeep}
        />,
      );
    });

    act(() => { button(renderer, "Utiliser cet itinéraire").props.onClick(); });
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onKeep).not.toHaveBeenCalled();
  });

  it("annonce une recherche en cours sans remplacer le tracé initial", () => {
    const markup = renderToStaticMarkup(
      <RouteAlternativeComparison current={route()} isLoading onAccept={vi.fn()} onKeep={vi.fn()} />,
    );

    expect(markup).toContain("Recherche des boucles pertinentes");
    expect(markup).toContain("L’itinéraire actuel reste conservé");
    expect(markup).not.toContain("Alternative proposée");
  });
});
