import type { ChangeEvent } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import type { ChatUser } from "../chat-types";
import { useChatState, type UseChatStateModel } from "./use-chat-state";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type StateParams = Parameters<typeof useChatState>[0];

const recipient: ChatUser = {
  id: "peer-1",
  display_name: "Alex",
  handle: "alex_75",
  avatar_url: null,
};

function textChange(value: string, selectionStart = value.length) {
  return {
    target: { value, selectionStart },
  } as unknown as ChangeEvent<HTMLTextAreaElement>;
}

function renderState(overrides: Partial<StateParams> = {}) {
  let state!: UseChatStateModel;
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <Probe params={{ initialChannelType: "community", ...overrides }} onState={(nextState) => { state = nextState; }} />,
    );
  });
  return { renderer, getState: () => state };
}

function Probe({ params, onState }: { params: StateParams; onState: (state: UseChatStateModel) => void }) {
  const state = useChatState(params);
  onState(state);
  return null;
}

describe("useChatState behavior", () => {
  it("hydrates the independent initial channel, recipient, topic, action, message and zone state", () => {
    const { renderer, getState } = renderState({
      initialChannelType: "dm",
      initialArrondissement: 11,
      initialZoneName: "  Paris 3e arrondissement  ",
      initialRecipient: recipient,
      initialTopicId: "relais_associatif",
      initialActionId: "action-1",
      initialMessage: "Brouillon initial",
    });

    expect(getState().activeChannelType).toBe("dm");
    expect(getState().selectedRecipient).toEqual(recipient);
    expect(getState().isRecipientPickerOpen).toBe(true);
    expect(getState().activeTopicId).toBe("relais_associatif");
    expect(getState().selectedActionId).toBe("action-1");
    expect(getState().message).toBe("Brouillon initial");
    expect(getState().selectedZone).toBe("Paris 3e arrondissement");
    expect(getState().isBugReportChannel).toBe(false);
    expect(getState().submitLockRef.current).toBe(false);
    expect(getState().fileInputRef.current).toBeNull();
    expect(getState().scrollRef.current).toBeNull();
    renderer.unmount();
  });

  it.each([
    [1, "1er arrondissement"],
    [11, "11e arrondissement"],
    [null, ""],
  ] as const)("derives the fallback zone label for arrondissement %s", (initialArrondissement, expectedZone) => {
    const { renderer, getState } = renderState({
      initialArrondissement,
      initialZoneName: "   ",
    });
    expect(getState().selectedZone).toBe(expectedZone);
    renderer.unmount();
  });

  it("identifies the bug-report channel and opens the recipient picker only for DMs", () => {
    const { renderer, getState } = renderState({ initialChannelType: "bug_report" });
    expect(getState().isBugReportChannel).toBe(true);
    expect(getState().isRecipientPickerOpen).toBe(false);
    renderer.unmount();
  });

  it("changes channel with a direct setter, clears transient action/error state, and toggles DM selection", () => {
    const { renderer, getState } = renderState({ initialActionId: "action-1" });
    act(() => {
      getState().setSendError("Erreur précédente");
      getState().setActiveChannelType("dm");
    });
    expect(getState().activeChannelType).toBe("dm");
    expect(getState().isRecipientPickerOpen).toBe(true);
    expect(getState().selectedActionId).toBeNull();
    expect(getState().sendError).toBeNull();

    act(() => {
      getState().setSelectedActionId("action-2");
      getState().setSendError("Erreur de l'action");
      getState().setActiveChannelType(() => "action");
    });
    expect(getState().activeChannelType).toBe("action");
    expect(getState().isRecipientPickerOpen).toBe(false);
    expect(getState().selectedActionId).toBe("action-2");
    expect(getState().sendError).toBeNull();

    act(() => {
      getState().setActiveChannelType("community");
    });
    expect(getState().selectedActionId).toBeNull();
    expect(getState().isRecipientPickerOpen).toBe(false);
    renderer.unmount();
  });

  it("keeps unrelated composer state independent while switching channel", () => {
    const { renderer, getState } = renderState();
    const file = {} as File;
    act(() => {
      getState().setViewMode("graph");
      getState().setMessage("Message");
      getState().setIsSending(true);
      getState().setFile(file);
      getState().setIsUploading(true);
      getState().setIsEditingHandle(true);
      getState().setNewHandle("nouveau-handle");
      getState().setRecipientQuery("Alex");
      getState().setSelectedRecipient(recipient);
      getState().setSelectedZone("Paris 11e arrondissement");
      getState().setActiveTopicId("relais_associatif");
      getState().setActiveChannelType("territory");
    });

    expect(getState().viewMode).toBe("graph");
    expect(getState().message).toBe("Message");
    expect(getState().isSending).toBe(true);
    expect(getState().file).toBe(file);
    expect(getState().isUploading).toBe(true);
    expect(getState().isEditingHandle).toBe(true);
    expect(getState().newHandle).toBe("nouveau-handle");
    expect(getState().recipientQuery).toBe("Alex");
    expect(getState().selectedRecipient).toEqual(recipient);
    expect(getState().selectedZone).toBe("Paris 11e arrondissement");
    expect(getState().activeTopicId).toBe("relais_associatif");
    expect(getState().activeChannelType).toBe("territory");
    renderer.unmount();
  });

  it("opens a mention query from the text before the cursor", () => {
    const { renderer, getState } = renderState();
    act(() => {
      getState().handleTextChange(textChange("Bonjour @Al", "Bonjour @Al".length));
    });
    expect(getState().message).toBe("Bonjour @Al");
    expect(getState().showMentions).toBe(true);
    expect(getState().mentionQuery).toBe("Al");
    renderer.unmount();
  });

  it("closes mentions when the cursor is not after a handle-shaped token", () => {
    const { renderer, getState } = renderState();
    act(() => {
      getState().setShowMentions(true);
      getState().setMentionQuery("old");
      getState().handleTextChange(textChange("Bonjour @Al !", "Bonjour @Al !".length));
    });
    expect(getState().showMentions).toBe(false);
    expect(getState().mentionQuery).toBe("");
    expect(getState().message).toBe("Bonjour @Al !");
    renderer.unmount();
  });

  it("inserts a mention at the latest @ and clears its transient query", () => {
    const { renderer, getState } = renderState({ initialMessage: "Bonjour @Al" });
    act(() => {
      getState().handleTextChange(textChange("Bonjour @Al"));
    });
    act(() => {
      getState().insertMention("alice");
    });
    expect(getState().message).toBe("Bonjour @alice ");
    expect(getState().showMentions).toBe(false);
    expect(getState().mentionQuery).toBe("");
    renderer.unmount();
  });

  it("does not mutate the draft or mention state when insertion has no @ anchor", () => {
    const { renderer, getState } = renderState({ initialMessage: "Sans mention" });
    act(() => {
      getState().setShowMentions(true);
      getState().setMentionQuery("old");
      getState().insertMention("alice");
    });
    expect(getState().message).toBe("Sans mention");
    expect(getState().showMentions).toBe(true);
    expect(getState().mentionQuery).toBe("old");
    renderer.unmount();
  });
});
