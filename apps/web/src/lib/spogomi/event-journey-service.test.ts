import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSpogomiEventJourney } from "./event-journey-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listSpogomiAdmissionRequestsForRequester } from "./admission-requests";
import { resolveSpogomiEventAccessBySlug } from "./authorization";
import { loadSpogomiFieldOperationsAccess } from "./field-operations-service";
import { loadSpogomiIdentityState } from "./identity-link";
import { loadSpogomiRegistrationQuiz, loadSpogomiRegistrationQuizProofsForUser } from "./preparation/registration-quiz-service";
import { loadSpogomiRegistrationReadiness } from "./preparation/registration-readiness-service";
import { loadSpogomiVolunteerSummaryForUser } from "./volunteer";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn() }));
vi.mock("./admission-requests", () => ({ listSpogomiAdmissionRequestsForRequester: vi.fn() }));
vi.mock("./authorization", () => ({ resolveSpogomiEventAccessBySlug: vi.fn() }));
vi.mock("./field-operations-service", () => ({ loadSpogomiFieldOperationsAccess: vi.fn() }));
vi.mock("./identity-link", () => ({ loadSpogomiIdentityState: vi.fn() }));
vi.mock("./preparation/registration-quiz-service", () => ({
  loadSpogomiRegistrationQuiz: vi.fn(),
  loadSpogomiRegistrationQuizProofsForUser: vi.fn(),
  SpogomiRegistrationQuizError: class extends Error {},
}));
vi.mock("./preparation/registration-readiness-service", () => ({ loadSpogomiRegistrationReadiness: vi.fn() }));
vi.mock("./volunteer", () => ({ loadSpogomiVolunteerSummaryForUser: vi.fn() }));

const event = {
  id: "event-1",
  slug: "paris-2026",
  lifecycle: "upcoming",
  registrationStatus: "open",
  resultsStatus: "unavailable",
  divisions: [{ id: "division-casual", type: "casual", registrationStatus: "open", directRegistrationAvailable: true }],
} as never;

function supabaseFixture() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { registration_contract_revision: 7 }, error: null });
  return { from: vi.fn(() => query) };
}

describe("SPOGOMI event journey server quiz projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseServerClient).mockReturnValue(supabaseFixture() as never);
    vi.mocked(loadSpogomiRegistrationReadiness).mockResolvedValue({ ready: true } as never);
    vi.mocked(listSpogomiAdmissionRequestsForRequester).mockResolvedValue([] as never);
    vi.mocked(loadSpogomiRegistrationQuiz).mockResolvedValue({ eventId: "event-1", divisionId: "division-casual", regulationVersion: "rules-v1", quizVersion: "quiz-v1", available: true, sourceReference: "official", missing: [], questions: [] });
    vi.mocked(loadSpogomiRegistrationQuizProofsForUser).mockResolvedValue(new Set(["division-casual"]));
    vi.mocked(loadSpogomiIdentityState).mockResolvedValue({ state: "identity_unlinked", team: null } as never);
    vi.mocked(loadSpogomiVolunteerSummaryForUser).mockResolvedValue({ chronology: [], certificates: [] } as never);
    vi.mocked(resolveSpogomiEventAccessBySlug).mockResolvedValue({ isOrganizer: false, capabilities: new Set() } as never);
    vi.mocked(loadSpogomiFieldOperationsAccess).mockResolvedValue({ isOrganizer: false, capabilities: new Set() } as never);
  });

  it("passes the current versioned server proof to the selected division", async () => {
    const journey = await loadSpogomiEventJourney({ event, userId: "user-1", selectedDivisionId: "division-casual", signInHref: "/sign-in" });

    expect(journey.quizProofs).toEqual({ "division-casual": "quiz-v1" });
    expect(journey.steps.find((step) => step.key === "quiz")).toMatchObject({ status: "validated" });
    expect(journey.next).toMatchObject({ key: "registration" });
    expect(loadSpogomiRegistrationQuizProofsForUser).toHaveBeenCalledWith(expect.objectContaining({ registrationContractRevision: 7, quizVersions: new Map([["division-casual", "quiz-v1"]]) }));
  });

  it("does not project a stale or absent proof into the admission card", async () => {
    vi.mocked(loadSpogomiRegistrationQuizProofsForUser).mockResolvedValue(new Set());

    const journey = await loadSpogomiEventJourney({ event, userId: "user-1", selectedDivisionId: "division-casual", signInHref: "/sign-in" });

    expect(journey.quizProofs).toEqual({});
    expect(journey.steps.find((step) => step.key === "quiz")).toMatchObject({ status: "todo" });
    expect(journey.next).toMatchObject({ key: "quiz" });
  });
});
