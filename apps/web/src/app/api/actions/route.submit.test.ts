import { beforeEach, describe, expect, it, vi } from"vitest";
import { toContractCreatePayload } from"@/lib/actions/data-contract";
import { createInitialFormState } from"@/components/actions/action-declaration/payload";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const pickTraceableActorNameMock = vi.hoisted(() => vi.fn());
const trackActionCreatedMock = vi.hoisted(() => vi.fn());
const buildPostActionRetentionLoopMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createActionMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
 auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
 getCurrentUserIdentity: getCurrentUserIdentityMock,
 pickTraceableActorName: pickTraceableActorNameMock,
}));

vi.mock("@/lib/gamification/progression", () => ({
 trackActionCreated: trackActionCreatedMock,
 buildPostActionRetentionLoop: buildPostActionRetentionLoopMock,
}));

vi.mock("@/lib/supabase/server", () => ({
 getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/store", () => ({
 createAction: createActionMock,
}));

describe("POST /api/actions", () => {
 beforeEach(() => {
 vi.resetModules();
 getSupabaseServerClientMock.mockReturnValue({});
 createActionMock.mockResolvedValue({ id:"action-test-1" });
 authMock.mockResolvedValue({ userId:"user-test-1" });
 getCurrentUserIdentityMock.mockResolvedValue({
 userId:"user-test-1",
 displayName:"Test User",
 firstName:"Test",
 username:"test@example.org",
 currentLevel: 1,
 actorNameOptions: ["Test User"],
 role:"benevole",
 badges: [],
 });
 pickTraceableActorNameMock.mockReturnValue("Test User");
 trackActionCreatedMock.mockResolvedValue(undefined);
 buildPostActionRetentionLoopMock.mockResolvedValue(null);
 });

 it("creates an action from the dashboard form payload", async () => {
 const { POST } = await import("./route");

 const form = createInitialFormState("Test User");
 form.locationLabel ="Test lieu action";
 form.wasteKg ="2.5";
 form.volunteersCount ="4";
 form.durationMinutes ="45";
 form.notes ="Formulaire bénévole de test";
 form.actionDate ="2026-04-22";

 const payload = toContractCreatePayload({
 actorName:"Test User",
 associationName:"Action spontanee",
 actionDate: form.actionDate,
 locationLabel: form.locationLabel,
 wasteKg: Number(form.wasteKg),
 cigaretteButts: 0,
 volunteersCount: Number(form.volunteersCount),
 durationMinutes: Number(form.durationMinutes),
 notes: form.notes,
 submissionMode:"quick",
 });

 const response = await POST(
 new Request("http://localhost/api/actions", {
 method:"POST",
 body: JSON.stringify(payload),
 }),
 );

 const body = (await response.json()) as { id?: string; error?: string };
 expect(response.status).toBe(201);
 expect(body.id).toBe("action-test-1");
 expect(createActionMock).toHaveBeenCalledTimes(1);
 expect(trackActionCreatedMock).toHaveBeenCalledWith({}, {
 userId:"user-test-1",
 actionId:"action-test-1",
 });
 }, 15000);
});
