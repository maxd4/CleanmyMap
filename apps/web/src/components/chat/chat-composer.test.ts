import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  selectChatComposerMode,
  toggleChatComposerTools,
} from "./chat-composer";

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

  it("uses a disclosure group of ordinary buttons instead of a composite menu", () => {
    expect(source).toContain('role="group"');
    expect(source).not.toContain('role="menu"');
    expect(source).not.toContain('role="menuitem"');
    expect(source).toContain('aria-expanded={isToolsOpen}');
    expect(source).toContain('aria-controls="chat-composer-options"');
  });

  it("opens the disclosure and closes it after selecting a composer mode", () => {
    let isOpen = false;
    const onComposerModeChange = vi.fn();
    const closeTools = vi.fn(() => {
      isOpen = false;
    });

    isOpen = toggleChatComposerTools(isOpen);
    expect(isOpen).toBe(true);

    selectChatComposerMode("poll", onComposerModeChange, closeTools);

    expect(onComposerModeChange).toHaveBeenCalledWith("poll");
    expect(closeTools).toHaveBeenCalledOnce();
    expect(isOpen).toBe(false);
  });
});
