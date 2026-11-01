import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createDefaultRouteTerritorialGuidedMode } from "@/lib/route/route-planning-mode";
import { RouteGuidedEditor } from "./route-guided-editor";

describe("RouteGuidedEditor", () => {
  it("expose deux groupes 5/5, les secteurs, les passages, le départ commun et le budget", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const markup = renderToStaticMarkup(
      <RouteGuidedEditor
        mode={mode}
        options={{
          priorityVsTravel: 50,
          travelBudgetMinutes: 90,
          maxStops: 12,
          volunteers: 10,
          groupCount: 2,
          pickupPreference: "balanced",
        }}
        origin={{ latitude: 48.8566, longitude: 2.3522, source: "map" }}
        fr
        onChange={vi.fn()}
        onSelectOrigin={vi.fn()}
      />,
    );

    expect(markup).toContain("Mode territorial guidé");
    expect(markup).toContain("Groupe 1");
    expect(markup).toContain("Groupe 2");
    expect(markup).toContain("10 bénévoles · 2 groupes");
    expect(markup).toContain("Départ commun");
    expect(markup).toContain("Points de passage ordonnés");
    expect(markup).toContain("Créneau total");
    expect(markup).toContain("15 + 30 + 45 = 90 min");
  });
});
