"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEmptyChatNotificationUnreadCounts,
  normalizeChatNotificationUnreadCounts,
  type ChatNotificationUnreadCounts,
} from "@/lib/chat/chat-notification-unreads";
import type { ChatTopicId } from "@/lib/chat/topics";
import { isChatRealtimeEnabled } from "@/lib/chat/chat-config";
import { useChatSurfaceActivity } from "../chat-surface-activity-context";

export type ChatNotificationReadScope =
  | {
      channelType: "community" | "territory" | "admin_elu";
      topicId: ChatTopicId | null;
      topicIds?: readonly ChatTopicId[] | null;
    }
  | {
      channelType: "dm";
      peerId: string;
    }
  | {
      channelType: "action";
      actionId: string;
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
  const surfaceActive = useChatSurfaceActivity();
  const key = enabled && surfaceActive && currentUserId && supabase
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

      const topicIds =
        scope.channelType === "community" ||
        scope.channelType === "territory" ||
        scope.channelType === "admin_elu"
          ? scope.topicIds?.length
            ? [...new Set(scope.topicIds)]
            : [scope.topicId]
          : [null];
      const updatedCounts = await Promise.all(
        topicIds.map(async (topicId) => {
          const { data: updatedCount, error: updateError } = await supabase.rpc(
            "mark_my_chat_notifications_read",
            {
              p_channel_type: scope.channelType,
              p_topic_id: scope.channelType === "dm" || scope.channelType === "action" ? null : topicId,
              p_dm_peer_id: scope.channelType === "dm" ? scope.peerId : null,
              p_action_id: scope.channelType === "action" ? scope.actionId : null,
            },
          );
          if (updateError) throw updateError;
          return Number(updatedCount ?? 0) || 0;
        }),
      );

      await mutate();
      return updatedCounts.reduce((total, count) => total + count, 0);
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
