import { describe, expect, it } from "vitest";
import { buildSpogomiEventJourney } from "./event-journey";

function input(overrides: Partial<Parameters<typeof buildSpogomiEventJourney>[0]> = {}) {
  return {
    isAuthenticated: true,
    lifecycle: "upcoming" as const,
    registrationStatus: "open" as const,
    directRegistrationAvailable: true,
    resultsStatus: "unavailable" as const,
    quizStatus: "missing" as const,
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
    ...overrides,
  };
}

describe("SPOGOMI event journey", () => {
  it("puts the mandatory quiz first and registration after a valid proof", () => {
    expect(buildSpogomiEventJourney(input()).next).toMatchObject({ key: "quiz", status: "todo" });
    expect(buildSpogomiEventJourney(input({ quizStatus: "passed" })).next).toMatchObject({ key: "registration", status: "todo" });
  });

  it("keeps pending admission as the next state and never offers a second registration CTA", () => {
    const journey = buildSpogomiEventJourney(input({ quizStatus: "passed", admissionStatus: "pending" }));
    expect(journey.next).toMatchObject({ key: "admission", status: "pending" });
    expect(journey.steps.find((step) => step.key === "registration")).toMatchObject({ status: "pending" });
  });

  it("moves an accepted participant through account, team and practical information", () => {
    expect(buildSpogomiEventJourney(input({ quizStatus: "passed", admissionStatus: "approved" })).next).toMatchObject({ key: "identity", status: "todo" });
    expect(buildSpogomiEventJourney(input({ quizStatus: "passed", admissionStatus: "approved", identityStatus: "identity_verified" })).next).toMatchObject({ key: "team", status: "todo" });
    expect(buildSpogomiEventJourney(input({ quizStatus: "passed", admissionStatus: "approved", identityStatus: "participation_confirmed", teamLinked: true })).next).toMatchObject({ key: "practical", status: "todo" });
  });

  it("prioritizes published results and preserves uncertain private proof as indeterminate", () => {
    const journey = buildSpogomiEventJourney(input({ lifecycle: "finished", resultsStatus: "published", privateProofStatus: "unavailable" }));
    expect(journey.next).toMatchObject({ key: "results", status: "todo" });
    expect(journey.steps.find((step) => step.key === "contributions")).toMatchObject({ status: "indeterminate" });
  });

  it("exposes only active event spaces and keeps their capabilities event-scoped", () => {
    const journey = buildSpogomiEventJourney(input({ organizerSpaceHref: "/spogomi/paris/espace#teams", refereeSpaceHref: "/spogomi/paris/espace#operations", refereeCapabilities: ["operations"] }));
    expect(journey.authorizedSpaces).toEqual([
      expect.objectContaining({ key: "organizer", href: "/spogomi/paris/espace#teams" }),
      expect.objectContaining({ key: "referee", href: "/spogomi/paris/espace#operations" }),
    ]);
  });

  it("does not turn an unavailable quiz or private projection into a forbidden action", () => {
    const journey = buildSpogomiEventJourney(input({ quizStatus: "unavailable", privateProofStatus: "unavailable" }));
    expect(journey.next).toMatchObject({ key: "quiz", status: "indeterminate" });
    expect(journey.steps.find((step) => step.key === "contributions")).toMatchObject({ status: "later" });
  });

  it("requires authentication for the same public entry point without changing the public event data", () => {
    const journey = buildSpogomiEventJourney(input({ isAuthenticated: false }));
    expect(journey.next).toMatchObject({ key: "quiz", status: "access_required", href: "/sign-in?redirect_url=%2Fspogomi%2Fparis" });
    expect(journey.steps.find((step) => step.key === "practical")).toMatchObject({ status: "todo", href: "#spogomi-practical-information" });
  });

  it("uses the step-specific Clerk return target instead of losing the requested action", () => {
    const journey = buildSpogomiEventJourney(input({
      isAuthenticated: false,
      signInHrefByStep: {
        quiz: "/sign-in?redirect_url=%2Fspogomi%2Fparis%3Ffocus%3Dquiz%23spogomi-sports-registration",
        team: "/sign-in?redirect_url=%2Fspogomi%2Fparis%3Ffocus%3Dteam%26division%3Dcasual%23spogomi-teams",
      },
    }));
    expect(journey.steps.find((step) => step.key === "quiz")?.href).toContain("focus%3Dquiz");
    expect(journey.steps.find((step) => step.key === "team")?.href).toContain("focus%3Dteam");
  });

  it("does not offer the quiz during an in-progress event when the available action is presence regularization", () => {
    const journey = buildSpogomiEventJourney(input({ lifecycle: "in_progress", quizStatus: "missing" }));
    expect(journey.next).toMatchObject({ key: "registration", status: "todo" });
    expect(journey.steps.find((step) => step.key === "quiz")).toMatchObject({ status: "later" });
    expect(journey.steps.find((step) => step.key === "registration")).toMatchObject({ title: "Signaler une présence à régulariser" });
  });

  it.each(["rejected", "cancelled"] as const)("allows a new registration after a %s request when registration is open", (admissionStatus) => {
    expect(buildSpogomiEventJourney(input({ quizStatus: "passed", admissionStatus })).next).toMatchObject({ key: "registration", status: "todo" });
  });

  it("does not offer a new registration when the selected division is closed", () => {
    expect(buildSpogomiEventJourney(input({ quizStatus: "passed", admissionStatus: "rejected", registrationStatus: "closed" })).next).toMatchObject({ key: "practical" });
  });

  it("does not offer direct registration when the canonical policy forbids it", () => {
    const journey = buildSpogomiEventJourney(input({ quizStatus: "passed", admissionStatus: "rejected", directRegistrationAvailable: false }));
    expect(journey.next).toMatchObject({ key: "practical" });
    expect(journey.steps.find((step) => step.key === "registration")).toMatchObject({ status: "later" });
  });

  it("keeps the in-progress regularization path for anonymous visitors and removes the quiz link", () => {
    const journey = buildSpogomiEventJourney(input({ isAuthenticated: false, lifecycle: "in_progress", quizStatus: "missing" }));
    expect(journey.next).toMatchObject({ key: "registration", title: "Signaler une présence à régulariser" });
    expect(journey.steps.find((step) => step.key === "quiz")).toMatchObject({ status: "later", href: null });
  });
});
