import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const listActionMediaMock = vi.hoisted(() => vi.fn());
const createActionMediaUploadIntentMock = vi.hoisted(() => vi.fn());
const finalizeActionMediaMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const validationErrorResponseMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const forbiddenJsonResponseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({
  requireActionRequestAccess: requireActionRequestAccessMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/action-media/action-media", async () => ({
  ...(await vi.importActual<typeof import("@/lib/actions/action-media/action-media")>(
    "@/lib/actions/action-media/action-media",
  )),
  listActionMedia: listActionMediaMock,
  createActionMediaUploadIntent: createActionMediaUploadIntentMock,
  finalizeActionMedia: finalizeActionMediaMock,
}));

vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: validationErrorResponseMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedJsonResponseMock,
  forbiddenJsonResponse: forbiddenJsonResponseMock,
}));

import { GET as listMedia } from "./route";
import { POST as createUploadIntent } from "./intents/route";
import { POST as finalizeMedia } from "./[mediaId]/finalize/route";
import { ActionMediaError } from "@/lib/actions/action-media/action-media";

const supabase = { from: vi.fn() };
const identity = { userId: "owner-1", role: "benevole", activeRole: "benevole" };
const params = Promise.resolve({ actionId: "action-1" });
const notAdmissibleMessage = "Les photos de bilan ne sont pas admissibles dans l'état actuel de l'action.";

function request(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
  getCurrentUserIdentityMock.mockResolvedValue(identity);
  getSupabaseServerClientMock.mockReturnValue(supabase);
  handleApiErrorMock.mockReturnValue(new Response("internal", { status: 500 }));
  validationErrorResponseMock.mockImplementation((details: unknown) =>
    Response.json({ error: details }, { status: 400 }),
  );
  unauthorizedJsonResponseMock.mockReturnValue(
    Response.json({ error: "Unauthorized" }, { status: 401 }),
  );
  forbiddenJsonResponseMock.mockReturnValue(
    Response.json({ error: "Forbidden" }, { status: 403 }),
  );
});

describe("Action media HTTP boundaries", () => {
  it("refuses an anonymous listing before reading persistence", async () => {
    requireActionRequestAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await listMedia(request("/api/actions/action-1/media"), {
      params,
    });

    expect(response.status).toBe(401);
    expect(listActionMediaMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("returns only the owner-scoped media projection", async () => {
    listActionMediaMock.mockResolvedValueOnce([
      { id: "media-1", uploadState: "ready", signedUrl: "https://signed.test/media-1" },
    ]);

    const response = await listMedia(request("/api/actions/action-1/media"), {
      params,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      items: [{ id: "media-1", uploadState: "ready", signedUrl: "https://signed.test/media-1" }],
    });
    expect(listActionMediaMock).toHaveBeenCalledWith(supabase, {
      actionId: "action-1",
      userId: "owner-1",
      identity,
    });
  });

  it("maps an owner denial without exposing service details", async () => {
    listActionMediaMock.mockRejectedValueOnce(new ActionMediaError("private detail", "forbidden"));

    const response = await listMedia(request("/api/actions/action-1/media"), {
      params,
    });

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("private detail");
  });

  it("maps an inadmissible media listing to a stable conflict without exposing service details", async () => {
    listActionMediaMock.mockRejectedValueOnce(new ActionMediaError("private storage detail", "not_admissible"));

    const response = await listMedia(request("/api/actions/action-1/media"), { params });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ error: notAdmissibleMessage });
    expect(body.error).not.toContain("private storage detail");
  });

  it("rejects malformed upload metadata before creating an intent", async () => {
    const response = await createUploadIntent(
      request("/api/actions/action-1/media/intents", {
        method: "POST",
        body: "not-json",
      }),
      { params },
    );

    expect(response.status).toBe(400);
    expect(createActionMediaUploadIntentMock).not.toHaveBeenCalled();
  });

  it("creates an upload intent with the authenticated owner and immutable client key", async () => {
    createActionMediaUploadIntentMock.mockResolvedValueOnce({
      mediaId: "media-1",
      uploadState: "pending",
      bucket: "action-photos",
      path: "action-1/media-1.jpg",
      token: "signed-upload-token",
    });

    const response = await createUploadIntent(
      request("/api/actions/action-1/media/intents", {
        method: "POST",
        body: JSON.stringify({
          originalName: "bilan.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1234,
          width: 1200,
          height: 800,
          sortOrder: 0,
          clientUploadId: "stable-client-upload-1",
        }),
      }),
      { params },
    );

    expect(response.status).toBe(201);
    expect(createActionMediaUploadIntentMock).toHaveBeenCalledWith(supabase, {
      originalName: "bilan.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1234,
      width: 1200,
      height: 800,
      sortOrder: 0,
      clientUploadId: "stable-client-upload-1",
      userId: "owner-1",
      identity,
      actionId: "action-1",
    });
  });

  it("maps an inadmissible upload intent to a stable conflict without exposing service details", async () => {
    createActionMediaUploadIntentMock.mockRejectedValueOnce(
      new ActionMediaError("private storage detail", "not_admissible"),
    );

    const response = await createUploadIntent(
      request("/api/actions/action-1/media/intents", {
        method: "POST",
        body: JSON.stringify({
          originalName: "bilan.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1234,
          width: 1200,
          height: 800,
          sortOrder: 0,
          clientUploadId: "stable-client-upload-1",
        }),
      }),
      { params },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ error: notAdmissibleMessage, code: "not_admissible" });
    expect(body.error).not.toContain("private storage detail");
  });

  it("maps an inadmissible finalization to a stable conflict without exposing service details", async () => {
    finalizeActionMediaMock.mockRejectedValueOnce(
      new ActionMediaError("private storage detail", "not_admissible"),
    );

    const response = await finalizeMedia(
      request("/api/actions/action-1/media/media-1/finalize", { method: "POST" }),
      { params: Promise.resolve({ actionId: "action-1", mediaId: "media-1" }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ error: notAdmissibleMessage, code: "not_admissible" });
    expect(body.error).not.toContain("private storage detail");
    expect(finalizeActionMediaMock).toHaveBeenCalledWith(supabase, {
      userId: "owner-1",
      identity,
      actionId: "action-1",
      mediaId: "media-1",
    });
  });
});
