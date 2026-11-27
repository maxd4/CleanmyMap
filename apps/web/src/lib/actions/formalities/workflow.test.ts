import { describe, expect, it } from "vitest";
import { qualifyActionFormalities } from "./qualification";
import {
  availableFormalitiesTransitions,
  applyFormalitiesWorkflowTransition,
  buildFormalitiesWorkflowState,
  deriveActionFormalitiesFacts,
  getBlockedRequiredFormalityIds,
  isFormalitiesPublicationBlocked,
  normalizeActionFormalitiesWorkflow,
} from "./workflow";
import { buildReviewableFormalityEmailDraft } from "./email-draft";
import type { ActionFormalitiesFacts } from "./qualification";

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

function sentParisFormalitiesWorkflow(actionDependencies?: {
  locationLabel: string;
  actionDate: string;
  territoryFingerprint?: string;
}) {
  const facts = parisFacts();
  const qualification = qualifyActionFormalities(facts);
  const initial = buildFormalitiesWorkflowState({
    facts,
    qualification,
    actionDependencies,
    now: "2026-09-17T10:00:00.000Z",
  });
  const sent = applyFormalitiesWorkflowTransition({
    workflow: applyFormalitiesWorkflowTransition({ workflow: initial,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" },
      now: "2026-09-17T10:00:30.000Z",
    }),
    transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" },
    now: "2026-09-17T10:01:00.000Z",
  });
  const policePrepared = applyFormalitiesWorkflowTransition({ workflow: sent, transition: {
    formalityId: "paris-police-event-security-authorization", kind: "mark_prepared" }, now: "2026-09-17T10:01:30.000Z" });
  const policeSent = applyFormalitiesWorkflowTransition({ workflow: policePrepared, transition: {
    formalityId: "paris-police-event-security-authorization", kind: "declare_sent" }, now: "2026-09-17T10:01:45.000Z" });
  const policeAuthorized = applyFormalitiesWorkflowTransition({ workflow: policeSent, transition: {
    formalityId: "paris-police-event-security-authorization", kind: "record_authorization" }, now: "2026-09-17T10:02:00.000Z" });
  return { facts, qualification, sent: policeAuthorized };
}

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
    expect(isFormalitiesPublicationBlocked(qualification, sent)).toBe(true);
    const receipt = applyFormalitiesWorkflowTransition({ workflow: sent,
      transition: { formalityId: qualification.formalities[0].id, kind: "record_receipt" },
      now: "2026-09-17T10:03:00.000Z" });
    expect(receipt.progress[0]?.userStatus).toBe("receipt_received");
    const authorized = applyFormalitiesWorkflowTransition({ workflow: receipt,
      transition: { formalityId: qualification.formalities[0].id, kind: "record_authorization" },
      now: "2026-09-17T10:04:00.000Z" });
    expect(authorized.progress[0]?.userStatus).toBe("authorization_obtained");
    const policePrepared = applyFormalitiesWorkflowTransition({ workflow: authorized, transition: { formalityId: "paris-police-event-security-authorization", kind: "mark_prepared" } });
    const policeSent = applyFormalitiesWorkflowTransition({ workflow: policePrepared, transition: { formalityId: "paris-police-event-security-authorization", kind: "declare_sent" } });
    const fullyAuthorized = applyFormalitiesWorkflowTransition({ workflow: policeSent, transition: { formalityId: "paris-police-event-security-authorization", kind: "record_authorization" } });
    expect(isFormalitiesPublicationBlocked(qualification, fullyAuthorized)).toBe(false);
  });

  it("requires a receipt for a declaration, an authorization for AOT, and keeps refusal blocking", () => {
    const aotFacts = parisFacts();
    const aotQualification = qualifyActionFormalities(aotFacts);
    const aot = buildFormalitiesWorkflowState({ facts: aotFacts, qualification: aotQualification });
    const directSend = applyFormalitiesWorkflowTransition({ workflow: aot,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" } });
    expect(directSend.progress[0]?.userStatus).toBe("not_started");
    const prepared = applyFormalitiesWorkflowTransition({ workflow: aot,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" } });
    const sent = applyFormalitiesWorkflowTransition({ workflow: prepared,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" } });
    expect(isFormalitiesPublicationBlocked(aotQualification, sent)).toBe(true);
    const refused = applyFormalitiesWorkflowTransition({ workflow: sent,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "record_refusal" } });
    expect(refused.progress[0]?.userStatus).toBe("refused");
    expect(isFormalitiesPublicationBlocked(aotQualification, refused)).toBe(true);

    const declarationFacts = parisFacts({ isPublicRoadwayActivity: true, isCortegeOrGathering: true,
      isClaiming: false, hasInstallations: false, requiresPhysicalOccupation: false });
    const declarationQualification = qualifyActionFormalities(declarationFacts);
    const declaration = buildFormalitiesWorkflowState({ facts: declarationFacts, qualification: declarationQualification });
    const police = declarationQualification.formalities.find(item => item.procedureKind === "police_declaration");
    expect(police).toBeDefined();
    const policePrepared = applyFormalitiesWorkflowTransition({ workflow: declaration,
      transition: { formalityId: police!.id, kind: "mark_prepared" } });
    const policeSent = applyFormalitiesWorkflowTransition({ workflow: policePrepared,
      transition: { formalityId: police!.id, kind: "declare_sent" } });
    expect(isFormalitiesPublicationBlocked(declarationQualification, policeSent)).toBe(true);
    const receipt = applyFormalitiesWorkflowTransition({ workflow: policeSent,
      transition: { formalityId: police!.id, kind: "record_receipt" } });
    expect(isFormalitiesPublicationBlocked(declarationQualification, receipt)).toBe(false);
  });

  it("allows a previously obtained authorization to be prepared again only after invalidation", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const formality = qualification.formalities.find((item) => item.id === "paris-city-public-domain-aot");
    if (!formality) throw new Error("Expected the Paris authorization fixture");
    const initial = buildFormalitiesWorkflowState({ facts, qualification });
    const authorized = applyFormalitiesWorkflowTransition({
      workflow: applyFormalitiesWorkflowTransition({
        workflow: applyFormalitiesWorkflowTransition({
          workflow: applyFormalitiesWorkflowTransition({ workflow: initial,
            transition: { formalityId: formality.id, kind: "mark_prepared" } }),
          transition: { formalityId: formality.id, kind: "declare_sent" },
        }),
        transition: { formalityId: formality.id, kind: "record_receipt" },
      }),
      transition: { formalityId: formality.id, kind: "record_authorization" },
    });
    expect(availableFormalitiesTransitions(formality, authorized.progress[0])).toEqual([]);

    const invalidated = {
      ...authorized,
      progress: authorized.progress.map((item) => item.formalityId === formality.id
        ? { ...item, validForQualification: false, invalidatedAt: "2026-11-27T10:00:00Z" }
        : item),
    };
    expect(availableFormalitiesTransitions(formality, invalidated.progress[0])).toEqual(["mark_prepared"]);
    const rePrepared = applyFormalitiesWorkflowTransition({
      workflow: invalidated,
      transition: { formalityId: formality.id, kind: "mark_prepared" },
      now: "2026-11-27T10:01:00Z",
    });
    expect(rePrepared.progress.find((item) => item.formalityId === formality.id)).toMatchObject({
      userStatus: "prepared",
      validForQualification: true,
      invalidatedAt: null,
    });
  });

  it("invalidates only the affected formality and retains a prior proof", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const initial = buildFormalitiesWorkflowState({ facts, qualification, now: "2026-09-17T10:00:00.000Z" });
    const sent = applyFormalitiesWorkflowTransition({
      workflow: applyFormalitiesWorkflowTransition({ workflow: initial, transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" } }),
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
    expect(normalizeActionFormalitiesWorkflow(changed)).toEqual(changed);

    const restored = buildFormalitiesWorkflowState({
      facts,
      qualification,
      previous: changed,
      now: "2026-09-17T10:03:00.000Z",
    });
    expect(restored.progress).toContainEqual(
      expect.objectContaining({
        formalityId: "paris-city-public-domain-aot",
        active: true,
        validForQualification: false,
        contentVersion: restored.contentVersion,
      }),
    );
    expect(getBlockedRequiredFormalityIds(qualification, restored)).toContain(
      "paris-city-public-domain-aot",
    );

    const rePrepared = applyFormalitiesWorkflowTransition({ workflow: restored,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" },
      now: "2026-09-17T10:04:00.000Z" });
    const explicitlyResubmitted = applyFormalitiesWorkflowTransition({ workflow: rePrepared,
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" },
      now: "2026-09-17T10:05:00.000Z" });
    expect(normalizeActionFormalitiesWorkflow(explicitlyResubmitted)).toEqual(explicitlyResubmitted);
    const receipt = applyFormalitiesWorkflowTransition({ workflow: explicitlyResubmitted, transition: { formalityId: "paris-city-public-domain-aot", kind: "record_receipt" } });
    const authorized = applyFormalitiesWorkflowTransition({ workflow: receipt, transition: { formalityId: "paris-city-public-domain-aot", kind: "record_authorization" } });
    const policePrepared = applyFormalitiesWorkflowTransition({ workflow: authorized, transition: { formalityId: "paris-police-event-security-authorization", kind: "mark_prepared" } });
    const policeSent = applyFormalitiesWorkflowTransition({ workflow: policePrepared, transition: { formalityId: "paris-police-event-security-authorization", kind: "declare_sent" } });
    const fullyAuthorized = applyFormalitiesWorkflowTransition({ workflow: policeSent, transition: { formalityId: "paris-police-event-security-authorization", kind: "record_authorization" } });
    expect(isFormalitiesPublicationBlocked(qualification, fullyAuthorized)).toBe(false);
  });

  it("invalidates a qualification when the venue or date changes, without using the title as a dependency", () => {
    const { facts, qualification, sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
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

  it("invalidates only when the resolved territory changes, not for a same-territory label change", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const territoryFingerprint = "FR|FR-PARIS|75056|75|11";
    const initial = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        locationLabel: "Rue A, Paris",
        actionDate: "2026-09-20",
        territoryFingerprint,
      },
      now: "2026-09-17T10:00:00.000Z",
    });
    const sent = applyFormalitiesWorkflowTransition({
      workflow: applyFormalitiesWorkflowTransition({ workflow: initial, transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" } }),
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" },
      now: "2026-09-17T10:01:00.000Z",
    });

    const sameTerritory = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: {
        locationLabel: "Avenue B, Paris",
        actionDate: "2026-09-20",
        territoryFingerprint,
      },
      previous: sent,
      now: "2026-09-17T10:02:00.000Z",
    });
    expect(sameTerritory.progress[0].validForQualification).toBe(true);

    const lyonFacts = deriveActionFormalitiesFacts({
      departmentCode: "69",
      departmentName: "Rhône",
    });
    const changedTerritory = buildFormalitiesWorkflowState({
      facts: lyonFacts,
      qualification: qualifyActionFormalities(lyonFacts),
      actionDependencies: {
        locationLabel: "Rue de la République, Lyon",
        actionDate: "2026-09-20",
        territoryFingerprint: "FR|||69|84",
      },
      previous: sameTerritory,
      now: "2026-09-17T10:03:00.000Z",
    });
    expect(changedTerritory.progress).toContainEqual(
      expect.objectContaining({
        formalityId: "paris-city-public-domain-aot",
        validForQualification: false,
      }),
    );
  });

  it("invalidates proofs when the persisted geometry changes within the same territory", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const dependencies = {
      locationLabel: "Rue A, Paris",
      actionDate: "2026-09-20",
      territoryFingerprint: "FR|FR-PARIS|75056|75|11",
      locationFingerprint: "sha256:geometry-a",
    };
    const initial = buildFormalitiesWorkflowState({ facts, qualification, actionDependencies: dependencies });
    const sent = applyFormalitiesWorkflowTransition({
      workflow: applyFormalitiesWorkflowTransition({ workflow: initial,
        transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" } }),
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" },
    });
    const movedInsideParis = buildFormalitiesWorkflowState({
      facts,
      qualification,
      previous: sent,
      actionDependencies: { ...dependencies, locationFingerprint: "sha256:geometry-b" },
    });

    expect(movedInsideParis.progress.find((item) => item.formalityId === "paris-city-public-domain-aot")).toMatchObject({
      active: true,
      userStatus: "sent",
      validForQualification: false,
      proof: expect.objectContaining({ kind: "user_declared" }),
    });
  });

  it("invalidates active proof when the applicable ruleset changes", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const initial = buildFormalitiesWorkflowState({ facts, qualification });
    const sent = applyFormalitiesWorkflowTransition({
      workflow: applyFormalitiesWorkflowTransition({ workflow: initial,
        transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" } }),
      transition: { formalityId: "paris-city-public-domain-aot", kind: "declare_sent" },
    });
    const updatedRules = { ...qualification, rulesetVersion: "paris-rules-revised" };
    const requalified = buildFormalitiesWorkflowState({ facts, qualification: updatedRules, previous: sent });

    expect(requalified.progress.find((item) => item.formalityId === "paris-city-public-domain-aot")).toMatchObject({
      userStatus: "sent",
      validForQualification: false,
      proof: expect.objectContaining({ kind: "user_declared" }),
    });
  });

});

describe("formalities workflow validation", () => {
  it("requalifies a legacy FNV trace instead of accepting it as equivalent", () => {
    const { facts, qualification, sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
    });
    const legacy = {
      ...sent,
      trace: { ...sent.trace, actionDependencyFingerprint: "fnv1a-test" },
    };

    const requalified = buildFormalitiesWorkflowState({
      facts,
      qualification,
      actionDependencies: { locationLabel: "Rue A", actionDate: "2026-09-20" },
      previous: legacy,
      now: "2026-09-17T10:02:00.000Z",
    });

    expect(requalified.trace.actionDependencyFingerprint).toMatch(/^canonical-v3:/);
    expect(requalified.progress[0]).toMatchObject({
      validForQualification: false,
      invalidatedAt: "2026-09-17T10:02:00.000Z",
    });
  });

  it("rejects a trace without the canonical qualification and traceability fields", () => {
    expect(
      normalizeActionFormalitiesWorkflow({
        schemaVersion: "action-formalities-workflow-v1",
        contentVersion: "v1",
        trace: { formalities: [] },
        progress: [],
      }),
    ).toBeNull();
  });

  it("rejects progress whose content version does not match the workflow", () => {
    const { sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
    });

    expect(
      normalizeActionFormalitiesWorkflow({
        ...sent,
        progress: sent.progress.map((progress) => ({
          ...progress,
          contentVersion: "stale-content-version",
        })),
      }),
    ).toBeNull();
  });

  it("keeps a structurally valid inactive historical progress with its old content version", () => {
    const { sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
    });
    const historical = {
      ...sent.progress[0]!,
      formalityId: "removed-formality",
      contentVersion: "historical-content-version",
      active: false,
      validForQualification: false,
      invalidatedAt: "2026-09-17T10:02:00.000Z",
    };

    expect(
      normalizeActionFormalitiesWorkflow({
        ...sent,
        progress: [...sent.progress, historical],
      }),
    ).not.toBeNull();
    expect(
      normalizeActionFormalitiesWorkflow({
        ...sent,
        progress: [
          ...sent.progress,
          { ...historical, proof: { ...historical.proof!, kind: "invalid" } },
        ],
      }),
    ).toBeNull();
  });

  it("rejects a proof with a non-ISO recordedAt timestamp", () => {
    const { sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
    });

    expect(
      normalizeActionFormalitiesWorkflow({
        ...sent,
        progress: sent.progress.map((progress, index) => index === 0
          ? { ...progress, proof: { ...progress.proof!, recordedAt: "not-a-timestamp" } }
          : progress),
      }),
    ).toBeNull();
  });

  it("rejects duplicate progress identifiers regardless of order", () => {
    const { sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
    });
    const first = sent.progress[0]!;
    const contradictory = {
      ...first,
      userStatus: "prepared" as const,
      proof: null,
    };

    expect(
      normalizeActionFormalitiesWorkflow({
        ...sent,
        progress: [first, contradictory, ...sent.progress.slice(1)],
      }),
    ).toBeNull();
    expect(
      normalizeActionFormalitiesWorkflow({
        ...sent,
        progress: [contradictory, first, ...sent.progress.slice(1)],
      }),
    ).toBeNull();
  });

  it("rejects duplicate active formality identifiers", () => {
    const { sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
    });
    const firstFormality = sent.trace.formalities[0]!;

    expect(
      normalizeActionFormalitiesWorkflow({
        ...sent,
        trace: {
          ...sent.trace,
          formalities: [...sent.trace.formalities, firstFormality],
        },
      }),
    ).toBeNull();
  });

  it("keeps complete workflows valid with no required formality or with a null proof reference", () => {
    const noRequiredFacts = parisFacts({
      manager: { kind: "unknown", label: null },
      hasInstallations: false,
      requiresPhysicalOccupation: false,
    });
    const noRequiredQualification = qualifyActionFormalities(noRequiredFacts);
    const noRequired = buildFormalitiesWorkflowState({
      facts: noRequiredFacts,
      qualification: noRequiredQualification,
      now: "2026-09-17T10:00:00.000Z",
    });
    const { sent } = sentParisFormalitiesWorkflow({
      locationLabel: "Rue A",
      actionDate: "2026-09-20",
    });

    expect(normalizeActionFormalitiesWorkflow(noRequired)).not.toBeNull();
    expect(normalizeActionFormalitiesWorkflow(sent)).not.toBeNull();
    expect(sent.progress[0]?.proof?.reference).toBeNull();
  });

  it("does not block for recommendation or unknown qualification", () => {
    const facts = parisFacts({ manager: { kind: "unknown", label: null }, hasInstallations: false, requiresPhysicalOccupation: false });
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });
    expect(qualification.formalities.some((item) => item.requirementStatus === "recommended")).toBe(true);
    expect(qualification.formalities.some((item) => item.requirementStatus === "unknown")).toBe(true);
    expect(isFormalitiesPublicationBlocked(qualification, workflow)).toBe(false);
  });

  it("requalifies a formerly declared cleanwalk without losing its historical sent proof", () => {
    const manifestationFacts = parisFacts({
      isCleanwalk: true,
      isPublicRoadwayActivity: true,
      isCortegeOrGathering: true,
      isClaiming: false,
      hasInstallations: false,
      requiresPhysicalOccupation: false,
    });
    const manifestationQualification = qualifyActionFormalities(manifestationFacts);
    const policeId = "paris-police-public-roadway-declaration";
    const initial = buildFormalitiesWorkflowState({
      facts: manifestationFacts,
      qualification: manifestationQualification,
      now: "2026-11-23T10:00:00.000Z",
    });
    const sent = applyFormalitiesWorkflowTransition({
      workflow: applyFormalitiesWorkflowTransition({ workflow: initial, transition: { formalityId: policeId, kind: "mark_prepared" } }),
      transition: { formalityId: policeId, kind: "declare_sent", proofReference: "déclaration déclarée par l’organisateur" },
      now: "2026-11-23T10:01:00.000Z",
    });
    const ordinaryFacts = { ...manifestationFacts, isCortegeOrGathering: false };
    const ordinaryQualification = qualifyActionFormalities(ordinaryFacts);
    const requalified = buildFormalitiesWorkflowState({
      facts: ordinaryFacts,
      qualification: ordinaryQualification,
      previous: sent,
      now: "2026-11-23T10:02:00.000Z",
    });
    const historicalPolice = requalified.progress.find((item) => item.formalityId === policeId);

    expect(ordinaryQualification.formalities.some((item) => item.id === policeId)).toBe(false);
    expect(ordinaryQualification.formalities.some((item) => item.requirementStatus === "not_required")).toBe(true);
    expect(isFormalitiesPublicationBlocked(ordinaryQualification, requalified)).toBe(false);
    expect(historicalPolice).toMatchObject({ active: false, validForQualification: false, userStatus: "sent" });
    expect(historicalPolice?.proof?.reference).toBe("déclaration déclarée par l’organisateur");
    expect(requalified.progress.filter((item) => item.active).every((item) => item.userStatus === "not_started")).toBe(true);
  });

  it("does not block publication for the national unknown fallback", () => {
    const facts = deriveActionFormalitiesFacts({
      departmentCode: "69",
      departmentName: "Rhône",
    });
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });

    expect(qualification.formalities[0]?.requirementStatus).toBe("unknown");
    expect(isFormalitiesPublicationBlocked(qualification, workflow)).toBe(false);
  });

  it("blocks only required formalities", () => {
    const facts = parisFacts();
    const qualification = qualifyActionFormalities(facts);
    const workflow = buildFormalitiesWorkflowState({ facts, qualification });

    for (const status of ["recommended", "not_required", "unknown"] as const) {
      const nonBlockingQualification = {
        ...qualification,
        formalities: [
          { ...qualification.formalities[0], requirementStatus: status },
        ],
      };
      expect(isFormalitiesPublicationBlocked(nonBlockingQualification, workflow)).toBe(false);
    }
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
