import { createRef } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatComposer } from "./chat-composer";
import { handleChatComposerFileSelection } from "./chat-composer-input";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type ButtonProps = { onClick: () => void; disabled?: boolean; children?: React.ReactNode };
type TextareaProps = { onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void; value?: string; disabled?: boolean; placeholder?: string };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

function childrenText(node: ReactTestInstance): string {
  return String(propsOf<{ children?: React.ReactNode }>(node).children ?? "");
}

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  const props: React.ComponentProps<typeof ChatComposer> = {
    activeChannelType: "community",
    composerPlaceholder: "Écrire dans la discussion",
    message: "Brouillon conservé",
    onMessageChange: vi.fn(),
    file: null,
    onFileChange: vi.fn(),
    fileInputRef: createRef<HTMLInputElement>(),
    isSending: false,
    isUploading: false,
    sendError: null,
    selectedRecipient: null,
    showMentions: false,
    mentionSuggestions: [],
    onInsertMention: vi.fn(),
    onSubmit: vi.fn(),
    canSubmit: true,
    userId: "user-1",
    ...overrides,
  };
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<ChatComposer {...props} />);
  });
  return renderer;
}

describe("ChatComposer interactive behavior", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the draft, submits with Enter and exposes the send action by name", async () => {
    const renderer = renderComposer();
    const textarea = renderer.root.findByType("textarea");
    const requestSubmit = vi.fn();
    const preventDefault = vi.fn();

    const textareaProps = propsOf<TextareaProps>(textarea);
    await act(async () => {
      textareaProps.onKeyDown({
        key: "Enter",
        shiftKey: false,
        preventDefault,
        currentTarget: { form: { requestSubmit } },
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
    });

    expect(textareaProps.value).toBe("Brouillon conservé");
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(requestSubmit).toHaveBeenCalledOnce();
    expect(renderer.root.findByProps({ "aria-label": "Envoyer le message" })).toBeTruthy();
    act(() => renderer.unmount());
  });

  it("does not submit while sending, uploading, unauthenticated or without a valid draft", () => {
    for (const scenario of [
      { isSending: true, textareaDisabled: true },
      { isUploading: true, textareaDisabled: true },
      { userId: undefined, textareaDisabled: true },
      { message: "", canSubmit: false, textareaDisabled: false },
      { activeChannelType: "dm" as const, selectedRecipient: null, canSubmit: false, textareaDisabled: true },
    ]) {
      const { textareaDisabled, ...props } = scenario;
      const renderer = renderComposer(props);
      const textarea = renderer.root.findByType("textarea");
      const sendButton = renderer.root.findByProps({ type: "submit" });
      expect(textarea.props.disabled).toBe(textareaDisabled);
      expect(sendButton.props.disabled).toBe(true);
      if (scenario.isSending || scenario.isUploading) {
        expect(sendButton.props.loading).toBe(true);
      }
      act(() => renderer.unmount());
    }
  });

  it("keeps a network error announced while preserving the unsent draft", () => {
    const renderer = renderComposer({ sendError: "Connexion perdue", canSubmit: true });
    const alert = renderer.root.findByProps({ role: "alert" });
    const textarea = renderer.root.findByType("textarea");

    expect(alert.props.children).toBe("Connexion perdue");
    expect(textarea.props.value).toBe("Brouillon conservé");
    act(() => renderer.unmount());
  });

  it("opens the keyboard-reachable tools and changes mode without losing the draft", async () => {
    const onComposerModeChange = vi.fn();
    const renderer = renderComposer({
      showModeTabs: true,
      composerModes: ["message", "poll"],
      onComposerModeChange,
    });
    const toolsButton = renderer.root.findByProps({ "aria-label": "Options d’écriture" });

    await act(async () => { propsOf<ButtonProps>(toolsButton).onClick(); });
    const pollButton = renderer.root.findAll(
      (node) => node.type === "button" && childrenText(node).includes("Sondage"),
    )[0];
    expect(pollButton).toBeTruthy();

    await act(async () => { propsOf<ButtonProps>(pollButton).onClick(); });
    expect(onComposerModeChange).toHaveBeenCalledWith("poll");
    expect(propsOf<TextareaProps>(renderer.root.findByType("textarea")).value).toBe("Brouillon conservé");
    act(() => renderer.unmount());
  });

  it("rejects unsupported or oversized attachments and accepts a supported document", () => {
    const onFileChange = vi.fn();
    const fileInputRef = { current: { click: vi.fn() } } as unknown as React.RefObject<HTMLInputElement>;
    const eventFor = (file: File) => ({ target: { files: [file], value: "selected" } }) as unknown as React.ChangeEvent<HTMLInputElement>;
    const video = new File(["video"], "clip.mp4", { type: "video/mp4" });
    const oversized = new File(["pdf"], "guide.pdf", { type: "application/pdf" });
    Object.defineProperty(oversized, "size", { value: 8 * 1024 * 1024 + 1 });
    const document = new File(["pdf"], "guide.pdf", { type: "application/pdf" });

    handleChatComposerFileSelection({ event: eventFor(video), onFileChange, fileInputRef });
    handleChatComposerFileSelection({ event: eventFor(oversized), onFileChange, fileInputRef });
    handleChatComposerFileSelection({ event: eventFor(document), onFileChange, fileInputRef });

    expect(onFileChange).toHaveBeenNthCalledWith(1, null);
    expect(onFileChange).toHaveBeenNthCalledWith(2, null);
    expect(onFileChange).toHaveBeenNthCalledWith(3, document);
  });

  it("renders attachment removal, mention insertion and poll option limits as real controls", async () => {
    const onFileChange = vi.fn();
    const onInsertMention = vi.fn();
    const onPollOptionsChange = vi.fn();
    const renderer = renderComposer({
      file: new File(["image"], "photo.jpg", { type: "image/jpeg" }),
      showMentions: true,
      mentionSuggestions: [{ id: "user-2", display_name: "Alice", handle: "alice", avatar_url: null }],
      onFileChange,
      onInsertMention,
    });

    const removeAttachment = renderer.root.findAll((node) => node.type === "button" && childrenText(node).includes("Retirer"))[0];
    await act(async () => { propsOf<ButtonProps>(removeAttachment).onClick(); });
    const mention = renderer.root.findAllByType("button").find((node) => node.findAllByType("p").some((paragraph) => paragraph.props.children === "Alice"))!;
    await act(async () => { propsOf<ButtonProps>(mention).onClick(); });
    expect(onFileChange).toHaveBeenCalledWith(null);
    expect(onInsertMention).toHaveBeenCalledWith("alice");

    act(() => renderer.unmount());
    const pollRenderer = renderComposer({
      composerMode: "poll",
      showModeTabs: true,
      pollOptions: ["Oui", "Non"],
      onPollOptionsChange,
      canSubmit: false,
    });
    const addOption = pollRenderer.root.findAll((node) => node.type === "button" && childrenText(node).includes("Ajouter une option"))[0];
    await act(async () => { propsOf<ButtonProps>(addOption).onClick(); });
    expect(onPollOptionsChange).toHaveBeenCalledWith(["Oui", "Non", ""]);
    expect(pollRenderer.root.findByProps({ "aria-label": "Option 1" })).toBeTruthy();
    expect(pollRenderer.root.findByProps({ "aria-label": "Supprimer l'option 1" }).props.disabled).toBe(true);
    act(() => pollRenderer.unmount());
  });

  it("keeps guest controls read-only and does not expose authenticated tools", async () => {
    const renderer = renderComposer({ userId: undefined, canSubmit: true, showMentions: false });
    const toolsButton = renderer.root.findByProps({ "aria-label": "Options d’écriture" });
    await act(async () => { propsOf<ButtonProps>(toolsButton).onClick(); });

    expect(renderer.root.findAllByType("a").some((link) => link.props.children === "Connectez-vous")).toBe(true);
    expect(renderer.root.findAllByProps({ children: "Pièce jointe" })).toHaveLength(0);
    expect(propsOf<TextareaProps>(renderer.root.findByType("textarea")).placeholder).toBe("Connectez-vous pour participer à la discussion");
    act(() => renderer.unmount());
  });
});
