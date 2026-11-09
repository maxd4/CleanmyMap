import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSpogomiEventJourney } from "@/lib/spogomi/event-journey";
import { SpogomiEventJourneyPanel } from "./spogomi-event-journey-panel";

const baseInput = {
  isAuthenticated: true,
  lifecycle: "upcoming" as const,
  registrationStatus: "open" as const,
  directRegistrationAvailable: true,
  resultsStatus: "unavailable" as const,
  quizStatus: "passed" as const,
  admissionStatus: "none" as const,
  identityStatus: "identity_unlinked" as const,
  teamLinked: false,
  privateProofStatus: "available" as const,
  hasCertifiedMission: false,
  hasActiveAttestation: false,
  organizerSpaceHref: null,
  refereeSpaceHref: null,
  refereeCapabilities: [],
  signInHref: "/sign-in?redirect_url=%2Fspogomi%2Fparis",
};

describe("SpogomiEventJourneyPanel", () => {
  it("renders one prominent next step and compact secondary lines", () => {
    const markup = renderToStaticMarkup(<SpogomiEventJourneyPanel journey={buildSpogomiEventJourney(baseInput)} />);
    expect(markup).toContain("Votre prochaine étape");
    expect(markup).toContain("Demander son inscription sportive");
    expect(markup).toContain("À faire");
    expect(markup).toContain("Valider le quiz obligatoire");
    expect(markup).toContain("#spogomi-sports-registration");
  });

  it("keeps authorized spaces separate from the competitor journey", () => {
    const markup = renderToStaticMarkup(<SpogomiEventJourneyPanel journey={buildSpogomiEventJourney({ ...baseInput, organizerSpaceHref: "/spogomi/paris/espace#settings", refereeSpaceHref: "/spogomi/paris/espace#operations", refereeCapabilities: ["operations"] })} />);
    expect(markup).toContain("Espaces autorisés pour cette édition");
    expect(markup).toContain("/spogomi/paris/espace#settings");
    expect(markup).toContain("/spogomi/paris/espace#operations");
    expect(markup).not.toContain("href=\"#spogomi-sports-registration\" aria");
  });
});
