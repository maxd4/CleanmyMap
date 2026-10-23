import { describe, expect, it } from "vitest";
import { mediaUploadIntentSchema } from "./media-upload-intent-schema";

describe("media upload intent schema", () => {
  it("accepts bounded metadata shared by action and signalement uploads", () => {
    expect(
      mediaUploadIntentSchema.parse({
        originalName: " preuve.jpg ",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        width: 1200,
        height: 800,
        sortOrder: 1,
        clientUploadId: "client-1",
      }),
    ).toMatchObject({ originalName: "preuve.jpg", clientUploadId: "client-1" });
  });

  it("rejects invalid dimensions and client upload identifiers", () => {
    expect(() =>
      mediaUploadIntentSchema.parse({
        originalName: "preuve.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        width: 10001,
        clientUploadId: " ",
      }),
    ).toThrow();
  });
});
