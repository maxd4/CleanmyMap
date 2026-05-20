import { describe, expect, it } from "vitest";
import { isSafeChatAttachmentUrl } from "./chat-attachments";

describe("isSafeChatAttachmentUrl", () => {
  it("accepts http and https urls", () => {
    expect(isSafeChatAttachmentUrl("https://example.com/file.png")).toBe(true);
    expect(isSafeChatAttachmentUrl("http://example.com/file.png")).toBe(true);
  });

  it("rejects non-web schemes and invalid urls", () => {
    expect(isSafeChatAttachmentUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeChatAttachmentUrl("data:text/html,hi")).toBe(false);
    expect(isSafeChatAttachmentUrl("ftp://example.com/file.png")).toBe(false);
    expect(isSafeChatAttachmentUrl("/relative/path.png")).toBe(false);
    expect(isSafeChatAttachmentUrl("")).toBe(false);
  });
});

