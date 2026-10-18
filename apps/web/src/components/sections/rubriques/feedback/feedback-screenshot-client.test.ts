import { describe, expect, it, vi } from "vitest";

const uploadToSignedUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/media/image-compression", () => ({
  compressImageFile: vi.fn(async (file: File) => file),
  readImageDimensions: vi.fn(async () => ({ width: 1280, height: 720 })),
}));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({ uploadToSignedUrl: uploadToSignedUrlMock }),
    },
  }),
}));

import {
  getSafeFeedbackScreenshotPreviewUrl,
  uploadFeedbackScreenshot,
  validateFeedbackScreenshotFile,
} from "@/lib/community/feedback-screenshot-client";

const feedbackId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";

function pngFile(size = 8) {
  return new File([new Uint8Array(size)], "capture.png", { type: "image/png" });
}

describe("feedback screenshot browser upload contract", () => {
  it("allows only a same-origin blob preview and keeps hostile file names as data", () => {
    vi.stubGlobal("window", { location: { origin: "https://cleanmymap.test" } });

    expect(getSafeFeedbackScreenshotPreviewUrl("blob:https://cleanmymap.test/preview-1")).toBe(
      "blob:https://cleanmymap.test/preview-1",
    );
    expect(getSafeFeedbackScreenshotPreviewUrl("https://attacker.test/preview.png")).toBeNull();
    expect(getSafeFeedbackScreenshotPreviewUrl("javascript:alert(1)")).toBeNull();

    vi.unstubAllGlobals();
  });

  it("rejects videos and files over the canonical limit before network access", () => {
    expect(validateFeedbackScreenshotFile(new File(["video"], "capture.mp4", { type: "video/mp4" }))).toContain(
      "vidéos",
    );
    expect(validateFeedbackScreenshotFile(pngFile(5 * 1024 * 1024 + 1))).toContain("5 Mo");
  });

  it("uploads a valid image through the private intent and finalize endpoints", async () => {
    uploadToSignedUrlMock.mockResolvedValue({ data: {}, error: null });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            intent: {
              feedbackId,
              attemptId,
              bucket: "signalement-evidence",
              path: `feedback/${feedbackId}/screenshot/${attemptId}`,
              token: "signed-upload-token",
              uploadState: "pending",
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadFeedbackScreenshot(feedbackId, pngFile())).resolves.toBeUndefined();
    expect(uploadToSignedUrlMock).toHaveBeenCalledOnce();
    expect(uploadToSignedUrlMock).toHaveBeenCalledWith(
      expect.any(String),
      "signed-upload-token",
      expect.any(File),
      expect.objectContaining({ upsert: false }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/screenshot/intent");
    expect(fetchMock.mock.calls[1][0]).toContain("/screenshot/finalize");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ attemptId });
    vi.unstubAllGlobals();
  });

  it("requests cleanup when direct Storage upload fails", async () => {
    uploadToSignedUrlMock.mockResolvedValue({ error: new Error("storage down") });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            intent: {
              feedbackId,
              attemptId,
              bucket: "signalement-evidence",
              path: `feedback/${feedbackId}/screenshot/${attemptId}`,
              token: "signed-upload-token",
              uploadState: "pending",
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadFeedbackScreenshot(feedbackId, pngFile())).rejects.toThrow(
      "transmission de la capture",
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/community/bug-reports/${feedbackId}/screenshot`,
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ attemptId }),
      }),
    );
    vi.unstubAllGlobals();
  });
});
