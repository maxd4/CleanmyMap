import { beforeEach, describe, expect, it, vi } from "vitest";
import { organizationCommandSchema } from "./contracts";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUserList: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: { getUserList: mocks.getUserList } }) }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({ rpc: mocks.rpc }) }));

const organizationId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const workspace = {
  id: organizationId, name: "Entreprise Alpha", role: "owner", site_id: null,
  members: [], sites: [], campaigns: [], actions: [], actions_has_more: false,
  link_candidates: [], candidates_has_more: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "list_my_organizations") return { data: [{ organization_id: organizationId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" }], error: null };
    if (name === "read_organization_workspace") return { data: workspace, error: null };
    if (name === "read_organization_team_members") return { data: [], error: null };
    return { data: null, error: null };
  });
  mocks.getUserList.mockResolvedValue({ data: [{
    id: "user_internal_clerk_id",
    emailAddresses: [{ emailAddress: "member@example.test", verification: { status: "verified" } }],
  }] });
});

describe("organization invitation identity boundary", () => {
  it("resolves a verified email server-side and sends only its Clerk ID to SQL", async () => {
    const { mutateOrganization } = await import("./service");
    await mutateOrganization("owner-session-id", organizationCommandSchema.parse({
      organizationId, requestId, operation: "invite", targetEmail: " Member@Example.Test ", role: "member", siteId: null,
    }));

    expect(mocks.getUserList).toHaveBeenCalledWith({ emailAddress: ["member@example.test"], limit: 2 });
    expect(mocks.rpc).toHaveBeenCalledWith("mutate_organization_membership", expect.objectContaining({
      p_actor: "owner-session-id", p_target: "user_internal_clerk_id", p_role: "member",
    }));
  });

  it("fails closed for an unverified email without writing a membership", async () => {
    mocks.getUserList.mockResolvedValue({ data: [
      { id: "user-a", emailAddresses: [{ emailAddress: "member@example.test", verification: { status: "unverified" } }] },
    ] });
    const { mutateOrganization, OrganizationServiceError } = await import("./service");
    await expect(mutateOrganization("owner-session-id", organizationCommandSchema.parse({
      organizationId, requestId, operation: "invite", targetEmail: "member@example.test", role: "member", siteId: null,
    }))).rejects.toBeInstanceOf(OrganizationServiceError);
    expect(mocks.rpc).not.toHaveBeenCalledWith("mutate_organization_membership", expect.anything());
  });

  it("fails closed for an ambiguous email without writing a membership", async () => {
    mocks.getUserList.mockResolvedValue({ data: [
      { id: "user-a", emailAddresses: [{ emailAddress: "member@example.test", verification: { status: "verified" } }] },
      { id: "user-b", emailAddresses: [{ emailAddress: "member@example.test", verification: { status: "verified" } }] },
    ] });
    const { mutateOrganization, OrganizationServiceError } = await import("./service");
    await expect(mutateOrganization("owner-session-id", organizationCommandSchema.parse({
      organizationId, requestId, operation: "invite", targetEmail: "member@example.test", role: "member", siteId: null,
    }))).rejects.toBeInstanceOf(OrganizationServiceError);
    expect(mocks.rpc).not.toHaveBeenCalledWith("mutate_organization_membership", expect.anything());
  });

  it("does not query Clerk when the actor is not an organization owner", async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === "read_organization_workspace"
      ? { data: { ...workspace, role: "member" }, error: null }
      : { data: [], error: null });
    const { mutateOrganization, OrganizationServiceError } = await import("./service");
    await expect(mutateOrganization("member-session-id", organizationCommandSchema.parse({
      organizationId, requestId, operation: "invite", targetEmail: "member@example.test", role: "member", siteId: null,
    }))).rejects.toBeInstanceOf(OrganizationServiceError);
    expect(mocks.getUserList).not.toHaveBeenCalled();
  });
});

describe("member organization projection", () => {
  it("serves only the team roster to an active ordinary member", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "list_my_organizations") return { data: [{ organization_id: organizationId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "member", state: "active" }], error: null };
      if (name === "read_organization_team_members") return { data: [{ membership_id: "00000000-0000-4000-8000-000000000011", member_role: "member", state: "active", site_id: null, is_self: true, label: "Alice", expires_at: null }], error: null };
      return { data: null, error: null };
    });
    const { readOrganization } = await import("./service");

    const result = await readOrganization("member-session-id", organizationId, 0);

    expect(result.members).toHaveLength(1);
    expect(result.role).toBe("member");
    expect(result.actions).toEqual([]);
    expect(result.sites).toEqual([]);
    expect(mocks.rpc).toHaveBeenCalledWith("read_organization_team_members", { p_org: organizationId, p_actor: "member-session-id" });
    expect(mocks.rpc).not.toHaveBeenCalledWith("read_organization_workspace", expect.anything());
  });

  it("refuses a different organization before reading its team", async () => {
    const { readOrganization, OrganizationServiceError } = await import("./service");
    await expect(readOrganization("member-session-id", "00000000-0000-4000-8000-000000000099", 0)).rejects.toBeInstanceOf(OrganizationServiceError);
    expect(mocks.rpc).not.toHaveBeenCalledWith("read_organization_team_members", expect.anything());
  });

  it("returns the owner workspace together with the separately scoped team roster", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "list_my_organizations") return { data: [{ organization_id: organizationId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" }], error: null };
      if (name === "read_organization_workspace") return { data: workspace, error: null };
      if (name === "read_organization_team_members") return { data: [{ id: "ignored", membership_id: "00000000-0000-4000-8000-000000000011", member_role: "owner", state: "active", site_id: null, is_self: true, label: "Alice", expires_at: null }], error: null };
      return { data: null, error: null };
    });
    const { readOrganization } = await import("./service");
    const result = await readOrganization("owner-session-id", organizationId, 100);
    expect(result.role).toBe("owner");
    expect(result.members.map((member) => member.label)).toEqual(["Alice"]);
    expect(mocks.rpc).toHaveBeenCalledWith("read_organization_workspace", { p_org: organizationId, p_actor: "owner-session-id", p_offset: 100 });
  });

  it("maps Supabase authorization and conflict errors to safe service statuses", async () => {
    const { listOrganizations, OrganizationServiceError } = await import("./service");
    for (const [code, status] of [["42501", 403], ["23514", 409], ["23503", 409], ["XX000", 503]] as const) {
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { code } });
      await expect(listOrganizations("actor")).rejects.toMatchObject({ status });
    }
    expect(OrganizationServiceError).toBeDefined();
  });

  it("fails closed when roster access is unavailable or the active membership disappears", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "list_my_organizations") return { data: [{ organization_id: organizationId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "member", state: "pending" }], error: null };
      return { data: null, error: { code: "42501" } };
    });
    const { readOrganization, OrganizationServiceError } = await import("./service");
    await expect(readOrganization("member-session-id", organizationId, 0)).rejects.toBeInstanceOf(OrganizationServiceError);
    expect(mocks.rpc).not.toHaveBeenCalledWith("read_organization_team_members", expect.anything());

    mocks.rpc.mockImplementation(async (name: string) => name === "list_my_organizations"
      ? { data: [{ organization_id: organizationId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "member", state: "active" }], error: null }
      : { data: null, error: { code: "42501" } });
    await expect(readOrganization("member-session-id", organizationId, 0)).rejects.toMatchObject({ status: 403 });
  });
});

describe("organization mutation RPC routing", () => {
  const commands = [
    { operation: "accept", membershipId: "00000000-0000-4000-8000-000000000010" },
    { operation: "decline", membershipId: "00000000-0000-4000-8000-000000000010" },
    { operation: "revoke", membershipId: "00000000-0000-4000-8000-000000000010" },
    { operation: "promote_owner", membershipId: "00000000-0000-4000-8000-000000000010" },
    { operation: "transfer_owner", membershipId: "00000000-0000-4000-8000-000000000010" },
    { operation: "leave" },
    { operation: "site", siteId: null, name: "Siège", archive: false },
    { operation: "link_action", actionId: "00000000-0000-4000-8000-000000000030", siteId: null },
    { operation: "campaign", campaignId: null, title: "Campagne", startsOn: "2026-01-01", endsOn: "2026-12-31", targetActions: null, state: "draft" },
    { operation: "campaign_action", campaignId: "00000000-0000-4000-8000-000000000040", actionId: "00000000-0000-4000-8000-000000000030", remove: true },
  ] as const;

  it.each(commands)("routes $operation through its canonical RPC", async (specific) => {
    const { mutateOrganization } = await import("./service");
    await mutateOrganization("owner-session-id", organizationCommandSchema.parse({ organizationId, requestId, ...specific }));
    const rpcName = specific.operation === "leave" ? "leave_organization"
      : specific.operation === "site" ? "mutate_organization_site"
        : specific.operation === "link_action" ? "link_organization_action"
          : specific.operation === "campaign" ? "mutate_organization_campaign"
            : specific.operation === "campaign_action" ? "link_organization_campaign_action"
              : "mutate_organization_membership";
    expect(mocks.rpc).toHaveBeenCalledWith(rpcName, expect.objectContaining({ p_org: organizationId, p_actor: "owner-session-id", p_request: requestId }));
  });

  it("preserves authorization and conflict statuses for mutations", async () => {
    const { mutateOrganization } = await import("./service");
    for (const [code, status] of [["42501", 403], ["23505", 409], ["22023", 409], ["XX000", 503]] as const) {
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { code } });
      await expect(mutateOrganization("owner-session-id", organizationCommandSchema.parse({ organizationId, requestId, operation: "accept", membershipId: "00000000-0000-4000-8000-000000000010" }))).rejects.toMatchObject({ status });
    }
  });
});
