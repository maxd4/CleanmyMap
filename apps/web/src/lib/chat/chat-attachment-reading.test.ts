import { describe, expect, it, vi } from "vitest";
import { resolveChatAttachmentUrls } from "./chat-attachment-reading";

describe("chat attachment read projection", () => {
  it("signs durable paths in one batch and preserves legacy URLs", async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [
        { path: "dm/user-1-a.pdf", signedUrl: "https://storage.test/a" },
        { path: "dm/user-1-b.png", signedUrl: "https://storage.test/b" },
      ],
      error: null,
    });
    const serviceSupabase = {
      storage: { from: vi.fn(() => ({ createSignedUrls })) },
    } as never;
    const rows = [
      { id: "a", attachment_path: "dm/user-1-a.pdf", attachment_url: null },
      { id: "b", attachment_path: "dm/user-1-b.png", attachment_url: null },
      { id: "legacy", attachment_url: "https://legacy.test/file", attachment_path: null },
    ];

    const result = await resolveChatAttachmentUrls(serviceSupabase, rows);

    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(
      ["dm/user-1-a.pdf", "dm/user-1-b.png"],
      60 * 60,
    );
    expect(result[0]).toMatchObject({ id: "a", attachment_url: "https://storage.test/a" });
    expect(result[1]).toMatchObject({ id: "b", attachment_url: "https://storage.test/b" });
    expect(result[0]).not.toHaveProperty("attachment_path");
    expect(result[2]).toMatchObject({
      id: "legacy",
      attachment_url: "https://legacy.test/file",
    });
    expect(result[2]).not.toHaveProperty("attachment_path");
  });

  it("does not call Storage when a page contains only legacy rows", async () => {
    const createSignedUrls = vi.fn();
    const serviceSupabase = {
      storage: { from: vi.fn(() => ({ createSignedUrls })) },
    } as never;

    const result = await resolveChatAttachmentUrls(serviceSupabase, [
      { id: "legacy", attachment_url: "https://legacy.test/file" },
    ]);

    expect(createSignedUrls).not.toHaveBeenCalled();
    expect(result[0]).toEqual({
      id: "legacy",
      attachment_url: "https://legacy.test/file",
    });
  });
});
