import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadMock = vi.hoisted(() => vi.fn());
const getPublicUrlMock = vi.hoisted(() => vi.fn());
const compressImageFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}));

vi.mock("@/lib/media/image-compression", () => ({
  compressImageFile: compressImageFileMock,
}));

describe("PhotoUploadService", () => {
  beforeEach(() => {
    uploadMock.mockReset();
    getPublicUrlMock.mockReset();
    compressImageFileMock.mockReset();
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://example.test/photo.jpg" } });
    compressImageFileMock.mockImplementation(async (file: File) => file);
  });

  it("returns a clear hint when the public bucket is missing", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: {
        message: "Bucket not found: action-photos",
        statusCode: 404,
      },
    });

    const { photoUploadService } = await import("./photo-upload");
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

    const result = await photoUploadService.uploadPhoto(file, "action-test-1");

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^action-test-1\/.+\.jpg$/),
      file,
      expect.objectContaining({
        cacheControl: "3600",
        upsert: false,
        metadata: expect.objectContaining({
          businessDomain: "pieces_jointes_photo",
          business_domain: "pieces_jointes_photo",
          sourceTable: "actions",
          businessContext: "action_photo",
          actionId: "action-test-1",
        }),
      }),
    );

    expect(result).toMatchObject({
      url: "",
      path: "",
      error: "Le bucket public Supabase 'action-photos' est manquant. Crée-le et rends-le public pour activer les uploads photo.",
    });
  });
});
