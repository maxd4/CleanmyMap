import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(() => ({})),
  loadActionById: vi.fn(),
  decideAssociationActionReview: vi.fn(),
  isAssociationActionReviewRequired: vi.fn(() => true),
  emitAdministrativeRequirementNotifications: vi.fn(),
  publishOfficialAssociationActionAnnouncement: vi.fn(),
  validateActionFormalitiesForPublication: vi.fn(),
  buildAssociationActionReviewInboxItem: vi.fn(() => ({ id: "action-1" })),
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadActionById }));
vi.mock("@/lib/actions/association-action-review", () => ({
  decideAssociationActionReview: mocks.decideAssociationActionReview,
  isAssociationActionReviewRequired: mocks.isAssociationActionReviewRequired,
}));
vi.mock("@/lib/actions/administrative-requirement-notifications", () => ({
  emitAdministrativeRequirementNotifications: mocks.emitAdministrativeRequirementNotifications,
}));
vi.mock("@/lib/chat/association-action-announcement", () => ({
  publishOfficialAssociationActionAnnouncement: mocks.publishOfficialAssociationActionAnnouncement,
}));
vi.mock("@/lib/actions/formalities-publication-validation", () => ({
  validateActionFormalitiesForPublication: mocks.validateActionFormalitiesForPublication,
}));
vi.mock("@/lib/community/creator-inbox", () => ({
  buildAssociationActionReviewInboxItem: mocks.buildAssociationActionReviewInboxItem,
}));

const current = {
  id: "action-1",
  created_at: "2026-10-30T09:00:00.000Z",
  updated_at: "2026-10-30T09:30:00.000Z",
  created_by_clerk_id: "organizer-1",
  actor_name: "Association",
  organizer_type: "association",
  organizer_name: "Association",
  action_date: "2026-12-01",
  event_start_time: null,
  event_end_time: null,
  location_label: "Paris",
  notes: null,
  review_state: "pending_review",
  review_reason: null,
  preparation_data: {},
};

function reset() {
  vi.clearAllMocks();
  mocks.getSupabaseServerClient.mockReturnValue({});
  mocks.isAssociationActionReviewRequired.mockReturnValue(true);
  mocks.loadActionById.mockResolvedValue(current);
  mocks.validateActionFormalitiesForPublication.mockResolvedValue({
    ok: true,
    formalitiesContext: {},
    formalitiesWorkflow: {},
  });
  mocks.decideAssociationActionReview.mockResolvedValue({
    status: "updated",
    review_state: "approved",
    published_at: "2026-10-30T10:00:00.000Z",
  });
  mocks.emitAdministrativeRequirementNotifications.mockResolvedValue(undefined);
  mocks.publishOfficialAssociationActionAnnouncement.mockResolvedValue({
    state: "diffused",
    retryable: false,
  });
}

describe("association-action review mutation", () => {
  beforeEach(reset);

  it("rejects an unsupported association mutation before loading an action", async () => {
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-invalid",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "mark_treated" as never,
      reason: "Mutation invalide",
    });

    expect(response.status).toBe(400);
    expect(mocks.loadActionById).not.toHaveBeenCalled();
  });

  it("returns not found when the reviewed action disappeared", async () => {
    mocks.loadActionById.mockResolvedValueOnce(null);
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-missing",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Action absente",
    });

    expect(response.status).toBe(404);
    expect(mocks.decideAssociationActionReview).not.toHaveBeenCalled();
  });

  it("refuses a decision after the queue state has already changed", async () => {
    mocks.loadActionById.mockResolvedValueOnce({ ...current, review_state: "approved" });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-state",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "État déjà changé",
    });

    expect(response.status).toBe(409);
    expect(mocks.decideAssociationActionReview).not.toHaveBeenCalled();
  });

  it("refuses a review for an action outside the association contract", async () => {
    mocks.isAssociationActionReviewRequired.mockReturnValueOnce(false);
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-not-required",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Revue non applicable",
    });

    expect(response.status).toBe(409);
    expect(mocks.decideAssociationActionReview).not.toHaveBeenCalled();
  });

  it("revalidates formalities and passes the expected review revision to the transactional RPC", async () => {
    mocks.loadActionById
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, review_state: "approved", published_at: "2026-10-30T10:00:00.000Z" });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");

    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-1",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Dossier vérifié",
    });

    expect(response.status).toBe(200);
    expect(mocks.validateActionFormalitiesForPublication).toHaveBeenCalledWith(current);
    expect(mocks.decideAssociationActionReview).toHaveBeenCalledWith(expect.objectContaining({
      actionId: "action-1",
      decision: "approve",
      actorUserId: "admin-1",
      operationId: "operation-1",
      expectedReviewState: "pending_review",
      expectedUpdatedAt: current.updated_at,
    }));
    expect(mocks.publishOfficialAssociationActionAnnouncement).toHaveBeenCalledTimes(1);
  });

  it("does not fabricate an inbox item when the post-decision reload is unavailable", async () => {
    mocks.loadActionById.mockResolvedValueOnce(current).mockResolvedValueOnce(null);
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-reload-missing",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "reject_association_action",
      reason: "Dossier à corriger",
    });

    expect(response.status).toBe(200);
    expect(mocks.buildAssociationActionReviewInboxItem).not.toHaveBeenCalled();
  });

  it("does not call the decision RPC when a required formality is stale", async () => {
    mocks.validateActionFormalitiesForPublication.mockResolvedValueOnce({
      ok: false,
      blockedFormalityIds: ["paris-city-public-domain-aot"],
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");

    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-2",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Dossier à revoir",
    });

    expect(response.status).toBe(422);
    expect(mocks.decideAssociationActionReview).not.toHaveBeenCalled();
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });

  it("returns a conflict without publishing when the action changed concurrently", async () => {
    mocks.decideAssociationActionReview.mockResolvedValueOnce({
      status: "conflict",
      review_state: "draft",
      updated_at: "2026-10-30T09:45:00.000Z",
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");

    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-3",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Conflit détecté",
    });

    expect(response.status).toBe(409);
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });

  it("maps the transactional not-found result without announcing success", async () => {
    mocks.decideAssociationActionReview.mockResolvedValueOnce({ status: "not_found" });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-not-found",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Action supprimée",
    });

    expect(response.status).toBe(404);
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });

  it("maps a formalities failure returned by the database contract", async () => {
    mocks.decideAssociationActionReview.mockResolvedValueOnce({
      status: "formalities_not_ready",
      review_state: "pending_review",
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-formalities",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Formalités à reprendre",
    });

    expect(response.status).toBe(422);
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });

  it("keeps an idempotent decision successful without a second announcement", async () => {
    mocks.decideAssociationActionReview.mockResolvedValueOnce({
      status: "unchanged",
      review_state: "pending_review",
      idempotent: true,
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-unchanged",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Requête déjà traitée",
    });

    expect(response.status).toBe(200);
    expect(mocks.emitAdministrativeRequirementNotifications).not.toHaveBeenCalled();
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });

  it("does not announce a decision when the transactional RPC fails", async () => {
    mocks.decideAssociationActionReview.mockRejectedValueOnce(new Error("RPC indisponible"));
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-error",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "approve_association_action",
      reason: "Erreur à signaler",
    });

    expect(response.status).toBe(500);
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });

  it("supports an explicit announcement retry without re-deciding the review", async () => {
    mocks.loadActionById.mockResolvedValueOnce({ ...current, review_state: "approved" });
    mocks.publishOfficialAssociationActionAnnouncement.mockResolvedValueOnce({
      state: "already_diffused",
      retryable: false,
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-retry",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "retry_association_action_announcement",
      reason: "Relance contrôlée",
    });

    expect(response.status).toBe(200);
    expect(mocks.decideAssociationActionReview).not.toHaveBeenCalled();
    expect(mocks.publishOfficialAssociationActionAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ retry: true }));
  });

  it("keeps a retry response valid when the refreshed action is unavailable", async () => {
    mocks.loadActionById
      .mockResolvedValueOnce({ ...current, review_state: "approved" })
      .mockResolvedValueOnce(null);
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-retry-reload-missing",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "retry_association_action_announcement",
      reason: "Relance sans relecture",
    });

    expect(response.status).toBe(200);
    expect(mocks.buildAssociationActionReviewInboxItem).not.toHaveBeenCalled();
  });

  it("does not retry diffusion for a review that is not approved", async () => {
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-retry-pending",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "retry_association_action_announcement",
      reason: "Relance prématurée",
    });

    expect(response.status).toBe(409);
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });

  it("maps an ineligible announcement retry to an accepted retry response", async () => {
    mocks.loadActionById.mockResolvedValueOnce({ ...current, review_state: "approved" });
    mocks.publishOfficialAssociationActionAnnouncement.mockResolvedValueOnce({
      state: "not_eligible",
      retryable: false,
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-retry-ineligible",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "retry_association_action_announcement",
      reason: "Éligibilité à vérifier",
    });

    expect(response.status).toBe(202);
  });

  it("returns an error when announcement retry itself fails", async () => {
    mocks.loadActionById.mockResolvedValueOnce({ ...current, review_state: "approved" });
    mocks.publishOfficialAssociationActionAnnouncement.mockRejectedValueOnce(new Error("Diffusion indisponible"));
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-retry-failure",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "retry_association_action_announcement",
      reason: "Erreur de diffusion",
    });

    expect(response.status).toBe(500);
  });

  it("returns a retryable partial result when announcement diffusion is unavailable", async () => {
    mocks.loadActionById.mockResolvedValueOnce({ ...current, review_state: "approved" });
    mocks.publishOfficialAssociationActionAnnouncement.mockResolvedValueOnce({
      state: "retryable_error",
      retryable: true,
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");
    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-retry-error",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "retry_association_action_announcement",
      reason: "Relance indisponible",
    });

    expect(response.status).toBe(202);
  });

  it("keeps rejection compatible and does not run approval-only formalities validation", async () => {
    mocks.decideAssociationActionReview.mockResolvedValueOnce({
      status: "updated",
      review_state: "rejected",
      published_at: null,
    });
    const { handleCreatorInboxAssociationAction } = await import("./route.association-action");

    const response = await handleCreatorInboxAssociationAction({
      operationId: "operation-4",
      actorUserId: "admin-1",
      itemId: "action-1",
      action: "reject_association_action",
      reason: "Informations insuffisantes",
    });

    expect(response.status).toBe(200);
    expect(mocks.validateActionFormalitiesForPublication).not.toHaveBeenCalled();
    expect(mocks.decideAssociationActionReview).toHaveBeenCalledWith(expect.objectContaining({ decision: "reject" }));
    expect(mocks.publishOfficialAssociationActionAnnouncement).not.toHaveBeenCalled();
  });
});
