import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyObservationsReadSnapshot } from "@/lib/actions/my-observations-client";
import { MyObservationsSection } from "./my-observations-section";

function snapshot(overrides: Partial<MyObservationsReadSnapshot>): MyObservationsReadSnapshot {
  return { status: "idle", items: [], error: null, ...overrides };
}

const observations = [
  {
    id: "spot-1",
    createdAt: "2026-08-26T10:00:00Z",
    type: "spot" as const,
    label: "Quai de Seine",
    status: "new" as const,
    latitude: 48.85,
    longitude: 2.35,
    validatedAt: null,
    cleanedAt: null,
  },
  {
    id: "clean-1",
    createdAt: "2026-08-25T10:00:00Z",
    type: "clean_place" as const,
    label: "Place propre",
    status: "validated" as const,
    latitude: 48.86,
    longitude: 2.36,
    validatedAt: "2026-08-25T11:00:00Z",
    cleanedAt: null,
  },
  {
    id: "clean-2",
    createdAt: "2026-08-24T10:00:00Z",
    type: "clean_place" as const,
    label: "Square propre",
    status: "cleaned" as const,
    latitude: 48.87,
    longitude: 2.37,
    validatedAt: "2026-08-24T11:00:00Z",
    cleanedAt: "2026-08-25T09:00:00Z",
  },
];

describe("Mes observations section", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders loading, empty and error states with a useful action", () => {
    const loading = renderToStaticMarkup(
      React.createElement(MyObservationsSection, {
        snapshot: snapshot({ status: "loading" }),
        onRetry: () => undefined,
      }),
    );
    const empty = renderToStaticMarkup(
      React.createElement(MyObservationsSection, {
        snapshot: snapshot({ status: "empty" }),
        onRetry: () => undefined,
      }),
    );
    const error = renderToStaticMarkup(
      React.createElement(MyObservationsSection, {
        snapshot: snapshot({ status: "error" }),
        onRetry: () => undefined,
      }),
    );

    expect(loading).toContain("Chargement de vos observations");
    expect(empty).toContain("Vous n&#x27;avez pas encore d&#x27;observation");
    expect(empty).toContain('href="#signalement"');
    expect(error).toContain("Vos observations n&#x27;ont pas pu être chargées");
    expect(error).toContain("Réessayer");
  });

  it("maps all user statuses and keeps media loading behind the explicit proof button", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const markup = renderToStaticMarkup(
      React.createElement(MyObservationsSection, {
        snapshot: snapshot({ status: "ready", items: observations }),
        onRetry: () => undefined,
      }),
    );

    expect(markup).toContain("Mes observations");
    expect(markup).toContain("Spot");
    expect(markup).toContain("Lieu propre");
    expect(markup).toContain("En attente de validation");
    expect(markup).toContain("Validé");
    expect(markup).toContain("Nettoyé");
    expect(markup).toContain("Quai de Seine");
    expect(markup).toContain("Place propre");
    expect(markup).toContain("Square propre");
    expect(markup.match(/Voir les preuves photo/g)).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
