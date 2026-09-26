import { describe, expect, it } from "vitest";
import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { buildAnnuaireBubbleIconHtml } from "./annuaire-map-icon";

const entry = {
  id: "partner-1",
  name: '" onmouseover="alert(1) <img src=x onerror=alert(2)>',
  legalIdentity: "Structure de test",
  kind: "association",
  types: ["social"],
  description: "Description",
  location: "Paris",
  lat: 48.85,
  lng: 2.35,
  coveredArrondissements: [1],
  contributionTypes: ["communication"],
  verificationStatus: "verifie",
  provenance: "published_partner",
} as AnnuaireEntry;

describe("buildAnnuaireBubbleIconHtml", () => {
  it("escapes untrusted organization names before Leaflet inserts marker HTML", () => {
    const html = buildAnnuaireBubbleIconHtml(entry);

    expect(html).toContain("&lt;img src=x onerror=alert(2)&gt;");
    expect(html).toContain("&quot; onmouseover=&quot;alert(1)");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('onmouseover="alert(1)"');
  });
});
