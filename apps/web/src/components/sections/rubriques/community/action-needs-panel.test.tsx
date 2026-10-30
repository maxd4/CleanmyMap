import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionNeedsPanel } from "./action-needs-panel";

describe("ActionNeedsPanel", () => {
  it("announces the loading state before the public needs projection arrives", () => {
    const markup = renderToStaticMarkup(<ActionNeedsPanel fr focusActionId={null} />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Chargement des besoins");
  });
});
