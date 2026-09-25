import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { LearnComprendreSsrContent } from "./learn-comprendre-ssr-content";

describe("learn comprendre SSR content", () => {
  it("renders the essential reference answers before deferred interactions", () => {
    const markup = renderToStaticMarkup(<LearnComprendreSsrContent locale="fr" />);

    expect(markup).toContain("Les repères essentiels avant les graphiques");
    expect(markup).toContain("GIEC");
    expect(markup).toContain("Limites planétaires");
    expect(markup).toContain("Objectifs de développement durable");
    expect(markup).toContain("Ordre de grandeur");
    expect(markup).toContain("Source visible");
    expect(markup).toContain(IMPACT_PROXY_CONFIG.version);
    expect(markup).not.toContain("Chargement de l'approfondissement");
  });

  it("states the boundaries of the source and the proxy model instead of overstating certainty", () => {
    const markup = renderToStaticMarkup(<LearnComprendreSsrContent locale="fr" />);

    expect(markup).toContain("aucune URL ni date de référence");
    expect(markup).toContain("proxies de pilotage");
    expect(markup).toContain("pas des mesures individualisées");
    expect(markup).toContain("pas le rapport complet");
  });
});
