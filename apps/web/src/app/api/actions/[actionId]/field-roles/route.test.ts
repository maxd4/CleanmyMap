import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const resolveActionFieldRoleAccessMock = vi.hoisted(() => vi.fn());
const loadActionFieldRoleStateMock = vi.hoisted(() => vi.fn());
const replaceActionFieldRolesMock = vi.hoisted(() => vi.fn());
const readActionRegistrationRecordMock = vi.hoisted(() => vi.fn());
const loadActionParticipationReviewsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: requireActionRequestAccessMock }));
vi.mock("@/lib/actions/field-roles-http", () => ({ resolveActionFieldRoleAccess: resolveActionFieldRoleAccessMock }));
vi.mock("@/lib/actions/field-roles", () => ({
  ACTION_FIELD_ROLE_OPTIONS: [{ code: "group_lead", label: "Responsable", description: "Coordination" }],
  isActionFieldRoleCode: (value: string) => value === "group_lead",
  normalizeActionFieldRoleCodes: (values: string[]) => [...new Set(values)],
  loadActionFieldRoleState: loadActionFieldRoleStateMock,
  replaceActionFieldRoles: replaceActionFieldRolesMock,
}));
vi.mock("@/lib/actions/participation/registration-records", () => ({ readActionRegistrationRecord: readActionRegistrationRecordMock }));
vi.mock("@/lib/actions/participation/group-participation", () => ({ loadActionParticipationReviews: loadActionParticipationReviewsMock }));

const action = { id: "action-1", action_phase: "pre_action", status: "approved", created_by_clerk_id: "creator-1" };
const baseAccess = {
  ok: true as const,
  action,
  supabase: {},
  identity: { role: "benevole", activeRole: "benevole" },
  organizerRows: [{ organizer_clerk_id: "organizer-1", organizer_label: "Organisateur", organizer_handle: null, is_primary: true }],
  isManager: false,
  isGlobalAdmin: false,
  isCreator: false,
  isPrimary: false,
  confirmedVolunteer: true,
};

describe("/api/actions/[actionId]/field-roles", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "volunteer-1" });
    resolveActionFieldRoleAccessMock.mockResolvedValue(baseAccess);
    loadActionFieldRoleStateMock.mockResolvedValue({ assignments: [], pendingTransfer: null });
    loadActionParticipationReviewsMock.mockResolvedValue([]);
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
    replaceActionFieldRolesMock.mockResolvedValue([]);
  });

  it("refuses unauthenticated callers before touching the role state", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(401);
    expect(resolveActionFieldRoleAccessMock).not.toHaveBeenCalled();
  });

  it("does not expose roles to a pending or unrelated account", async () => {
    resolveActionFieldRoleAccessMock.mockResolvedValue({ ok: false, status: 403, supabase: {} });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
    expect(loadActionFieldRoleStateMock).not.toHaveBeenCalled();
  });

  it("lets a confirmed volunteer replace only their own roles through the RPC", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ roleCodes: ["group_lead"] }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(replaceActionFieldRolesMock).toHaveBeenCalledWith({}, { actionId: "action-1", userId: "volunteer-1", roleCodes: ["group_lead"], actorId: "volunteer-1" });
  });

  it("prevents a volunteer from targeting another confirmed account", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ userId: "other-user", roleCodes: ["group_lead"] }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
    expect(replaceActionFieldRolesMock).not.toHaveBeenCalled();
  });

  it("does not let a manager assign a role to a pending registration", async () => {
    resolveActionFieldRoleAccessMock.mockResolvedValue({ ...baseAccess, isManager: true });
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "pending" });
    const { PUT } = await import("./route");
    const response = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify({ userId: "pending-user", roleCodes: ["group_lead"] }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(409);
    expect(replaceActionFieldRolesMock).not.toHaveBeenCalled();
  });
});
