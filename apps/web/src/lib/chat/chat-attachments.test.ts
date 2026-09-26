import { describe, expect, it } from "vitest";
import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_CAMERA_ACCEPT,
  CHAT_VIDEO_UNSUPPORTED_MESSAGE,
  isSafeChatAttachmentUrl,
  isSupportedChatAttachmentFile,
  isSupportedChatAttachmentMimeType,
  isUnsupportedChatVideoFile,
  isUnsupportedChatVideoMimeType,
} from "./chat-attachments";

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

describe("Chat image capture and video contract", () => {
  it("keeps camera capture image-only and excludes video from attachments", () => {
    expect(CHAT_CAMERA_ACCEPT).toBe("image/*");
    expect(CHAT_ATTACHMENT_ACCEPT).toContain("image/*");
    expect(CHAT_ATTACHMENT_ACCEPT).not.toContain("video/*");
    expect(CHAT_ATTACHMENT_ACCEPT).not.toMatch(/video\//i);
  });

  it("rejects video MIME types and common video extensions explicitly", () => {
    expect(CHAT_VIDEO_UNSUPPORTED_MESSAGE).toBe(
      "Les vidéos ne sont pas prises en charge. Partagez plutôt une photo ou un lien vers la vidéo.",
    );
    expect(isUnsupportedChatVideoMimeType("video/mp4")).toBe(true);
    expect(isUnsupportedChatVideoMimeType("VIDEO/WEBM")).toBe(true);
    expect(isSupportedChatAttachmentMimeType("video/mp4")).toBe(false);
    expect(isUnsupportedChatVideoFile({ name: "clip.mp4", type: "" } as File)).toBe(true);
    expect(isSupportedChatAttachmentFile({ name: "clip.webm", type: "" } as File)).toBe(false);
    expect(isSupportedChatAttachmentFile({ name: "photo.jpg", type: "image/jpeg" } as File)).toBe(true);
  });
});
