import { describe, expect, it } from "vitest";

import { parseChatContentLinks } from "./chat-links";

describe("parseChatContentLinks", () => {
  it("detects multiple http(s) URLs while preserving text, punctuation and newlines", () => {
    const content = "Voir https://example.com/a, puis\nhttp://example.org/(guide).";
    const parts = parseChatContentLinks(content);

    expect(parts).toEqual([
      { type: "text", value: "Voir " },
      { type: "link", value: "https://example.com/a", href: "https://example.com/a" },
      { type: "text", value: ", puis\n" },
      { type: "link", value: "http://example.org/(guide)", href: "http://example.org/(guide)" },
      { type: "text", value: "." },
    ]);
    expect(parts.map((part) => part.value).join("")).toBe(content);
  });

  it("does not turn unsupported protocols or malformed URLs into links", () => {
    const content = "javascript:alert(1) data:text/html,<b>no</b> http://";

    expect(parseChatContentLinks(content)).toEqual([
      { type: "text", value: content },
    ]);
  });

  it("keeps angle-bracketed user content as text around a safe URL", () => {
    const content = "<img src=x onerror=alert(1)> https://example.com";
    const parts = parseChatContentLinks(content);

    expect(parts[0]).toEqual({ type: "text", value: "<img src=x onerror=alert(1)> " });
    expect(parts[1]).toEqual({
      type: "link",
      value: "https://example.com",
      href: "https://example.com",
    });
  });
});
