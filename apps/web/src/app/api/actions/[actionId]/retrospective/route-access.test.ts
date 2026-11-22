import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicAction } from "@/fixtures/public-action";

const mocks = vi.hoisted(() => ({
  loadAction: vi.fn(),
  loadOrganizers: vi.fn(),
}));

vi.mock("@/lib/actions/store", () => ({ loadActionById: mocks.loadAction }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: mocks.loadOrganizers }));
import { loadRetrospectiveWriteContext, retrospectiveOperationError } from "./route-access";

describe("loadRetrospectiveWriteContext security boundary", () => {
  const supabase = {} as Parameters<typeof loadRetrospectiveWriteContext>[0];
  const eligibleAction = { ...publicAction, action_phase: "post_action_complete" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAction.mockResolvedValue(eligibleAction);
    mocks.loadOrganizers.mockResolvedValue(["organizer-1"]);
  });

  it("returns a neutral not-found response without looking up relations for a missing action", async () => {
    mocks.loadAction.mockResolvedValue(null);

    const result = await loadRetrospectiveWriteContext(supabase, "missing-action", "stranger");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(404);
    expect(await (result as Response).json()).toEqual({ error: "Action introuvable." });
    expect(mocks.loadOrganizers).not.toHaveBeenCalled();
  });

  it.each([
    ["a third party", "stranger-1"],
    ["an admin without an action relation", "admin-1"],
    ["a max role without an action relation", "max-1"],
  ])("denies %s before any write-capable service can be reached", async (_label, userId) => {
    const result = await loadRetrospectiveWriteContext(supabase, eligibleAction.id, userId);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(await (result as Response).json()).toEqual({ error: "Vous n'êtes pas autorisé à gérer ce retour d'expérience." });
  });

  it.each([
    ["the creator", "owner-1"],
    ["a canonical organizer", "organizer-1"],
  ])("allows %s on an eligible completed action", async (_label, userId) => {
    const result = await loadRetrospectiveWriteContext(supabase, eligibleAction.id, userId);

    expect(result).toEqual({ action: eligibleAction, organizerIds: ["organizer-1"] });
    expect(mocks.loadAction).toHaveBeenCalledWith(supabase, eligibleAction.id);
    expect(mocks.loadOrganizers).toHaveBeenCalledWith(supabase, eligibleAction.id);
  });

  it.each([
    ["pre-action", { action_phase: "pre_action", status: "approved" }],
    ["rejected", { action_phase: "post_action_complete", status: "rejected" }],
    ["cancelled", { action_phase: "post_action_complete", status: "cancelled" }],
  ])("rejects an authorized writer when the action is %s", async (_label, overrides) => {
    mocks.loadAction.mockResolvedValue({ ...publicAction, ...overrides });

    const result = await loadRetrospectiveWriteContext(supabase, publicAction.id, "owner-1");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(422);
    expect(await (result as Response).json()).toMatchObject({ code: "retrospective_action_not_finalized" });
  });

  it.each([
    ["forbidden", new Error("Forbidden"), 403, undefined],
    ["missing publication content", new Error("publication requires content"), 422, "retrospective_not_publishable"],
    ["ineligible action", new Error("action not eligible"), 422, "retrospective_not_publishable"],
    ["unfinalized action", new Error("requires a finalized action"), 422, "retrospective_not_publishable"],
    ["missing draft", new Error("draft not found"), 409, "retrospective_draft_missing"],
    ["unexpected internal error", new Error("private database detail"), 500, undefined],
    ["non-Error operation failure", "private provider detail", 500, undefined],
  ])("maps %s to a safe response", async (_label, error, status, code) => {
    const response = retrospectiveOperationError(error);
    const body = await response.json();

    expect(response.status).toBe(status);
    if (code) expect(body.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain("private");
  });
});
