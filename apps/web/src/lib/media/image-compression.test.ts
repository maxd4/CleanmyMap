import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageFile, readBlobAsDataUrl, readImageDimensions } from "./image-compression";

type ImageState = { width: number; height: number; error?: boolean };
const imageState: ImageState = { width: 2400, height: 1200 };
let canvasMode: "ok" | "no-context" | "empty-blob" | "null-blob" = "ok";
let readerMode: "ok" | "error" | "non-string" = "ok";

class FakeImage {
  naturalWidth = imageState.width;
  naturalHeight = imageState.height;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    if (imageState.error) this.onerror?.();
    else this.onload?.();
  }
}

function installBrowserPrimitives() {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:test"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({
      width: 0,
      height: 0,
      getContext: vi.fn(() => canvasMode === "no-context" ? null : { drawImage: vi.fn() }),
      toBlob: (callback: (blob: Blob | null) => void) => {
        if (canvasMode === "null-blob") callback(null);
        else callback(canvasMode === "empty-blob" ? new Blob([]) : new Blob(["compressed"], { type: "image/webp" }));
      },
    })),
  });
  class FakeFileReader {
    result: string | ArrayBuffer | null = readerMode === "non-string" ? new ArrayBuffer(1) : "data:image/jpeg;base64,test";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL() {
      if (readerMode === "error") this.onerror?.();
      else this.onload?.();
    }
  }
  vi.stubGlobal("FileReader", FakeFileReader);
}

describe("image compression boundaries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    imageState.error = false;
    canvasMode = "ok";
    readerMode = "ok";
  });

  it("leaves non-images and files below the configured threshold untouched", async () => {
    const text = new File(["text"], "note.txt", { type: "text/plain" });
    expect(await compressImageFile(text)).toBe(text);
    const image = new File(["small"], "photo.png", { type: "image/png" });
    expect(await compressImageFile(image, { minimumSizeToCompress: image.size })).toBe(image);
  });

  it("compresses a bounded image, keeps its last-modified timestamp and chooses the requested extension", async () => {
    installBrowserPrimitives();
    const image = new File(["large"], "photo.original.png", { type: "image/png", lastModified: 123 });
    const result = await compressImageFile(image, { maxWidth: 1600, maxHeight: 1600, mimeType: "image/webp", quality: 0.7 });
    expect(result).toMatchObject({ name: "photo.original.webp", type: "image/webp", lastModified: 123 });
    expect(result.size).toBeGreaterThan(0);
    await expect(readImageDimensions(image)).resolves.toEqual({ width: 2400, height: 1200 });
  });

  it("fails closed when decoding, canvas creation or blob encoding is unavailable", async () => {
    installBrowserPrimitives();
    const image = new File(["large"], "photo.jpg", { type: "image/jpeg" });
    canvasMode = "no-context";
    expect(await compressImageFile(image)).toBe(image);
    canvasMode = "empty-blob";
    expect(await compressImageFile(image)).toBe(image);
    canvasMode = "null-blob";
    expect(await compressImageFile(image)).toBe(image);
    imageState.error = true;
    expect(await compressImageFile(image)).toBe(image);
    await expect(readImageDimensions(image)).rejects.toThrow("Impossible de lire la photo");
  });

  it("reads data URLs and reports reader failures or non-string results", async () => {
    installBrowserPrimitives();
    const blob = new Blob(["data"], { type: "text/plain" });
    await expect(readBlobAsDataUrl(blob)).resolves.toBe("data:image/jpeg;base64,test");
    readerMode = "non-string";
    await expect(readBlobAsDataUrl(blob)).rejects.toThrow("Photo invalide");
    readerMode = "error";
    await expect(readBlobAsDataUrl(blob)).rejects.toThrow("Impossible de lire la photo");
  });

  it("handles degenerate image dimensions without producing zero-sized canvases", async () => {
    installBrowserPrimitives();
    imageState.width = 0;
    imageState.height = 0;
    const image = new File(["large"], "zero.jpg", { type: "image/jpeg" });
    const result = await compressImageFile(image, { maxWidth: 10, maxHeight: 20 });
    expect(result.name).toBe("zero.jpg");
    imageState.width = 2400;
    imageState.height = 1200;
  });
});
