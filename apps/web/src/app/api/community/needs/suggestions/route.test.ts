import { beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const clientMock = vi.hoisted(() => vi.fn());
const skillsMock = vi.hoisted(() => vi.fn());
const preferenceMock = vi.hoisted(() => vi.fn());
const suggestionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authzMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: clientMock }));
vi.mock("@/lib/community/helper-skills-service", () => ({ listCommunityHelperSkills: skillsMock }));
vi.mock("@/lib/auth/user-territory", () => ({ getCurrentUserTerritoryLocationPreference: preferenceMock }));
vi.mock("@/lib/community/action-needs-suggestions", () => ({ listSuggestedActionNeeds: suggestionsMock }));

import { GET } from "./route";

describe("community need suggestions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authzMock.mockResolvedValue({ ok: true, userId: "helper-user" });
    clientMock.mockReturnValue({});
    skillsMock.mockResolvedValue([{ category: "materiel" }]);
    preferenceMock.mockResolvedValue({ label: "Paris 10e" });
    suggestionsMock.mockResolvedValue([]);
  });

  it("requires authentication", async () => {
    authzMock.mockResolvedValue({ ok: false });
    expect((await GET(new Request("http://localhost/api/community/needs/suggestions"))).status).toBe(401);
    expect(skillsMock).not.toHaveBeenCalled();
  });

  it("forwards private skills, canonical territory preference and bounded limit", async () => {
    const response = await GET(new Request("http://localhost/api/community/needs/suggestions?limit=999"));

    expect(response.status).toBe(200);
    expect(suggestionsMock).toHaveBeenCalledWith(expect.anything(), ["materiel"], "Paris 10e", 50);
  });

  it("returns an empty result without resolving territory or public needs when opt-in is empty", async () => {
    skillsMock.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/community/needs/suggestions"));

    expect(response.status).toBe(200);
    expect((await response.json()).items).toEqual([]);
    expect(preferenceMock).not.toHaveBeenCalled();
    expect(suggestionsMock).not.toHaveBeenCalled();
  });
});
