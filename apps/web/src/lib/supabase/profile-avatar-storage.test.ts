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
});
