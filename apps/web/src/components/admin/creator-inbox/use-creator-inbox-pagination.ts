"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import {
  fetchCreatorInboxPage,
  type CreatorInboxPagePayload,
} from "./creator-inbox-service";

type UseCreatorInboxPaginationParams = {
  setItems: Dispatch<SetStateAction<CreatorInboxItem[]>>;
  initialHasMore: boolean;
  initialNextCursor: string | null;
  onError: (error: unknown) => void;
};

export function useCreatorInboxPagination({
  setItems,
  initialHasMore,
  initialNextCursor,
  onError,
}: UseCreatorInboxPaginationParams) {
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);

  function replacePage(page: CreatorInboxPagePayload) {
    setItems(page.items);
    setHasMore(page.hasMore);
    setNextCursor(page.nextCursor);
  }

  async function loadNextPage() {
    if (!hasMore || !nextCursor || loadingNextPage) return;
    setLoadingNextPage(true);
    try {
      const page = await fetchCreatorInboxPage({ cursor: nextCursor });
      setItems((current) => {
        const merged = new Map(
          current.map((item) => [`${item.source}:${item.sourceRecordId}`, item]),
        );
        for (const item of page.items) {
          merged.set(`${item.source}:${item.sourceRecordId}`, item);
        }
        return Array.from(merged.values());
      });
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (error) {
      onError(error);
    } finally {
      setLoadingNextPage(false);
    }
  }

  return { loadingNextPage, hasMore, replacePage, loadNextPage };
}
