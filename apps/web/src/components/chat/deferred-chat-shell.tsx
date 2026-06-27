"use client";

import dynamic from "next/dynamic";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import type { ChatShellProps } from "@/components/chat/chat-shell";

const DeferredChatShellComponent = dynamic(
  () => import("@/components/chat/chat-shell").then((module) => module.ChatShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[750px] items-center justify-center rounded-[3rem] border border-white/10 bg-slate-950/30">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-pink-500/20 border-t-pink-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Chargement du chat...
          </p>
        </div>
      </div>
    ),
  },
);

export function DeferredChatShell(props: ChatShellProps) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "260px 0px",
  });

  return (
    <div ref={ref} className="min-h-[750px]">
      {isInView ? (
        <DeferredChatShellComponent {...props} />
      ) : (
        <div className="flex h-[750px] items-center justify-center rounded-[3rem] border border-white/10 bg-slate-950/30">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-2 border-pink-500/20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Le chat se charge à l&apos;approche de la section.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
