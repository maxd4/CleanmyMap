import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../chat-types";
import { useChatSubmit } from "./use-chat-submit";
import { AppError } from "@/lib/errors/app-errors";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const notifyNetworkToast = vi.hoisted(() => vi.fn());
vi.mock("@/lib/errors/network-toast", () => ({ notifyNetworkToast }));

type SubmitParams = Parameters<typeof useChatSubmit>[0];
type SubmitResult = ReturnType<typeof useChatSubmit>;

function createParams(
  overrides: Partial<SubmitParams> = {},
): SubmitParams {
  return {
    submitLockRef: { current: false },
    userId: "user-1",
    user: { imageUrl: "https://example.test/avatar.png" } as never,
    senderDisplayName: "Membre test",
    senderHandle: "membre-test",
    message: "Bonjour",
    file: null,
    isSending: false,
    isUploading: false,
    activeChannelType: "community",
    activeActionId: null,
    buddyRequestId: null,
    activeTopicId: null,
    messageKind: "message",
    pollOptions: [],
    relatedEvent: null,
    selectedRecipient: null,
    effectiveZone: "",
    territoryFocus: null,
    setIsSending: vi.fn(),
    setSendError: vi.fn(),
    setIsUploading: vi.fn(),
    supabase: null,
    sendChatMessage: vi.fn(async () => ({}) as ChatMessage),
    feedbackId: null,
    setMessage: vi.fn(),
    setFile: vi.fn(),
    setShowMentions: vi.fn(),
    setPollOptions: vi.fn(),
    ...overrides,
  };
}

function SubmitProbe({
  params,
  onResult,
}: {
  params: SubmitParams;
  onResult: (result: SubmitResult) => void;
}) {
  const result = useChatSubmit(params);
  onResult(result);
  return null;
}

function mountSubmit(params: SubmitParams) {
  let result!: SubmitResult;
  let renderer!: ReactTestRenderer;
  const onResult = (next: SubmitResult) => {
    result = next;
  };

  act(() => {
    renderer = create(
      <SubmitProbe params={params} onResult={onResult} />,
    );
  });

  return {
    renderer,
    get result() {
      return result;
    },
    update(nextParams: SubmitParams) {
      act(() => {
        renderer.update(
          <SubmitProbe params={nextParams} onResult={onResult} />,
        );
      });
    },
  };
}

describe("useChatSubmit behavior", () => {
  it("keeps the submit callback stable for an equivalent render and changes it when an argument changes", () => {
    const initial = createParams();
    const harness = mountSubmit(initial);
    const firstSubmit = harness.result.submitChatMessage;

    harness.update({ ...initial });

    expect(harness.result.submitChatMessage).toBe(firstSubmit);

    harness.update({ ...initial, message: "Message modifié" });

    expect(harness.result.submitChatMessage).not.toBe(firstSubmit);
    harness.renderer.unmount();
  });

  it("sends the trimmed message, releases the lock and resets the composer after success", async () => {
    const params = createParams({ message: "  Bonjour  " });
    const harness = mountSubmit(params);

    await act(async () => {
      await harness.result.submitChatMessage();
    });

    expect(params.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ content: "Bonjour" }),
      }),
    );
    expect(params.setIsSending).toHaveBeenNthCalledWith(1, true);
    expect(params.setIsSending).toHaveBeenLastCalledWith(false);
    expect(params.setMessage).toHaveBeenCalledWith("");
    expect(params.setFile).toHaveBeenCalledWith(null);
    expect(params.setShowMentions).toHaveBeenCalledWith(false);
    expect(params.submitLockRef.current).toBe(false);
    harness.renderer.unmount();
  });

  it("reuses the current callback for a network retry without changing idempotent submission state", async () => {
    const sendChatMessage = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError({ kind: "network", message: "Connexion perdue" }),
      )
      .mockResolvedValueOnce({} as ChatMessage);
    const params = createParams({ sendChatMessage });
    const harness = mountSubmit(params);

    await act(async () => {
      await harness.result.submitChatMessage();
    });

    expect(notifyNetworkToast).toHaveBeenCalledTimes(1);
    const retry = notifyNetworkToast.mock.calls[0]?.[0].onRetry as () => void;

    await act(async () => {
      retry();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    expect(params.setMessage).toHaveBeenCalledTimes(1);
    expect(params.submitLockRef.current).toBe(false);
    harness.renderer.unmount();
  });
});
