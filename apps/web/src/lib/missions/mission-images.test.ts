import { describe, expect, it, vi } from "vitest";
import { isAbsoluteHttpUrl, resolveMissionActionImageUrl } from "./mission-images";

describe("mission image urls", () => {
  it("keeps absolute urls unchanged", async () => {
    const signer = vi.fn(async () => null);

    await expect(
      resolveMissionActionImageUrl("https://example.test/photo.jpg", signer),
    ).resolves.toBe("https://example.test/photo.jpg");
    expect(signer).not.toHaveBeenCalled();
  });

  it("signs storage paths", async () => {
    const signer = vi.fn(async (path: string) => `https://signed.test/${path}`);

    await expect(resolveMissionActionImageUrl("mission-1/photo.jpg", signer)).resolves.toBe(
      "https://signed.test/mission-1/photo.jpg",
    );
    expect(signer).toHaveBeenCalledWith("mission-1/photo.jpg");
  });

  it("detects absolute http urls", () => {
    expect(isAbsoluteHttpUrl("https://example.test/photo.jpg")).toBe(true);
    expect(isAbsoluteHttpUrl("http://example.test/photo.jpg")).toBe(true);
    expect(isAbsoluteHttpUrl("mission-1/photo.jpg")).toBe(false);
    expect(isAbsoluteHttpUrl(null)).toBe(false);
  });
});
