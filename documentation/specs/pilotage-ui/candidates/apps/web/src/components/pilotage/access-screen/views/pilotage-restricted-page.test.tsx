import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PilotageRestrictedPage } from "./pilotage-restricted-page";
import { buildRestrictedPilotageSections } from "./pilotage-restricted-page.model";
import { PROFILE_ORDER } from "@/lib/profiles";
import { getEffectiveAccessForSessionRole } from "@/lib/domain-language";

describe("restricted pilotage navigation", () => {
  it("gives IMU verified administration destinations without implying organized access", () => {
    const markup = renderToStaticMarkup(<PilotageRestrictedPage locale="fr" profile="max" access={getEffectiveAccessForSessionRole("max")} />);
    expect(markup).toContain('href="/admin"');
    expect(markup).toContain('href="/admin/services"');
    expect(markup).toContain('href="/profil/max"');
    expect(markup).toContain("réservés au rôle actif Coordinateur");
    expect(markup).not.toContain("Le cockpit complet reste réservé aux profils");
  });
  it("keeps only verified admin shortcuts and avoids duplicate links", () => {
    for (const profile of PROFILE_ORDER) {
      const hrefs = buildRestrictedPilotageSections(profile, getEffectiveAccessForSessionRole(profile)).flatMap(section => section.actions.map(action => action.href));
      expect(new Set(hrefs).size).toBe(hrefs.length);
      expect(hrefs.includes("/admin")).toBe(profile === "max" || profile === "admin");
      expect(hrefs).not.toContain("/pilotage");
    }
  });
  it("fails closed on unavailable effective access", () => {
    const markup = renderToStaticMarkup(<PilotageRestrictedPage locale="en" profile="max" access={null} />);
    expect(markup).toContain("Access temporarily unverified");
    expect(markup).not.toContain('href="/admin"');
    expect(markup).not.toContain('href="/admin/services"');
    expect(markup).toContain('href="/reports"');
  });
});
