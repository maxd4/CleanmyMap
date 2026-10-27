import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => vi.fn());
const serverClient = vi.hoisted(() => vi.fn(() => ({})));
const listMedia = vi.hoisted(() => vi.fn());
const createIntent = vi.hoisted(() => vi.fn());
const finalizeMedia = vi.hoisted(() => vi.fn());

const MediaError = vi.hoisted(() => class extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SignalementMediaError";
  }
});

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: access }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverClient }));
vi.mock("@/lib/actions/signalement/signalement-media", () => ({
  SignalementMediaError: MediaError,
  listSignalementMedia: listMedia,
  createSignalementMediaUploadIntent: createIntent,
  finalizeSignalementMedia: finalizeMedia,
}));

import { GET as list } from "./route";
import { POST as intent } from "./intents/route";
import { POST as finalize } from "./[mediaId]/finalize/route";

const context = { params: Promise.resolve({ signalementId: "signalement-1" }) };
const finalizeContext = { params: Promise.resolve({ signalementId: "signalement-1", mediaId: "media-1" }) };
const makeRequest = (url: string, init?: RequestInit) => new Request(`https://cleanmymap.test${url}`, init);

describe("signalement media HTTP boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.mockResolvedValue({ ok: true, userId: "owner-1" });
    listMedia.mockResolvedValue([{ mediaId: "media-1", uploadState: "ready" }]);
    createIntent.mockResolvedValue({ mediaId: "media-1", uploadState: "pending", token: "upload-token" });
    finalizeMedia.mockResolvedValue({ media: { mediaId: "media-1", uploadState: "ready" }, alreadyReady: false });
  });

  it("rejects anonymous reads and uploads before touching persistence", async () => {
    access.mockResolvedValueOnce({ ok: false });
    expect((await list(makeRequest("/api/signalements/signalement-1/media"), context)).status).toBe(401);
    access.mockResolvedValueOnce({ ok: false });
    expect((await intent(makeRequest("/api/signalements/signalement-1/media/intents", { method: "POST", body: "{}" }), context)).status).toBe(401);
    expect(listMedia).not.toHaveBeenCalled();
    expect(createIntent).not.toHaveBeenCalled();
  });

  it("keeps the authenticated owner in the list and intent service calls", async () => {
    const read = await list(makeRequest("/api/signalements/signalement-1/media"), context);
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual({ status: "ok", items: [{ mediaId: "media-1", uploadState: "ready" }] });
    expect(listMedia).toHaveBeenCalledWith({}, { signalementId: "signalement-1", userId: "owner-1" });

    const upload = await intent(makeRequest("/api/signalements/signalement-1/media/intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalName: "photo.jpg", mimeType: "image/jpeg", sizeBytes: 120, clientUploadId: "client-1" }),
    }), context);
    expect(upload.status).toBe(201);
    expect(createIntent).toHaveBeenCalledWith({}, expect.objectContaining({ userId: "owner-1", signalementId: "signalement-1" }));
  });

  it("rejects malformed upload bodies without creating a partial intent", async () => {
    for (const body of ["not-json", JSON.stringify({}), JSON.stringify({ originalName: "x", mimeType: "text/plain", sizeBytes: 0, clientUploadId: "c" })]) {
      const response = await intent(makeRequest("/api/signalements/signalement-1/media/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }), context);
      expect(response.status).toBe(422);
    }
    expect(createIntent).not.toHaveBeenCalled();
  });

  it.each([
    ["forbidden", 403],
    ["not_found", 404],
    ["limit_reached", 409],
    ["storage_error", 500],
  ] as const)("maps intent service failure %s to HTTP %i", async (code, status) => {
    const message = code === "limit_reached" ? "Ce signalement contient déjà le nombre maximal de preuves photo." : "private storage detail";
    createIntent.mockRejectedValueOnce(new MediaError(message, code));
    const response = await intent(makeRequest("/api/signalements/signalement-1/media/intents", {
      method: "POST",
      body: JSON.stringify({ originalName: "photo.jpg", mimeType: "image/jpeg", sizeBytes: 120, clientUploadId: "client-1" }),
    }), context);
    expect(response.status).toBe(status);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain(code === "limit_reached" ? "database password" : "private storage detail");
  });

  it("finalizes only the server-resolved owner media and maps storage absence", async () => {
    const response = await finalize(makeRequest("/api/signalements/signalement-1/media/media-1/finalize", { method: "POST" }), finalizeContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", alreadyReady: false });
    expect(finalizeMedia).toHaveBeenCalledWith({}, { userId: "owner-1", signalementId: "signalement-1", mediaId: "media-1" });

    finalizeMedia.mockRejectedValueOnce(new MediaError("object absent", "storage_missing"));
    const missing = await finalize(makeRequest("/api/signalements/signalement-1/media/media-1/finalize", { method: "POST" }), finalizeContext);
    expect(missing.status).toBe(422);
    expect(JSON.stringify(await missing.json())).not.toContain("object absent");
  });

  it("returns safe forbidden, missing, and generic responses for reads/finalization", async () => {
    listMedia.mockRejectedValueOnce(new MediaError("other owner", "forbidden"));
    expect((await list(makeRequest("/api/signalements/signalement-1/media"), context)).status).toBe(403);
    listMedia.mockRejectedValueOnce(new MediaError("gone", "not_found"));
    expect((await list(makeRequest("/api/signalements/signalement-1/media"), context)).status).toBe(404);
    finalizeMedia.mockRejectedValueOnce(new Error("database private detail"));
    const response = await finalize(makeRequest("/api/signalements/signalement-1/media/media-1/finalize", { method: "POST" }), finalizeContext);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("database private detail");
  });
});
