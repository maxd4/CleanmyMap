import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as reportTestSetup from "@/app/api/test-route-setup";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getJsonSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const filterJsonActionContractsByScopeMock = vi.hoisted(() => vi.fn());

const createSupabaseMock = (options?: { cacheHit?: boolean }) =>
  reportTestSetup.createReportStorageSupabaseMock("json", options);

function expectJsonRedirectResponse(response: Response) {
  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe(
    "https://supabase.test/storage/v1/object/sign/reports/actions-json/cache.json?token=abc123",
  );
  expect(response.headers.get("Cache-Control")).toBe(
    "private, max-age=300, stale-while-revalidate=86400",
  );
}

vi.mock("@/lib/authz", () => ({ requireAdminAccess: requireAdminAccessMock }));
vi.mock("@/lib/http/auth-responses", () => ({ adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }) }));
vi.mock("@/lib/reports/scope", () => reportTestSetup.createReportScopeModule(filterJsonActionContractsByScopeMock));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getJsonSupabaseServerClientMock }));
vi.mock("@/lib/actions/unified-source", () => reportTestSetup.createReportUnifiedSourceModule(fetchUnifiedActionContractsMock));

describe("GET /api/reports/actions.json", () => {
  beforeEach(() => {
    reportTestSetup.prepareReportTestEnvironment();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getJsonSupabaseServerClientMock.mockReturnValue(createSupabaseMock());
    fetchUnifiedActionContractsMock.mockResolvedValue(reportTestSetup.createReportActionDataset());
    filterJsonActionContractsByScopeMock.mockImplementation((items) => items);
  });

  it("redirects to a cached json asset without rebuilding it", async () => {
    const cachedSupabase = createSupabaseMock({ cacheHit: true });
    getJsonSupabaseServerClientMock.mockReturnValue(cachedSupabase);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/reports/actions.json?limit=1&days=30"),
    );

    expectJsonRedirectResponse(response);
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(cachedSupabase.storage.from).toHaveBeenCalledWith("reports");
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenCalledTimes(1);
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenCalledWith(
      expect.any(String),
      60 * 60 * 24,
      { download: "export_actions_cmm_13-05-2026.json" },
    );
    expect(cachedSupabase.uploadMock).not.toHaveBeenCalled();
  });

  it("uploads a missing json artifact before redirecting to it", async () => {
    const cachedSupabase = createSupabaseMock();
    getJsonSupabaseServerClientMock.mockReturnValue(cachedSupabase);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/reports/actions.json?limit=1&days=30"),
    );

    expectJsonRedirectResponse(response);
    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledTimes(1);
    expect(cachedSupabase.uploadMock).toHaveBeenCalledTimes(1);
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenCalledTimes(2);
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      60 * 60 * 24,
      { download: "export_actions_cmm_13-05-2026.json" },
    );
  });

  it("returns 403 when access is denied", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/reports/actions.json?limit=1"),
    );
    expect(response.status).toBe(403);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
