import { beforeEach, describe, expect, it, vi } from "vitest";

const compressImageFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/media/image-compression", () => ({
  compressImageFile: compressImageFileMock,
}));

import {
  ChatAttachmentUploadError,
  ChatAttachmentValidationError,
  sendChatMessageWithAttachmentLifecycle,
  uploadChatAttachmentIfNeeded,
  type ChatAttachmentUpload,
} from "./use-chat-submit.helpers";

const attachment = (objectPath: string): ChatAttachmentUpload => ({
  bucketId: "chat-attachments",
  objectPath,
  url: `https://storage.example.test/${objectPath}`,
  type: "image/jpeg",
  size: 128,
});

describe("chat attachment upload/message lifecycle", () => {
  beforeEach(() => {
    compressImageFileMock.mockReset();
  });

  it("uploads a HEIC source only after compression produces an allowlisted MIME", async () => {
    const source = new File(["heic"], "photo.heic", { type: "image/heic" });
    const converted = new File(["jpeg"], "photo.jpg", { type: "image/jpeg" });
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example.test/signed/photo.jpg" },
      error: null,
    });
    const supabase = {
      storage: {
        from: vi.fn(() => ({ upload, createSignedUrl })),
      },
    };
    const setIsUploading = vi.fn();
    compressImageFileMock.mockResolvedValue(converted);

    const result = await uploadChatAttachmentIfNeeded({
      file: source,
      supabase: supabase as never,
      userId: "user-1",
      activeChannelType: "dm",
      setIsUploading,
    });

    expect(compressImageFileMock).toHaveBeenCalledWith(
      source,
      expect.objectContaining({ quality: 0.8 }),
    );
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^dm\/user-1-.+\.jpg$/),
      converted,
      expect.any(Object),
    );
    expect(result?.type).toBe("image/jpeg");
    expect(setIsUploading).toHaveBeenLastCalledWith(false);
  });

  it("rejects an image source left unchanged by compression before Storage", async () => {
    const source = new File(["heic"], "photo.heic", { type: "image/heic" });
    const upload = vi.fn();
    const supabase = {
      storage: {
        from: vi.fn(() => ({ upload })),
      },
    };
    compressImageFileMock.mockResolvedValue(source);

    await expect(
      uploadChatAttachmentIfNeeded({
        file: source,
        supabase: supabase as never,
        userId: "user-1",
        activeChannelType: "dm",
        setIsUploading: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(ChatAttachmentValidationError);

    expect(upload).not.toHaveBeenCalled();
  });

  it("does not compress documents and keeps the existing document upload path", async () => {
    const document = new File(["pdf"], "rapport.pdf", { type: "application/pdf" });
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example.test/signed/rapport.pdf" },
      error: null,
    });
    const supabase = {
      storage: {
        from: vi.fn(() => ({ upload, createSignedUrl })),
      },
    };

    await uploadChatAttachmentIfNeeded({
      file: document,
      supabase: supabase as never,
      userId: "user-1",
      activeChannelType: "dm",
      setIsUploading: vi.fn(),
    });

    expect(compressImageFileMock).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^dm\/user-1-.+\.pdf$/),
      document,
      expect.any(Object),
    );
  });

  it("supprime l'objet si le POST échoue après l'upload", async () => {
    const uploaded = attachment("dm/user-1-first.jpg");
    const sendMessage = vi.fn().mockRejectedValue(new Error("POST failed"));
    const removeAttachment = vi.fn().mockResolvedValue(undefined);

    await expect(
      sendChatMessageWithAttachmentLifecycle({
        uploadAttachment: vi.fn().mockResolvedValue(uploaded),
        sendMessage,
        removeAttachment,
      }),
    ).rejects.toThrow("POST failed");

    expect(sendMessage).toHaveBeenCalledWith(uploaded);
    expect(removeAttachment).toHaveBeenCalledWith(uploaded);
  });

  it("conserve l'objet quand le POST réussit", async () => {
    const uploaded = attachment("dm/user-1-success.jpg");
    const removeAttachment = vi.fn().mockResolvedValue(undefined);

    await expect(
      sendChatMessageWithAttachmentLifecycle({
        uploadAttachment: vi.fn().mockResolvedValue(uploaded),
        sendMessage: vi.fn().mockResolvedValue({ id: "message-1" }),
        removeAttachment,
      }),
    ).resolves.toEqual({ id: "message-1" });

    expect(removeAttachment).not.toHaveBeenCalled();
  });

  it("nettoie le premier objet avant qu'un retry puisse en rattacher un second", async () => {
    const storedObjects = new Set<string>();
    const removedObjects: string[] = [];
    let attempt = 0;
    const finalAttachments: string[] = [];

    const submit = () =>
      sendChatMessageWithAttachmentLifecycle({
        uploadAttachment: async () => {
          const uploaded = attachment(`dm/user-1-attempt-${++attempt}.jpg`);
          storedObjects.add(uploaded.objectPath);
          return uploaded;
        },
        sendMessage: async (uploaded) => {
          if (attempt === 1) throw new Error("temporary POST failure");
          finalAttachments.push(uploaded?.objectPath ?? "");
          return { id: "message-2" };
        },
        removeAttachment: async (uploaded) => {
          storedObjects.delete(uploaded.objectPath);
          removedObjects.push(uploaded.objectPath);
        },
      });

    await expect(submit()).rejects.toThrow("temporary POST failure");
    await expect(submit()).resolves.toEqual({ id: "message-2" });

    expect(removedObjects).toEqual(["dm/user-1-attempt-1.jpg"]);
    expect(finalAttachments).toEqual(["dm/user-1-attempt-2.jpg"]);
    expect([...storedObjects]).toEqual(["dm/user-1-attempt-2.jpg"]);
  });

  it("ne lance aucun POST avec une URL fictive si l'upload échoue", async () => {
    const sendMessage = vi.fn();
    const uploadError = new Error("upload failed");

    await expect(
      sendChatMessageWithAttachmentLifecycle({
        uploadAttachment: vi.fn().mockRejectedValue(uploadError),
        sendMessage,
        removeAttachment: vi.fn(),
      }),
    ).rejects.toMatchObject({
      constructor: ChatAttachmentUploadError,
      cause: uploadError,
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
