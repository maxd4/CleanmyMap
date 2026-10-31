import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ActionRidesPanel } from "./action-rides-panel";

describe("ActionRidesPanel [EXECUTED_BEHAVIOR]", () => {
  it("exposes the private ride entry point and privacy warning", () => {
    const markup = renderToStaticMarkup(<ActionRidesPanel actionId="action-1" fr />);
    expect(markup).toContain("Covoiturage");
    expect(markup).toContain("Trajets proposés entre personnes inscrites et confirmées.");
    expect(markup).toContain("Proposer un trajet");
    expect(markup).not.toContain("latitude");
    expect(markup).not.toContain("longitude");
  });
});
