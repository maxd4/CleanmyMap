import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const searchParams = vi.hoisted(() => new URLSearchParams());
const localeState = vi.hoisted(() => ({ locale: "fr" as "fr" | "en" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/sections/funding",
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: localeState.locale }),
}));

import { FundingSection } from "./funding-section";

const ONPARTICIPE_URL = "https://www.onparticipe.fr/c/PUI9aOsy";

describe("FundingSection", () => {
  it("renders both public categories without exposing payment selection or Checkout", () => {
    const markup = renderToStaticMarkup(<FundingSection />);

    expect(markup).toContain("Soutenir CleanMyMap");
    expect(markup).toContain("Matériel pour les actions terrain");
    expect(markup).toContain("Développement et fonctionnement");
    expect(markup.match(/<button\b[^>]*disabled=""/g)).toHaveLength(2);
    expect(markup.match(/>Non disponible<\/button>/g)).toHaveLength(2);
    expect(markup).not.toContain("Soutenir le matériel");
    expect(markup).not.toContain("Soutenir le développement");
    expect(markup).not.toContain("Choisir un montant");
    expect(markup).not.toContain("Choose an amount");
    expect(markup).not.toContain("<fieldset");
    expect(markup).not.toContain("Checkout Stripe");
    expect(markup).not.toContain("checkout.stripe.com");
    expect(markup).not.toContain("Redirection vers Stripe");
    expect(markup).not.toContain("Redirecting to Stripe");
    expect(markup).toContain("Où va l’argent ?");
    expect(markup).toContain("La cagnotte OnParticipe est commune");
    expect(markup).toContain("le bouton utilisé ne sélectionne pas une affectation particulière");
    expect(markup).not.toContain("Les contributions sont affectées à la catégorie choisie");
    expect(markup).toContain("Total net confirmé par Stripe");
    expect(markup).toContain("ils n’incluent pas les contributions OnParticipe");
    expect(markup).toContain("Chargement…");
    expect(markup).toContain("n’est pas un reçu fiscal");
    expect(markup).toContain("n’annonce ni réduction fiscale ni mécénat fiscal");
    expect(markup).not.toContain("constitue un mécénat fiscal");
    expect(markup).not.toContain("promesse de réduction fiscale");
  });

  it("uses the unavailable label in English", () => {
    localeState.locale = "en";
    const markup = renderToStaticMarkup(<FundingSection />);
    localeState.locale = "fr";

    expect(markup.match(/>Unavailable<\/button>/g)).toHaveLength(2);
    expect(markup).not.toContain("Support equipment</button>");
    expect(markup).not.toContain("Support development</button>");
  });

  it("links directly to the configured OnParticipe campaign without payment data", () => {
    const markup = renderToStaticMarkup(
      <FundingSection onParticipeUrl={ONPARTICIPE_URL} />,
    );

    const destinations = [...markup.matchAll(/href="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((href) => href.includes("onparticipe.fr"));
    expect(destinations).toEqual([ONPARTICIPE_URL, ONPARTICIPE_URL]);
    expect(markup.split(`href="${ONPARTICIPE_URL}"`)).toHaveLength(3);
    expect(markup.match(/>Soutenir via OnParticipe<\/a>/g)).toHaveLength(2);
    expect(markup).toContain("CleanMyMap ne garantit aucune affectation par catégorie");
    expect(markup).not.toContain("href=\"https://www.onparticipe.fr/c/PUI9aOsy?");
    expect(markup).not.toContain("amountCents");
    expect(markup).not.toContain("category=equipment");
    expect(markup).not.toContain("category=development");
    expect(markup).not.toContain("amount=");
    expect(markup).not.toContain("checkout.stripe.com");
    expect(markup).not.toContain("/api/funding/checkout\"");
  });

  it("uses the OnParticipe CTA in English when configured", () => {
    localeState.locale = "en";
    try {
      const markup = renderToStaticMarkup(
        <FundingSection onParticipeUrl={ONPARTICIPE_URL} />,
      );
      expect(markup.match(/>Support via OnParticipe<\/a>/g)).toHaveLength(2);
    } finally {
      localeState.locale = "fr";
    }
  });

  it("presents the cancelled return without claiming a payment", () => {
    searchParams.set("status", "cancelled");
    const markup = renderToStaticMarkup(<FundingSection />);
    expect(markup).toContain("Paiement annulé");
    expect(markup).toContain("Aucun montant n’a été confirmé");
    searchParams.delete("status");
  });
});
