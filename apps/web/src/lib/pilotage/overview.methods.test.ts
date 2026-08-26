import { describe, expect, it } from "vitest";
import { buildMethods } from "./overview.methods";

describe("buildMethods recalculation contract", () => {
  it("describes overview refresh and server-cache freshness without claiming realtime", () => {
    const methods = buildMethods();

    expect(methods).toHaveLength(8);
    for (const method of methods) {
      expect(method.recalc).toContain("rafraîchissement de l'overview");
      expect(method.recalc).toContain("cache serveur jusqu'à 10 min");
      expect(method.recalc).not.toContain("Temps réel");
      expect(method.recalc).not.toContain("A chaque chargement de page / API");
      expect(method.recalc).not.toContain("À chaque chargement de page / API");
    }
  });
});
