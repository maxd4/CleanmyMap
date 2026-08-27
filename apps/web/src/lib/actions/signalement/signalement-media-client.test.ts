import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadToSignedUrlMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/media/image-compression", () => ({
  compressImageFile: vi.fn(async (file: File) => file),
  readImageDimensions: vi.fn(async () => ({ width: 1200, height: 800 })),
}));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    storage: { from: vi.fn(() => ({ uploadToSignedUrl: uploadToSignedUrlMock })) },
  })),
}));

import {
  createSignalementEvidenceUploadItem,
  uploadSignalementEvidence,
} from "./signalement-media-client";

describe("signalement evidence browser upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("reports a failed photo without deleting or rolling back the signalement", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          intent: {
            mediaId: "media-1",
            bucket: "signalement-evidence",
            path: "signalement-1/media-1.jpg",
            token: "token-1",
            uploadState: "pending",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    uploadToSignedUrlMock.mockResolvedValueOnce({ error: new Error("network") });

    const item = createSignalementEvidenceUploadItem(
      new File(["photo"], "preuve.jpg", { type: "image/jpeg" }),
    );
    const result = await uploadSignalementEvidence("signalement-1", [item]);

    expect(result.uploadedCount).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/media/intents");
  });
});
