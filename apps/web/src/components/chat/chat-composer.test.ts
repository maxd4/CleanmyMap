import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./chat-composer.tsx", import.meta.url), "utf8");

describe("ChatComposer progressive disclosure", () => {
  it("keeps the default composer focused on writing and sending", () => {
    expect(source).toContain('aria-label="Options d’écriture"');
    expect(source).toContain("aria-controls=\"chat-composer-options\"");
    expect(source).toContain("<textarea");
    expect(source).toContain('tone={isLight ? "primary" : "important"}');
    expect(source).not.toContain('tone={isLight ? "destructive"');
  });

  it("keeps advanced forms behind the plus menu and removes the permanent DM picker", () => {
    expect(source).toContain("canChooseAnnouncement");
    expect(source).toContain("canChoosePoll");
    expect(source).toContain('selectComposerMode("announcement")');
    expect(source).toContain('selectComposerMode("poll")');
    expect(source).not.toContain("onRecipientQueryChange");
    expect(source).not.toContain("dmSuggestions");
    expect(source).not.toContain("onSelectRecipient");
  });
});
