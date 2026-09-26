import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  getCurrentChatShareLink,
  selectChatComposerMode,
  toggleChatComposerTools,
} from "./chat-composer";
import { appendChatLinkToMessage } from "./hooks/use-chat-shell-composer";

const source = readFileSync(new URL("./chat-composer.tsx", import.meta.url), "utf8");
const shareLinkActionSource = readFileSync(
  new URL("./ui/chat-share-link-action.tsx", import.meta.url),
  "utf8",
);
const photoCaptureSource = readFileSync(
  new URL("./ui/chat-photo-capture-action.tsx", import.meta.url),
  "utf8",
);

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
    expect(shareLinkActionSource).toContain("Partager un lien");
    expect(source).toContain("onInsertLink");
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

  it("offers native rear-camera capture with an image fallback", () => {
    expect(photoCaptureSource).toContain('aria-label="Prendre une photo"');
    expect(photoCaptureSource).toContain("CHAT_CAMERA_ACCEPT");
    expect(photoCaptureSource).toContain('capture="environment"');
    expect(photoCaptureSource).toContain("cameraInputRef.current?.click()");
    expect(shareLinkActionSource).toContain("<ChatPhotoCaptureAction");
    expect(shareLinkActionSource).toContain("CHAT_ATTACHMENT_ACCEPT");
    expect(shareLinkActionSource).toContain("attachmentInput.dispatchEvent");
    expect(source).toContain("canAttach={canAttach}");
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

  it("inserts the current safe URL without a network request", () => {
    expect(getCurrentChatShareLink("https://cleanmymap.example/chat")).toBe(
      "https://cleanmymap.example/chat",
    );
    expect(getCurrentChatShareLink("javascript:alert(1)")).toBeNull();
    expect(appendChatLinkToMessage("Bonjour", "https://example.com")).toBe(
      "Bonjour\nhttps://example.com",
    );
    expect(appendChatLinkToMessage("", "https://example.com")).toBe(
      "https://example.com",
    );
    expect(appendChatLinkToMessage("Bonjour", "data:text/html,unsafe")).toBe(
      "Bonjour",
    );
  });
});
