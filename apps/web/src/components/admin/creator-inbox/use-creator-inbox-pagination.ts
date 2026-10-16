"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import {
  fetchCreatorInboxPage,
  type CreatorInboxPagePayload,
} from "./creator-inbox-service";

type UseCreatorInboxPaginationParams = {
  initialItems: CreatorInboxItem[];
  initialHasMore: boolean;
  initialNextCursor: string | null;
  onError: (error: unknown) => void;
};

type CreatorInboxPaginationState = {
  items: CreatorInboxItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

type PendingPageRequest = {
  cursor: string;
  generation: number;
};

function serializeInitialPage(params: {
  items: CreatorInboxItem[];
  hasMore: boolean;
  nextCursor: string | null;
}): string {
  return JSON.stringify(params);
}

export function useCreatorInboxPagination({
  initialItems,
  initialHasMore,
  initialNextCursor,
  onError,
}: UseCreatorInboxPaginationParams) {
  const initialPageSignature = serializeInitialPage({
    items: initialItems,
    hasMore: initialHasMore,
    nextCursor: initialNextCursor,
  });
  const [paginationState, setPaginationState] = useState<CreatorInboxPaginationState>(() => ({
    items: initialItems,
    hasMore: initialHasMore,
    nextCursor: initialNextCursor,
  }));
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const initialPageSignatureRef = useRef(initialPageSignature);
  const generationRef = useRef(0);
  const pendingRequestRef = useRef<PendingPageRequest | null>(null);
  const replacementGenerationRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (initialPageSignatureRef.current === initialPageSignature) {
      return;
    }

    initialPageSignatureRef.current = initialPageSignature;
    generationRef.current += 1;
    pendingRequestRef.current = null;
    replacementGenerationRef.current = null;
    setLoadingNextPage(false);
    setPaginationState({
      items: initialItems,
      hasMore: initialHasMore,
      nextCursor: initialNextCursor,
    });
  }, [initialHasMore, initialItems, initialNextCursor, initialPageSignature]);

  function setItems(nextItems: SetStateAction<CreatorInboxItem[]>) {
    setPaginationState((current) => ({
      ...current,
      items:
        typeof nextItems === "function"
          ? nextItems(current.items)
          : nextItems,
    }));
  }

  function beginReplacement(): number {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    pendingRequestRef.current = null;
    replacementGenerationRef.current = generation;
    setLoadingNextPage(false);
    return generation;
  }

  function replacePage(
    page: CreatorInboxPagePayload,
    replacementGeneration?: number,
  ): boolean {
    if (
      replacementGeneration !== undefined &&
      replacementGenerationRef.current !== replacementGeneration
    ) {
      return false;
    }

    generationRef.current += 1;
    pendingRequestRef.current = null;
    replacementGenerationRef.current = null;
    setLoadingNextPage(false);
    setPaginationState({
      items: page.items,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    });
    return true;
  }

  function cancelReplacement(replacementGeneration: number): boolean {
    if (replacementGenerationRef.current !== replacementGeneration) {
      return false;
    }

    generationRef.current += 1;
    pendingRequestRef.current = null;
    replacementGenerationRef.current = null;
    setLoadingNextPage(false);
    return true;
  }

  async function loadNextPage() {
    const current = paginationState;
    if (
      replacementGenerationRef.current !== null ||
      !current.hasMore ||
      !current.nextCursor ||
      pendingRequestRef.current
    ) {
      return;
    }

    const request = {
      cursor: current.nextCursor,
      generation: generationRef.current,
    };
    pendingRequestRef.current = request;
    setLoadingNextPage(true);
    try {
      const page = await fetchCreatorInboxPage({ cursor: request.cursor });
      if (
        pendingRequestRef.current !== request ||
        generationRef.current !== request.generation
      ) {
        return;
      }

      setPaginationState((currentState) => {
        const merged = new Map(
          currentState.items.map((item) => [
            `${item.source}:${item.sourceRecordId}`,
            item,
          ]),
        );
        for (const item of page.items) {
          merged.set(`${item.source}:${item.sourceRecordId}`, item);
        }
        return {
          items: Array.from(merged.values()),
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
        };
      });
    } catch (error) {
      if (
        pendingRequestRef.current === request &&
        generationRef.current === request.generation
      ) {
        onError(error);
      }
    } finally {
      if (pendingRequestRef.current === request) {
        pendingRequestRef.current = null;
        setLoadingNextPage(false);
      }
    }
  }

  return {
    items: paginationState.items,
    loadingNextPage,
    hasMore: paginationState.hasMore,
    nextCursor: paginationState.nextCursor,
    setItems: setItems as Dispatch<SetStateAction<CreatorInboxItem[]>>,
    beginReplacement,
    cancelReplacement,
    replacePage,
    loadNextPage,
  };
}
