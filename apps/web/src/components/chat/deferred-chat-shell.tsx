"use client";

import dynamic from "next/dynamic";
import { MessageSquare } from "lucide-react";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import type { ChatShellProps } from "@/components/chat/chat-shell";
import { ChatSurfaceActivityProvider } from "@/components/chat/chat-surface-activity-context";

function ChatDeferredState({ fullHeight }: { fullHeight: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-[3rem] border border-rose-100/70 bg-rose-50/40 ${fullHeight ? "h-full min-h-0" : "h-[750px]"}`} role="status" aria-live="polite">
      <div className="space-y-3 p-6 text-center">
        <MessageSquare size={28} className="mx-auto text-rose-400" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-700">
          La conversation se prépare…
        </p>
        <p className="cmm-text-caption text-slate-500">
          Elle sera disponible dans un instant.
        </p>
      </div>
    </div>
  );
}

const DeferredChatShellComponent = dynamic(
  () => import("@/components/chat/chat-shell").then((module) => module.ChatShell),
  {
    ssr: false,
    loading: () => (
      <ChatDeferredState fullHeight />
    ),
  },
);

export function DeferredChatShell({ surfaceActive = true, ...props }: ChatShellProps & { surfaceActive?: boolean }) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "260px 0px",
  });

  return (
    <div ref={ref} className={props.fullHeight ? "h-full min-h-0" : "min-h-[750px]"}>
      {isInView ? (
        <ChatSurfaceActivityProvider active={surfaceActive}>
          <DeferredChatShellComponent {...props} />
        </ChatSurfaceActivityProvider>
      ) : (
        <ChatDeferredState fullHeight={props.fullHeight ?? false} />
      )}
    </div>
  );
}
