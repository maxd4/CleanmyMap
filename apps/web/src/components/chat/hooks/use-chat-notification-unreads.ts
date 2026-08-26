"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatChannelType } from "@/lib/chat/channels";
import {
  createEmptyChatNotificationUnreadCounts,
  normalizeChatNotificationUnreadCounts,
  type ChatNotificationUnreadCounts,
} from "@/lib/chat/chat-notification-unreads";
import type { ChatTopicId } from "@/lib/chat/topics";
import { isChatRealtimeEnabled } from "@/lib/chat/chat-config";

export type ChatNotificationReadScope =
  | {
      channelType: "community" | "territory";
      topicId: ChatTopicId | null;
    }
  | {
      channelType: "dm";
      peerId: string;
    };

type UseChatNotificationUnreadsParams = {
  enabled: boolean;
  currentUserId?: string;
  supabase?: SupabaseClient | null;
};

export function useChatNotificationUnreads({
  enabled,
  currentUserId,
  supabase,
}: UseChatNotificationUnreadsParams) {
  const key = enabled && currentUserId && supabase
    ? ["chat-notification-unreads", currentUserId]
    : null;
  const emptyCounts = useMemo(() => createEmptyChatNotificationUnreadCounts(), []);

  const fetcher = useCallback(async (): Promise<ChatNotificationUnreadCounts> => {
    if (!supabase) {
      return emptyCounts;
    }

    const { data, error } = await supabase.rpc(
      "get_my_unread_chat_notification_counts",
    );
    if (error) {
      throw error;
    }

    return normalizeChatNotificationUnreadCounts(data);
  }, [emptyCounts, supabase]);

  const { data, error, isLoading, mutate } = useSWR<ChatNotificationUnreadCounts>(
    key,
    fetcher,
    {
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      refreshInterval: isChatRealtimeEnabled() ? 180_000 : 600_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const markRead = useCallback(
    async (scope: ChatNotificationReadScope) => {
      if (!supabase) {
        return 0;
      }

      const { data: updatedCount, error: updateError } = await supabase.rpc(
        "mark_my_chat_notifications_read",
        {
          p_channel_type: scope.channelType,
          p_topic_id: scope.channelType === "dm" ? null : scope.topicId,
          p_dm_peer_id: scope.channelType === "dm" ? scope.peerId : null,
        },
      );
      if (updateError) {
        throw updateError;
      }

      await mutate();
      return Number(updatedCount ?? 0) || 0;
    },
    [mutate, supabase],
  );

  return {
    counts: data ?? emptyCounts,
    error,
    isLoading,
    refresh: mutate,
    markRead,
  };
}
