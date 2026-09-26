import { Link2 } from "lucide-react";

import { isSafeChatAttachmentUrl } from "@/lib/chat/chat-attachments";

export function getCurrentChatShareLink(href: string | undefined): string | null {
  const normalizedHref = href?.trim() ?? "";
  return isSafeChatAttachmentUrl(normalizedHref) ? normalizedHref : null;
}

function insertCurrentChatShareLink(
  href: string | undefined,
  onInsertLink: ((url: string) => void) | undefined,
): void {
  const url = getCurrentChatShareLink(href);
  if (url) {
    onInsertLink?.(url);
  }
}

function getCurrentWindowHref(): string | undefined {
  return typeof window === "undefined" ? undefined : window.location.href;
}

export function ChatShareLinkAction({
  isLight,
  onClose,
  onInsertLink,
}: {
  isLight: boolean;
  onClose: () => void;
  onInsertLink: ((url: string) => void) | undefined;
}) {
  if (!onInsertLink) {
    return null;
  }

  const handleClick = () => {
    insertCurrentChatShareLink(getCurrentWindowHref(), onInsertLink);
    onClose();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left cmm-text-small font-semibold ${isLight ? "text-slate-700 hover:bg-rose-50" : "text-slate-200 hover:bg-white/5"}`}
    >
      <Link2 size={16} aria-hidden="true" /> Partager un lien
    </button>
  );
}
