import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const searchParams = vi.hoisted(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  usePathname: () => "/sections/funding",
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

import { FundingSection } from "./funding-section";

describe("FundingSection", () => {
  it("renders the two public funding categories and the allocation explanation", () => {
    const markup = renderToStaticMarkup(<FundingSection />);

    expect(markup).toContain("Soutenir CleanMyMap");
    expect(markup).toContain("Matériel pour les actions terrain");
    expect(markup).toContain("Développement et fonctionnement");
    expect(markup).toContain("Soutenir le matériel");
    expect(markup).toContain("Soutenir le développement");
    expect(markup).toContain("Où va l’argent ?");
    expect(markup).toContain("Chargement…");
    expect(markup).toContain("n’est pas un reçu fiscal");
    expect(markup).toContain("n’annonce ni réduction fiscale ni mécénat fiscal");
    expect(markup).not.toContain("constitue un mécénat fiscal");
    expect(markup).not.toContain("promesse de réduction fiscale");
  });

  it("presents the cancelled return without claiming a payment", () => {
    searchParams.set("status", "cancelled");
    const markup = renderToStaticMarkup(<FundingSection />);
    expect(markup).toContain("Paiement annulé");
    expect(markup).toContain("Aucun montant n’a été confirmé");
    searchParams.delete("status");
  });
});
