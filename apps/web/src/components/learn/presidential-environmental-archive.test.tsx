import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

import { PresidentialEnvironmentalArchive } from "./presidential-environmental-archive";

describe("PresidentialEnvironmentalArchive", () => {
  it("shows both official rosters and their source origin without leaking unreviewed measures", () => {
    const markup = renderToStaticMarkup(<PresidentialEnvironmentalArchive />);

    expect(markup).toContain("Archives présidentielles");
    expect(markup).toContain("2012");
    expect(markup).toContain("2017");
    expect(markup).toContain("Source de la liste officielle");
    expect(markup).toContain("Ministère de l’Intérieur");
    expect(markup).toContain("Corpus non encore collecté");
    expect(markup).toContain("Aucun engagement validé n’est affiché");
    expect(markup).toContain("ne signifie pas l’absence de position");
    expect(markup).not.toContain("Porter la part du nucléaire à 50 % en 2025");
  });
});
