import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { EnvironmentalPolicyExplorer } from "./environmental-policy-explorer";

describe("EnvironmentalPolicyExplorer", () => {
  it("renders the priority world view, filters and the honest empty state", () => {
    const markup = renderToStaticMarkup(<EnvironmentalPolicyExplorer />);

    expect(markup).toContain("Politiques environnementales");
    expect(markup).toContain("Monde");
    expect(markup).toContain("France");
    expect(markup).toContain("Rechercher");
    expect(markup).toContain("État juridique");
    expect(markup).toContain("Aucune fiche publiée pour le moment.");
    expect(markup).toContain("revue humaine effective");
  });
});
