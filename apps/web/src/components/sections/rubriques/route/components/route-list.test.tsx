import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RouteStop } from "@/lib/route/route-contract";
import { RouteList } from "./route-list";

const stop: RouteStop = {
  id: "stop-1",
  label: "Canal Saint-Martin",
  latitude: 48.8738,
  longitude: 2.3646,
  segmentKm: 1.2,
  estimatedMinutes: 18,
  priorityReason: "Accumulation visible",
  score: 8.4,
};

describe("RouteList keyboard semantics", () => {
  it("separates the native selection button from the GPS link", () => {
    const markup = renderToStaticMarkup(
      <RouteList
        hasRoute
        picks={[stop]}
        fr
        selectedStopId={stop.id}
        onSelectStop={vi.fn()}
      />,
    );

    expect(markup).toContain('<button type="button"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-label="Sélectionner Canal Saint-Martin"');
    expect(markup).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=48.8738,2.3646"');
    expect(markup).not.toContain('<li role="button"');
    expect(markup).not.toContain('tabindex="0"');

    const buttonStart = markup.indexOf("<button");
    const buttonEnd = markup.indexOf("</button>", buttonStart);
    expect(markup.slice(buttonStart, buttonEnd)).not.toContain("Ouvrir GPS");
  });

  it("keeps the empty state non-interactive", () => {
    const markup = renderToStaticMarkup(
      <RouteList hasRoute={false} picks={[]} fr />,
    );

    expect(markup).toContain("Aucun point de collecte");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain('role="button"');
  });
});
