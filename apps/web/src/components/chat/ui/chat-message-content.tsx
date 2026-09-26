"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils";
import { parseChatContentLinks } from "@/lib/chat/chat-links";

type ChatMessageContentProps = {
  content: string;
  tone: "light" | "dark";
};

export function ChatMessageContent({ content, tone }: ChatMessageContentProps) {
  const isLight = tone === "light";

  return (
    <p className={cn("whitespace-pre-wrap cmm-text-small leading-relaxed mb-3", isLight ? "text-slate-700" : "text-slate-300")}>
      {parseChatContentLinks(content).map((part, index) =>
        part.type === "link" ? (
          <a
            key={`${part.href}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline decoration-current underline-offset-2 break-words",
              isLight ? "text-pink-700 hover:text-pink-900" : "text-pink-300 hover:text-pink-200",
            )}
          >
            {part.value}
          </a>
        ) : (
          <Fragment key={`text-${index}`}>{part.value}</Fragment>
        ),
      )}
    </p>
  );
}
