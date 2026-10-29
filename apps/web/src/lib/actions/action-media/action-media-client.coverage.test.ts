import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadToSignedUrlMock = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const getBrowserClientMock = vi.hoisted(() => vi.fn(() => ({ storage: { from: vi.fn(() => ({ uploadToSignedUrl: uploadToSignedUrlMock })) } })));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: getBrowserClientMock }));

import { createActionMediaReadController, uploadActionMedia } from "./action-media-client";

const asset = (id = "photo-1") => ({ id, name: "photo.jpg", mimeType: "image/jpeg", size: 2, width: 1, height: 1, dataUrl: "data:image/jpeg;base64, aGk=" });
const response = (body: unknown, ok = true): Response => ({ ok, json: vi.fn(async () => body) } as unknown as Response);

describe("action media client boundary", () => {
  beforeEach(() => { vi.restoreAllMocks(); uploadToSignedUrlMock.mockResolvedValue({ error: null }); });

  it("uploads a pending intent, finalizes it and skips an already-ready intent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ intent: { mediaId: "m1", bucket: "action-photos", path: "p", token: "t", uploadState: "pending" } }))
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ intent: { mediaId: "m2", bucket: "action-photos", path: "p2", token: "t2", uploadState: "ready" } }));
    await expect(uploadActionMedia("a/1", [asset("1"), asset("2")])).resolves.toMatchObject({ uploadedCount: 2, failed: [] });
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/a%2F1/media/m1/finalize", expect.objectContaining({ method: "POST" }));
    expect(uploadToSignedUrlMock).toHaveBeenCalledTimes(1);
  });

  it("returns observable failures for malformed, invalid and unavailable uploads", async () => {
    const responses = [
      response({ error: "intent denied" }, false),
      response({}),
      response({ intent: { mediaId: "m", bucket: "wrong", path: "p", token: "t", uploadState: "pending" } }),
      response({ intent: { mediaId: "m", bucket: "action-photos", path: "p", token: "t", uploadState: "pending" } }),
    ];
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => responses.shift() ?? response({}));
    uploadToSignedUrlMock.mockResolvedValueOnce({ error: { message: "upload down" } } as never);
    const result = await uploadActionMedia("a1", [asset("1"), asset("2"), asset("3"), { ...asset("4"), dataUrl: "invalid" }]);
    expect(result.uploadedCount).toBe(0);
    expect(result.failed).toHaveLength(4);
    expect(result.failed.map(({ message }) => message)).toEqual(expect.arrayContaining(["intent denied", "La réponse d'upload est incomplète.", "Le bucket photo retourné est invalide."]));
    expect(result.failed.map(({ message }) => message)).toContain("La limite de 3 photos est dépassée.");
  });

  it("tracks empty, ready, error and retry states in the read controller", async () => {
    const onChange = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ items: [] })).mockResolvedValueOnce(response({ error: "read failed" }, false)).mockResolvedValueOnce(response({ items: [{ id: "m1" }] }));
    const empty = createActionMediaReadController("a1", onChange);
    await empty.load();
    expect(empty.getSnapshot().status).toBe("empty");
    await empty.retry();
    expect(empty.getSnapshot().status).toBe("empty");

    const failing = createActionMediaReadController("a1", onChange);
    await failing.load();
    expect(failing.getSnapshot().status).toBe("error");
    await failing.retry();
    expect(failing.getSnapshot()).toMatchObject({ status: "ready", items: [{ id: "m1" }] });
    expect(onChange).toHaveBeenCalled();
  });
});
