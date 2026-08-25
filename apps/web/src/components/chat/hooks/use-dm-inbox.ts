"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isChatRealtimeEnabled } from "@/lib/chat/chat-config";
import { readAppErrorResponse } from "@/lib/errors/app-errors";
import type { DmInboxResponse } from "../chat-types";

type DmInboxParams = {
  enabled: boolean;
  currentUserId?: string;
  supabase?: SupabaseClient | null;
};

const fetchInbox = async (url: string): Promise<DmInboxResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw await readAppErrorResponse(
      response,
      "La boîte de conversations est momentanément indisponible.",
    );
  }
  return (await response.json()) as DmInboxResponse;
};

export function useDmInbox({ enabled, currentUserId, supabase }: DmInboxParams) {
  const key = enabled && currentUserId ? "/api/chat/inbox" : null;
  const realtimeEnabled = isChatRealtimeEnabled();
  const { data, error, isLoading, mutate } = useSWR<DmInboxResponse>(key, fetchInbox, {
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    refreshInterval: realtimeEnabled ? 180_000 : 600_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const refreshInbox = useCallback(() => mutate(), [mutate]);

  useEffect(() => {
    if (!supabase || !enabled || !currentUserId || !realtimeEnabled) {
      return;
    }

    const channel = supabase
      .channel("dm-inbox-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_messages",
        },
        (payload) => {
          const message = payload.new as {
            channel_type?: string;
            sender_id?: string;
            recipient_id?: string | null;
          };
          if (
            message.channel_type === "dm" &&
            (message.sender_id === currentUserId || message.recipient_id === currentUserId)
          ) {
            void refreshInbox();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, enabled, realtimeEnabled, refreshInbox, supabase]);

  const markConversationRead = useCallback(
    async (peerId: string) => {
      const response = await fetch("/api/chat/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId }),
      });
      if (!response.ok) {
        throw await readAppErrorResponse(
          response,
          "Impossible de mettre à jour la lecture de cette conversation.",
        );
      }
      await mutate();
    },
    [mutate],
  );

  return {
    conversations: data?.conversations ?? [],
    error,
    isLoading,
    refreshInbox,
    markConversationRead,
  };
}
