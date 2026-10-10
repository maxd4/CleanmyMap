import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { appendParticipantId, normalizeParticipantIds, removeParticipantId, type ChatUserOption, type ParticipantPickerProps } from "./action-participant-picker-model";
import { deduplicateUsers, fetchParticipantPage } from "./action-participant-picker-search";

function useOutsideMenuClose(
  menuOpen: boolean,
  pickerRef: RefObject<HTMLElement | null>,
  setMenuOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [menuOpen, pickerRef, setMenuOpen]);
}

function useHydrateSelectedUsers(
  selectedIds: string[],
  knownUsers: Record<string, ChatUserOption>,
  setKnownUsers: Dispatch<SetStateAction<Record<string, ChatUserOption>>>,
  endpoint: string,
  includeCurrentUser: boolean,
) {
  useEffect(() => {
    let active = true;
    const missingIds = selectedIds.filter((userId) => !knownUsers[userId]);
    if (missingIds.length === 0) return () => { active = false; };
    void Promise.all(missingIds.slice(0, 6).map(async (userId) => {
      const page = await fetchParticipantPage(endpoint, userId, 0, undefined, includeCurrentUser).catch(() => null);
      return page?.items.find((candidate) => candidate.id === userId) ?? null;
    })).then((resolved) => {
      if (!active) return;
      const next = Object.fromEntries(resolved.filter((item): item is ChatUserOption => Boolean(item)).map((item) => [item.id, item]));
      if (Object.keys(next).length > 0) setKnownUsers((previous) => ({ ...previous, ...next }));
    });
    return () => { active = false; };
  }, [endpoint, includeCurrentUser, knownUsers, selectedIds, setKnownUsers]);
}

export function useParticipantPickerModel({
  currentUserId,
  value,
  onChange,
  endpoint,
  includeCurrentUser,
  pickerRef,
}: Pick<ParticipantPickerProps, "currentUserId" | "value" | "onChange"> & {
  endpoint: string;
  includeCurrentUser: boolean;
  pickerRef: RefObject<HTMLElement | null>;
}) {
  const searchInputId = useId();
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatUserOption[]>([]);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestMode, setRequestMode] = useState<"initial" | "search" | "more" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [knownUsers, setKnownUsers] = useState<Record<string, ChatUserOption>>({});
  const selectedIds = useMemo(
    () => normalizeParticipantIds(value, currentUserId, includeCurrentUser),
    [currentUserId, includeCurrentUser, value],
  );
  const selectedUsers = useMemo(
    () => selectedIds.map((userId) => knownUsers[userId] ?? { id: userId, handle: null, display_name: null }),
    [knownUsers, selectedIds],
  );

  const loadAccounts = useCallback(async (requestedQuery: string, offset: number, append: boolean) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setRequestMode(append ? "more" : requestedQuery ? "search" : "initial");
    setError(null);
    try {
      const page = await fetchParticipantPage(endpoint, requestedQuery, offset, controller.signal, includeCurrentUser);
      if (requestId !== requestIdRef.current) return;
      setResults((previous) => append ? deduplicateUsers([...previous, ...page.items]) : page.items);
      setKnownUsers((previous) => ({ ...previous, ...Object.fromEntries(page.items.map((item) => [item.id, item])) }));
      setSubmittedQuery(requestedQuery);
      setNextOffset(page.nextOffset);
      setHasMore(page.hasMore);
      setInitialized(true);
    } catch (fetchError) {
      if ((fetchError as { name?: string }).name === "AbortError" || requestId !== requestIdRef.current) return;
      setError(fetchError instanceof Error && fetchError.message ? fetchError.message : "La recherche de membres a échoué.");
      if (!append) {
        setResults([]);
        setSubmittedQuery(requestedQuery);
        setNextOffset(null);
        setHasMore(false);
        setInitialized(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRequestMode(null);
      }
    }
  }, [endpoint, includeCurrentUser]);

  useEffect(() => () => { requestControllerRef.current?.abort(); }, []);
  useOutsideMenuClose(menuOpen, pickerRef, setMenuOpen);
  useHydrateSelectedUsers(selectedIds, knownUsers, setKnownUsers, endpoint, includeCurrentUser);

  function submitSearch() {
    setMenuOpen(true);
    void loadAccounts(query.trim().slice(0, 120), 0, false);
  }

  function openMenu() {
    setMenuOpen(true);
    if (!initialized && !loading) void loadAccounts("", 0, false);
  }

  function loadMore() {
    if (loading || !hasMore || nextOffset === null) return;
    setMenuOpen(true);
    void loadAccounts(submittedQuery, nextOffset, true);
  }

  function addUser(user: ChatUserOption) {
    const selection = appendParticipantId(selectedIds, user.id, currentUserId, includeCurrentUser);
    if (selection.message) {
      setMessage(selection.message);
      return;
    }
    onChange(selection.ids);
    setKnownUsers((previous) => ({ ...previous, [user.id]: user }));
    setMessage(null);
  }

  function removeUser(userId: string) {
    onChange(removeParticipantId(selectedIds, userId));
    setMessage(null);
  }

  return {
    searchInputId, query, setQuery, results, selectedIds, selectedUsers,
    menuOpen, setMenuOpen, loading, requestMode, error, initialized, hasMore, nextOffset,
    showHelp, setShowHelp, message, submitSearch, openMenu, loadMore, addUser, removeUser,
  };
}

export type ParticipantPickerModel = ReturnType<typeof useParticipantPickerModel>;
