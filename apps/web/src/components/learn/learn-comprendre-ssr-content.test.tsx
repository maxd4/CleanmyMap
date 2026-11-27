import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";
import { LearnComprendreSsrContent } from "./learn-comprendre-ssr-content";

describe("learn comprendre SSR content", () => {
  it("renders actual reference summaries and distinguishes proxy from saved water", () => {
    const markup = renderToStaticMarkup(<LearnComprendreSsrContent locale="fr" />);
    for (const text of ["GIEC", "Limites planétaires", "Objectifs de développement durable", "Ordre de grandeur", "Ni eau économisée ni eau mesurée", IMPACT_PROXY_CONFIG.version, "7/9"]) expect(markup).toContain(text);
    expect(markup).toContain("https://www.ipcc.ch/");
    expect(markup).toContain("https://sdgs.un.org/fr/goals");
    expect(markup).not.toContain("Chargement de l'approfondissement");
  });
});
