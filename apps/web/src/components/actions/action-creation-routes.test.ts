import { describe, expect, it } from "vitest";
import {
  buildActionCreationPanelHref,
  normalizeActionCreationPanel,
} from "@/lib/actions/action-creation-routes";

describe("action creation panel routes", () => {
  it("normalizes only the four independent panels", () => {
    expect(normalizeActionCreationPanel("itineraire")).toBe("itineraire");
    expect(normalizeActionCreationPanel("meteo")).toBe("meteo");
    expect(normalizeActionCreationPanel("formalites")).toBe("formalites");
    expect(normalizeActionCreationPanel("unexpected")).toBe("pre-formulaire");
  });

  it("preserves useful legacy query parameters while selecting a panel", () => {
    expect(
      buildActionCreationPanelHref("meteo", {
        source: "guide",
        actionId: "action-42",
        panel: "itineraire",
        tag: ["terrain", "safety"],
      }),
    ).toBe(
      "/actions/new?panel=meteo&source=guide&actionId=action-42&tag=terrain&tag=safety",
    );
  });
});
