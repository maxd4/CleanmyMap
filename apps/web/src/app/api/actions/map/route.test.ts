import { beforeEach, describe, expect, it, vi } from"vitest";

const fetchUnifiedActionContractsMock = vi.fn();
const getSupabaseServerClientMock = vi.fn();

vi.mock("@/lib/actions/unified-source", () => ({
 fetchUnifiedActionContracts: fetchUnifiedActionContractsMock,
 parseEntityTypesParam: () => null,
}));

vi.mock("@/lib/supabase/server", () => ({
 getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/insights", () => ({
 buildActionInsights: () => ({}),
}));

vi.mock("@/lib/actions/data-contract", () => ({
 toActionMapItem: (contract: { id: string; status: string }) => ({
 id: contract.id,
 status: contract.status,
 quality_score: 80,
 impact_level:"moyen",
 contract: { metadata: { associationName: null } },
 }),
}));

describe("/api/actions/map GET", () => {
 beforeEach(() => {
 fetchUnifiedActionContractsMock.mockReset();
 getSupabaseServerClientMock.mockReset();
 getSupabaseServerClientMock.mockReturnValue({});
 fetchUnifiedActionContractsMock.mockResolvedValue({
 items: [],
 isTruncated: false,
 sourceHealth: {
 partial: false,
 failedSources: [],
 availableSources: ["actions","spots","local"],
 warnings: [],
 },
 });
 });

 it("uses approved status by default when status is omitted", async () => {
 const { GET } = await import("./route");

 const response = await GET(
 new Request("http://localhost/api/actions/map?days=30&limit=10"),
 );

 expect(response.status).toBe(200);
 expect(fetchUnifiedActionContractsMock).toHaveBeenCalledWith(
 {},
 expect.objectContaining({
 status:"approved",
 }),
 );
 });

 it("supports explicit all status", async () => {
 const { GET } = await import("./route");

 const response = await GET(
 new Request("http://localhost/api/actions/map?status=all"),
 );

 expect(response.status).toBe(200);
 expect(fetchUnifiedActionContractsMock).toHaveBeenCalledWith(
 {},
 expect.objectContaining({
 status: null,
 }),
 );
 });

 it("keeps explicit action status when valid", async () => {
 const { GET } = await import("./route");

 const response = await GET(
 new Request("http://localhost/api/actions/map?status=pending"),
 );

 expect(response.status).toBe(200);
 expect(fetchUnifiedActionContractsMock).toHaveBeenCalledWith(
 {},
 expect.objectContaining({
 status:"pending",
 }),
 );
 });
});
