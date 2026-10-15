import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SpogomiPersonalEventsError from "./error";

describe("/spogomi/mes-evenements loading failure", () => {
  it("does not present a loading failure as an empty catalog", () => {
    const markup = renderToStaticMarkup(<SpogomiPersonalEventsError reset={vi.fn()} />);
    expect(markup).toContain("Compétitions indisponibles");
    expect(markup).toContain("Votre liste n’est pas un état vide");
    expect(markup).toContain("Réessayer");
    expect(markup).not.toContain("Aucune compétition ne correspond");
  });
});
