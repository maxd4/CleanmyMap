import { describe, expect, it } from "vitest";
import { qualifyActionFormalities } from "./formalities-qualification";
import {
  applyFormalitiesWorkflowTransition,
  buildFormalitiesWorkflowState,
  deriveActionFormalitiesFacts,
  isFormalitiesPublicationBlocked,
} from "./formalities-workflow";
import { buildReviewableFormalityEmailDraft } from "./formalities-email-draft";
import type { ActionFormalitiesFacts } from "./formalities-qualification";

const parisFacts = (overrides: Partial<ActionFormalitiesFacts> = {}): ActionFormalitiesFacts => ({
  ...deriveActionFormalitiesFacts({ departmentCode: "75", departmentName: "Paris" }),
  publicSpace: "public_domain",
  manager: { kind: "paris_city", label: null },
  isPublicRoadwayActivity: false,
  isItinerant: false,
  isClaiming: false,
  hasInstallations: true,
  requiresPhysicalOccupation: true,
  localCustomaryUse: false,
  largeCrowdOrComplexInstallations: false,
  ...overrides,
});

describe("formalities workflow", () => {
  it("starts every newly qualified formality as not_started and keeps the blocking policy pure", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({
      facts,
      qualification,
      now: "2026-09-17T10:00:00.000Z",
    });

    expect(workflow.progress[0]).toMatchObject({
      userStatus: "not_started",
      proof: null,
      validForQualification: true,
    });
    expect(isFormalitiesPublicationBlocked(qualification, workflow)).toBe(true);
  });

  it("distinguishes prepared from an explicit user declaration of sent", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const initial = buildFormalitiesWorkflowState({ facts, qualification, now: "2026-09-17T10:00:00.000Z" });
    const prepared = applyFormalitiesWorkflowTransition({
      workflow: initial,
      transition: { formalityId: qualification.formalities[0].id, kind: "mark_prepared" },
      now: "2026-09-17T10:01:00.000Z",
    });
    expect(prepared.progress[0].userStatus).toBe("prepared");
    expect(prepared.progress[0].proof).toBeNull();

    const sent = applyFormalitiesWorkflowTransition({
      workflow: prepared,
      transition: {
        formalityId: qualification.formalities[0].id,
        kind: "declare_sent",
        proofReference: "dossier-42",
      },
      now: "2026-09-17T10:02:00.000Z",
    });
    expect(sent.progress[0]).toMatchObject({
      userStatus: "sent",
      proof: {
        kind: "user_declared",
        reference: "dossier-42",
      },
    });
    expect(isFormalitiesPublicationBlocked(qualification, sent)).toBe(false);
  });

  it("invalidates only the affected formality and retains a prior proof", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const initial = buildFormalitiesWorkflowState({ facts, qualification, now: "2026-09-17T10:00:00.000Z" });
    const sent = applyFormalitiesWorkflowTransition({
      workflow: initial,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" },
      now: "2026-09-17T10:01:00.000Z",
    });
    const changedFacts = { ...facts, hasInstallations: false, requiresPhysicalOccupation: false } as const;
    const changedQualification = qualifyActionFormalities(changedFacts);
    const changed = buildFormalitiesWorkflowState({
      facts: changedFacts,
      qualification: changedQualification,
      previous: sent,
      now: "2026-09-17T10:02:00.000Z",
    });

    expect(changed.progress).toContainEqual(
      expect.objectContaining({
        formalityId: "paris-city-public-domain-aot",
        active: false,
        validForQualification: false,
        userStatus: "sent",
        proof: expect.objectContaining({ kind: "user_declared" }),
      }),
    );
  });

  it("invalidates a qualification when the venue or date changes, without using the title as a dependency", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const initial = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: { locationLabel: "Rue A", actionDate: "2026-09-20" },
      now: "2026-09-17T10:00:00.000Z",
    });
    const sent = applyFormalitiesWorkflowTransition({
      workflow: initial,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" },
      now: "2026-09-17T10:01:00.000Z",
    });
    const sameDependencies = buildFormalitiesWorkflowState({
      facts: { ...facts, isCleanwalk: false },
      qualification: qualifyActionFormalities({ ...facts, isCleanwalk: false }),
      actionDependencies: { locationLabel: "Rue A", actionDate: "2026-09-20" },
      previous: sent,
      now: "2026-09-17T10:02:00.000Z",
    });
    expect(sameDependencies.progress[0].validForQualification).toBe(true);

    const moved = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: { locationLabel: "Rue B", actionDate: "2026-09-20" },
      previous: sent,
      now: "2026-09-17T10:03:00.000Z",
    });
    expect(moved.progress).toContainEqual(
      expect.objectContaining({
        formalityId: "paris-city-public-domain-aot",
        validForQualification: false,
        proof: expect.objectContaining({ kind: "user_declared" }),
      }),
    );
  });

  it("does not block for recommendation or unknown qualification", () => {
    const facts = parisFacts({ manager: { kind: "unknown", label: null }, hasInstallations: false, requiresPhysicalOccupation: false });
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });
    expect(qualification.formalities.some((item) => item.requirementStatus === "recommended")).toBe(true);
    expect(qualification.formalities.some((item) => item.requirementStatus === "unknown")).toBe(true);
    expect(isFormalitiesPublicationBlocked(qualification, workflow)).toBe(false);
  });

  it("only creates an email draft for a source-proven official email channel and never marks it sent", () => {
    const formality = qualifyActionFormalities(parisFacts()).formalities[0];
    expect(
      buildReviewableFormalityEmailDraft({ formality, action: { title: "Cleanwalk" } }),
    ).toBeNull();

    const officialChannelAddress = ["service", "ville.example"].join("@");
    const emailFormality = {
      ...formality,
      officialChannel: {
        kind: "official_email" as const,
        label: "Canal officiel vérifié",
        url: null,
        emailAddress: officialChannelAddress,
      },
    };
    const draft = buildReviewableFormalityEmailDraft({
      formality: emailFormality,
      action: { title: "Cleanwalk", location: "Paris" },
    });
    expect(draft).toMatchObject({
      to: officialChannelAddress,
      requiresReview: true,
      sent: false,
    });
    expect(draft?.body).not.toContain("@example.com");
    expect(draft?.body).not.toContain("+33");
  });
});
