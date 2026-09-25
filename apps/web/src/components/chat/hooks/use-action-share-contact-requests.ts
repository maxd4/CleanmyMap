"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { readAppErrorResponse } from "@/lib/errors/app-errors";
import type {
  ActionShareContactRequest,
  ActionShareContactRequestsResponse,
} from "../chat-types";
import { useChatSurfaceActivity } from "../chat-surface-activity-context";

type UseActionShareContactRequestsParams = {
  enabled: boolean;
  currentUserId?: string;
};

async function fetchRequests(url: string): Promise<ActionShareContactRequestsResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw await readAppErrorResponse(response, "Les demandes de partage sont indisponibles.");
  }
  return (await response.json()) as ActionShareContactRequestsResponse;
}

export function useActionShareContactRequests({
  enabled,
  currentUserId,
}: UseActionShareContactRequestsParams) {
  const surfaceActive = useChatSurfaceActivity();
  const key = enabled && surfaceActive && currentUserId ? "/api/chat/contact-requests" : null;
  const { data, error, isLoading, mutate } = useSWR<ActionShareContactRequestsResponse>(
    key,
    fetchRequests,
    {
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const respond = useCallback(
    async (requestId: string, decision: "accept" | "reject" | "ignore") => {
      const response = await fetch("/api/chat/contact-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision }),
      });
      if (!response.ok) {
        throw await readAppErrorResponse(response, "La demande de partage n’a pas pu être traitée.");
      }
      await mutate();
      return response.json();
    },
    [mutate],
  );

  return {
    requests: data?.requests ?? ([] as ActionShareContactRequest[]),
    error,
    isLoading,
    refresh: mutate,
    respond,
  };
}
