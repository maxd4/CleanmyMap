"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { Locale } from "../feedback-section.shared";
import type { PersonalFeedbackItem } from "@/lib/community/feedback-history-contract";
import { fetchPersonalFeedbackPage } from "./feedback-history-loader";

export type FeedbackHistoryState = {
  ownerId: string | null;
  items: PersonalFeedbackItem[];
  nextCursor: string | null;
  hasMore: boolean;
  state: "loading" | "ready" | "error";
  errorMessage: string | null;
};

export function createFeedbackHistoryState(
  ownerId: string | null,
  state: FeedbackHistoryState["state"],
): FeedbackHistoryState {
  return { ownerId, items: [], nextCursor: null, hasMore: false, state, errorMessage: null };
}

export function useFeedbackHistory(locale: Locale) {
  const { isLoaded, isSignedIn, user } = useUser();
  const ownerId = isLoaded && isSignedIn ? user?.id ?? null : null;
  const ownerIdRef = useRef<string | null>(ownerId);
  const requestSequenceRef = useRef(0);
  const [history, setHistory] = useState<FeedbackHistoryState>(() =>
    createFeedbackHistoryState(null, "loading"),
  );
  const [loadingMoreOwnerId, setLoadingMoreOwnerId] = useState<string | null>(null);

  const isCurrentRequest = useCallback(
    (requestOwnerId: string, requestSequence: number) =>
      requestSequenceRef.current === requestSequence && ownerIdRef.current === requestOwnerId,
    [],
  );

  const loadPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!ownerId) return;
      const requestOwnerId = ownerId;
      const requestSequence = ++requestSequenceRef.current;
      setLoadingMoreOwnerId(append ? requestOwnerId : null);
      setHistory((current) => append
        ? current.ownerId === requestOwnerId ? { ...current, errorMessage: null } : current
        : createFeedbackHistoryState(requestOwnerId, "loading"));
      try {
        const page = await fetchPersonalFeedbackPage(cursor);
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory((current) => ({
          ownerId: requestOwnerId,
          items: append ? [...current.items, ...page.items] : page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          state: "ready",
          errorMessage: null,
        }));
      } catch {
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory((current) => ({
          ...(current.ownerId === requestOwnerId
            ? current
            : createFeedbackHistoryState(requestOwnerId, append ? "ready" : "error")),
          state: append ? "ready" : "error",
          errorMessage: locale === "fr" ? "Impossible de charger vos retours." : "Unable to load your feedback.",
        }));
      } finally {
        if (isCurrentRequest(requestOwnerId, requestSequence)) setLoadingMoreOwnerId(null);
      }
    },
    [isCurrentRequest, locale, ownerId],
  );

  useEffect(() => {
    ownerIdRef.current = ownerId;
  }, [ownerId]);

  useEffect(() => {
    const requestOwnerId = ownerId;
    const requestSequence = ++requestSequenceRef.current;
    if (!isLoaded || !isSignedIn || !requestOwnerId) {
      return () => {
        if (requestSequenceRef.current === requestSequence) requestSequenceRef.current += 1;
      };
    }
    void fetchPersonalFeedbackPage(null)
      .then((page) => {
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory({ ownerId: requestOwnerId, items: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore, state: "ready", errorMessage: null });
      })
      .catch(() => {
        if (!isCurrentRequest(requestOwnerId, requestSequence)) return;
        setHistory({
          ...createFeedbackHistoryState(requestOwnerId, "error"),
          errorMessage: locale === "fr" ? "Impossible de charger vos retours." : "Unable to load your feedback.",
        });
      });
    return () => {
      if (requestSequenceRef.current === requestSequence) requestSequenceRef.current += 1;
    };
  }, [isCurrentRequest, isLoaded, isSignedIn, locale, ownerId]);

  return {
    isLoaded,
    isSignedIn,
    ownerId,
    visibleHistory: history.ownerId === ownerId ? history : createFeedbackHistoryState(ownerId, "loading"),
    loadingMore: loadingMoreOwnerId === ownerId,
    loadPage,
  };
}
