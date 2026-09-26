import { describe, expect, it, vi } from "vitest";
import {
  ChatAttachmentUploadError,
  sendChatMessageWithAttachmentLifecycle,
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
