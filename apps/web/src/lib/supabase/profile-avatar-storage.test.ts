import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareProfileAvatarUrl } from "./profile-avatar-storage";

function createSupabaseMock() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl = vi.fn().mockReturnValue({
    data: { publicUrl: "https://supabase.test/avatar" },
  });
  return {
    client: {
      storage: {
        from: vi.fn(() => ({ upload, getPublicUrl })),
      },
    } as never,
    upload,
    getPublicUrl,
  };
}

describe("profile avatar remote fetch boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not fetch an attacker-controlled host containing the Clerk name", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const supabase = createSupabaseMock();
    const sourceUrl = "https://clerk.attacker.test/avatar.png";

    const result = await prepareProfileAvatarUrl({
      supabase: supabase.client,
      userId: "user-1",
      sourceUrl,
    });

    expect(result).toBe(sourceUrl);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(supabase.upload).not.toHaveBeenCalled();
  });

  it("fetches only the exact trusted Clerk host without following redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(["avatar"]), {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": "6",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const supabase = createSupabaseMock();

    const result = await prepareProfileAvatarUrl({
      supabase: supabase.client,
      userId: "user-1",
      sourceUrl: "https://img.clerk.com/avatar.png",
    });

    expect(result).toBe("https://supabase.test/avatar");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://img.clerk.com/avatar.png",
      expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal) }),
    );
    expect(supabase.upload).toHaveBeenCalledTimes(1);
  });

  it("rejects an oversized remote avatar before Storage upload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": String(5 * 1024 * 1024 + 1),
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const supabase = createSupabaseMock();
    const sourceUrl = "https://img.clerk.com/large.jpg";

    const result = await prepareProfileAvatarUrl({
      supabase: supabase.client,
      userId: "user-1",
      sourceUrl,
    });

    expect(result).toBe(sourceUrl);
    expect(supabase.upload).not.toHaveBeenCalled();
  });

  it("does not re-fetch an already normalized Supabase avatar", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const supabase = createSupabaseMock();
    const existing = "https://supabase.test/storage/v1/object/public/avatars/profiles/user-1/avatar.png";

    await expect(prepareProfileAvatarUrl({
      supabase: supabase.client,
      userId: "user-1",
      sourceUrl: "https://img.clerk.com/new.png",
      existingAvatarUrl: existing,
    })).resolves.toBe(existing);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(supabase.upload).not.toHaveBeenCalled();
  });

  it.each([
    new Response(null, { status: 404 }),
    new Response(new Blob(["not an image"]), { status: 200, headers: { "content-type": "text/plain" } }),
  ])("keeps the source URL when the trusted remote response is unusable", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const supabase = createSupabaseMock();
    const sourceUrl = "https://images.clerk.dev/avatar.webp";
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl })).resolves.toBe(sourceUrl);
    expect(supabase.upload).not.toHaveBeenCalled();
  });

  it("does not claim a normalized URL when Storage upload fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Blob(["avatar"]), {
      status: 200,
      headers: { "content-type": "image/webp" },
    })));
    const supabase = createSupabaseMock();
    supabase.upload.mockResolvedValueOnce({ error: { message: "storage unavailable" } });
    const sourceUrl = "https://img.clerk.com/avatar.webp";
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl })).resolves.toBe(sourceUrl);
  });

  it("falls back to the existing or source URL on network errors without exposing details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private network detail")));
    const supabase = createSupabaseMock();
    await expect(prepareProfileAvatarUrl({
      supabase: supabase.client,
      userId: "user-1",
      sourceUrl: "https://img.clerk.com/avatar.png",
      existingAvatarUrl: "https://fallback.test/avatar.png",
    })).resolves.toBe("https://fallback.test/avatar.png");
  });

  it.each([
    "http://img.clerk.com/avatar.png",
    "https://img.clerk.com:444/avatar.png",
    `https://user${String.fromCharCode(64)}img.clerk.com/avatar.png`,
    "https://img.clerk.com.evil.test/avatar.png",
    "ftp://img.clerk.com/avatar.png",
  ])("does not fetch a non-canonical Clerk URL: %s", async (sourceUrl) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const supabase = createSupabaseMock();
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl })).resolves.toBe(sourceUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps a null or existing value for absent and invalid source URLs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const supabase = createSupabaseMock();
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: null })).resolves.toBeNull();
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: "not a URL", existingAvatarUrl: "https://fallback.test/a" })).resolves.toBe("https://fallback.test/a");
  });

  it("accepts a trusted Clerk response without content-length and maps image MIME extensions", async () => {
    const supabase = createSupabaseMock();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const [mimeType, expectedExtension] of [
      ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"],
      ["image/avif", "avif"], ["image/svg+xml", "svg"], ["image/jpeg", "jpg"],
    ]) {
      fetchMock.mockResolvedValueOnce(new Response(new Blob(["avatar"]), { status: 200, headers: { "content-type": mimeType } }));
      await prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: `https://img.clerk.com/avatar.${expectedExtension}` });
      expect(supabase.upload).toHaveBeenLastCalledWith(
        `profiles/user-1/avatar.${expectedExtension}`,
        expect.any(Blob),
        expect.objectContaining({ contentType: mimeType }),
      );
    }
  });

  it("uses a safe filename fallback and rejects empty or oversized streamed bodies", async () => {
    const supabase = createSupabaseMock();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(new Response(new Blob(["avatar"]), { status: 200, headers: { "content-type": "image/x-custom" } }));
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: "https://img.clerk.com/avatar.unknown" })).resolves.toBe("https://supabase.test/avatar");
    expect(supabase.upload).toHaveBeenLastCalledWith("profiles/user-1/avatar.jpg", expect.any(Blob), expect.any(Object));

    const emptyResponse = { ok: true, body: null, headers: new Headers({ "content-type": "image/png" }), blob: vi.fn().mockResolvedValue(new Blob([])) } as unknown as Response;
    fetchMock.mockResolvedValueOnce(emptyResponse);
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: "https://img.clerk.com/empty.png" })).resolves.toBe("https://img.clerk.com/empty.png");
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array(5 * 1024 * 1024 + 1), { status: 200, headers: { "content-type": "image/png" } }));
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: "https://img.clerk.com/too-large.png" })).resolves.toBe("https://img.clerk.com/too-large.png");
  });

  it("keeps a usable fallback when public URL resolution or upload throws", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["avatar"]), { status: 200, headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", fetchMock);
    const supabase = createSupabaseMock();
    supabase.getPublicUrl.mockImplementationOnce(() => { throw new Error("public URL unavailable"); });
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: "https://img.clerk.com/avatar.png", existingAvatarUrl: "https://fallback.test/a" })).resolves.toBe("https://fallback.test/a");
    supabase.upload.mockImplementationOnce(() => { throw new Error("upload unavailable"); });
    await expect(prepareProfileAvatarUrl({ supabase: supabase.client, userId: "user-1", sourceUrl: "https://img.clerk.com/avatar.png" })).resolves.toBe("https://img.clerk.com/avatar.png");
  });
});
