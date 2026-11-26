import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const searchParams = vi.hoisted(() => new URLSearchParams());
const localeState = vi.hoisted(() => ({ locale: "fr" as "fr" | "en" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/sections/funding", useSearchParams: () => searchParams,
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: localeState.locale }),
}));
import { FundingSection } from "./funding-section";
const ONPARTICIPE_URL = "https://www.onparticipe.fr/c/PUI9aOsy";
afterEach(() => { searchParams.delete("status"); searchParams.delete("session_id"); localeState.locale = "fr"; });

describe("FundingSection", () => {
  it("shows both needs without duplicating an unavailable payment action", () => {
    const markup = renderToStaticMarkup(<FundingSection />);
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain("Matériel pour les actions terrain");
    expect(markup).toContain("Développement et fonctionnement");
    expect(markup).toContain("La cagnotte n’est pas accessible");
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain("Chargement…");
    expect(markup).not.toContain("data-funding-stripe-total");
    expect(markup).not.toContain("checkout.stripe.com");
    expect(markup).not.toContain("/api/funding/checkout");
    expect(markup).toContain("Aucun montant OnParticipe n’est importé");
    expect(markup).toContain("Montants cumulés depuis le suivi Stripe");
    expect(markup).toContain("n’est pas un reçu fiscal");
    expect(markup).toContain("n’annonce ni réduction fiscale ni mécénat fiscal");
  });

  it("renders one exact configured campaign URL without selecting a category or amount", () => {
    const markup = renderToStaticMarkup(<FundingSection onParticipeUrl={ONPARTICIPE_URL} />);
    const links = [...markup.matchAll(/href="([^"]+)"/g)].map(match => match[1]).filter(href => href.includes("onparticipe.fr"));
    expect(links).toEqual([ONPARTICIPE_URL]);
    expect(markup).toContain("Soutenir via OnParticipe");
    expect(markup).toContain("CleanMyMap ne garantit aucune affectation par catégorie");
    expect(markup).not.toMatch(/amountCents|category=equipment|category=development|checkout\.stripe\.com|amount=/);
  });

  it("keeps the English version and heading level", () => {
    localeState.locale = "en";
    const markup = renderToStaticMarkup(<FundingSection headingLevel="h2" onParticipeUrl={ONPARTICIPE_URL} />);
    expect(markup).toContain("Support via OnParticipe");
    expect(markup).toContain("Not included in totals");
    expect(markup).not.toContain("<h1");
  });

  it("does not infer payment from a return parameter", () => {
    searchParams.set("status", "success");
    const markup = renderToStaticMarkup(<FundingSection />);
    expect(markup).toContain("Retour de paiement non vérifié");
    expect(markup).not.toContain("Contribution confirmée par CleanMyMap");
    searchParams.set("status", "cancelled");
    expect(renderToStaticMarkup(<FundingSection />)).toContain("Parcours de paiement annulé");
  });
});
