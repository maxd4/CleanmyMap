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
  uploadFeedbackScreenshot,
  validateFeedbackScreenshotFile,
} from "./feedback-screenshot-client";

const feedbackId = "11111111-1111-4111-8111-111111111111";

function pngFile(size = 8) {
  return new File([new Uint8Array(size)], "capture.png", { type: "image/png" });
}

describe("feedback screenshot browser upload contract", () => {
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
              bucket: "signalement-evidence",
              path: `feedback/${feedbackId}/screenshot`,
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
              bucket: "signalement-evidence",
              path: `feedback/${feedbackId}/screenshot`,
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
      expect.objectContaining({ method: "DELETE" }),
    );
    vi.unstubAllGlobals();
  });
});
